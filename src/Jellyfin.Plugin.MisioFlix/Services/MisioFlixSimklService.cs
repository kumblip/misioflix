using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Configuration;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// Isolated Simkl AUTH V2 + per-user offline archive. Only manual edits and
/// confirmed playback milestones write to Simkl; never touches MAL or media files.
/// </summary>
public sealed class MisioFlixSimklService
{
    private const string Api = "https://api.simkl.com";
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromDays(3);
    private sealed class SimklRateLimitException : HttpRequestException
    {
        public TimeSpan Delay { get; }
        public SimklRateLimitException(TimeSpan delay)
            : base("Simkl ograniczył liczbę żądań (HTTP 429).",null,HttpStatusCode.TooManyRequests)
            =>Delay=delay;
    }
    private readonly HttpClient _http;
    private readonly string _folder;
    private readonly MisioFlixSimklLocalStore _local;
    private readonly ConcurrentDictionary<string, DevicePending> _pending = new();
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _authLocks = new();
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _syncLocks = new();
    private readonly ConcurrentDictionary<string, SyncSnapshot> _snapshots = new();
    private sealed record Credential(string ClientId, string AccessToken, string RefreshToken,
        DateTimeOffset ExpiresAt, string Scope);
    private sealed record DevicePending(string ClientId, string DeviceCode, string UserCode,
        DateTimeOffset ExpiresAt, DateTimeOffset NextPoll, int Interval, string Uri, string CodeVerifier);
    private sealed class SyncSnapshot
    {
        public string Activity { get; set; } = "";
        public DateTimeOffset CheckedAt { get; set; }
        public Dictionary<string, SimklEntry> Items { get; } = new(StringComparer.Ordinal);
        public bool HasEpisodeDetails { get; set; }
        public bool IsOffline { get; set; }
    }
    public sealed record SimklConnection(bool Connected, bool CanWrite);
    public sealed record SimklPin(string Code, string Uri, int ExpiresIn, int Interval);
    public sealed record SimklPoll(bool Connected, bool Pending, int RetryAfter);
    public sealed record SimklEntry(string Kind, long Id, string Status, int? Score,
        int? WatchedEpisodes, int? TotalEpisodes, Dictionary<string,string> Ids,
        string? Title, string? Slug, Dictionary<int,List<int>>? WatchedSeasons=null);
    public sealed record SimklItemResponse(bool Connected, bool Matched, SimklEntry? Entry,
        int? SeasonNumber, bool LocalBackup=false);
    public sealed record SimklEdit(string? Status, int? Score, bool ChangeStatus, bool ChangeScore,bool CreateIfMissing=false);
    public sealed record SimklSeasonEdit(bool Watched, IReadOnlyList<int>? EpisodeNumbers);

    public MisioFlixSimklService(HttpClient http, IApplicationPaths paths, MisioFlixSimklLocalStore local)
    {
        _http=http;
        _local=local;
        _folder=Path.Combine(paths.DataPath,"misioflix","simkl");
        Directory.CreateDirectory(_folder);
    }
    private static string ClientId()
    {
        var id=(Plugin.Instance?.Configuration.SimklClientId??"").Trim();
        if (id.Length is < 4 or > 160 || id.Any(ch=>!char.IsLetterOrDigit(ch)&&ch!='-'&&ch!='_'))
            throw new InvalidOperationException("W panelu administracyjnym MisioFlix ustaw Client ID aplikacji Simkl AUTH V2 (TV, devices & command line).");
        return id;
    }
    private string PathFor(string user)
    {
        if (!Guid.TryParse(user,out var id))throw new UnauthorizedAccessException("Nieznany użytkownik Jellyfin");
        return Path.Combine(_folder,id.ToString("N")+".json");
    }
    private SemaphoreSlim AuthLock(string user)=>_authLocks.GetOrAdd(user,_=>new SemaphoreSlim(1,1));
    private SemaphoreSlim SyncLock(string user)=>_syncLocks.GetOrAdd(user,_=>new SemaphoreSlim(1,1));
    public void DropSnapshotCache(string user)=>_snapshots.TryRemove(user,out _);
    private async Task<Credential?> ReadCredential(string user, CancellationToken cancel)
    {
        var path=PathFor(user);
        if (!File.Exists(path))return null;
        try {return JsonSerializer.Deserialize<Credential>(await File.ReadAllTextAsync(path,cancel).ConfigureAwait(false));}
        catch (Exception ex) when (ex is IOException or JsonException) {throw new InvalidOperationException("Nie można odczytać połączenia Simkl. Ponów logowanie.");}
    }
    private async Task SaveCredential(string user, Credential credential, CancellationToken cancel)
    {
        Directory.CreateDirectory(_folder);
        var path=PathFor(user);var tmp=path+"."+Guid.NewGuid().ToString("N")+".tmp";
        try
        {
            await File.WriteAllTextAsync(tmp,JsonSerializer.Serialize(credential),cancel).ConfigureAwait(false);
            if (OperatingSystem.IsLinux() || OperatingSystem.IsMacOS())
            {
                try{File.SetUnixFileMode(tmp,UnixFileMode.UserRead|UnixFileMode.UserWrite);}catch(UnauthorizedAccessException){}
            }
            File.Move(tmp,path,true);
        }
        finally {if(File.Exists(tmp))File.Delete(tmp);}
    }
    private static string Get(JsonElement obj,string name)
    {
        if(obj.ValueKind!=JsonValueKind.Object||!obj.TryGetProperty(name,out var value)||value.ValueKind==JsonValueKind.Null)return "";
        return value.ValueKind==JsonValueKind.String ? value.GetString()??"":value.ToString();
    }
    private static int? Count(JsonElement obj,string name)=>int.TryParse(Get(obj,name),NumberStyles.Integer,
        CultureInfo.InvariantCulture,out var result)&&result>=0?result:null;
    private static long Identifier(JsonElement obj,string name)=>long.TryParse(Get(obj,name),out var id)&&id>0?id:0;
    private async Task<(HttpStatusCode status,JsonDocument doc)> SendAsync(HttpMethod method,string route,
        string? bearer,object? payload,CancellationToken cancel,bool form=false)
    {
        using var request=new HttpRequestMessage(method,Api+route);
        request.Headers.UserAgent.ParseAdd("MisioFlix/0.4.56 (Jellyfin)");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if(!string.IsNullOrWhiteSpace(bearer))request.Headers.Authorization=new AuthenticationHeaderValue("Bearer",bearer);
        if(payload is Dictionary<string,string> pairs && form)
            request.Content=new FormUrlEncodedContent(pairs);
        else if(payload is not null)
            request.Content=new StringContent(JsonSerializer.Serialize(payload),Encoding.UTF8,"application/json");
        using var response=await _http.SendAsync(request,HttpCompletionOption.ResponseHeadersRead,cancel).ConfigureAwait(false);
        if(response.StatusCode==HttpStatusCode.TooManyRequests)
        {
            var header=response.Headers.RetryAfter;
            var delay=header?.Delta??(header?.Date-DateTimeOffset.UtcNow)??TimeSpan.FromMinutes(5);
            if(delay<TimeSpan.FromSeconds(15))delay=TimeSpan.FromSeconds(15);
            if(delay>TimeSpan.FromHours(2))delay=TimeSpan.FromHours(2);
            throw new SimklRateLimitException(delay);
        }
        await using var stream=await response.Content.ReadAsStreamAsync(cancel).ConfigureAwait(false);
        JsonDocument doc;
        try {doc=await JsonDocument.ParseAsync(stream,cancellationToken:cancel).ConfigureAwait(false);}
        catch(JsonException){throw new HttpRequestException($"Simkl zwrócił niepoprawną odpowiedź (HTTP {(int)response.StatusCode}).");}
        return (response.StatusCode,doc);
    }
    private static void EnsureSuccess(HttpStatusCode status,JsonDocument data)
    {
        if((int)status is >=200 and <300)return;
        var code=Get(data.RootElement,"error");
        if(code=="insufficient_scope")throw new InvalidOperationException("Konto Simkl wymaga media:read i media:write. Połącz je ponownie.");
        if(code=="rate_limit_exceeded" || status==(HttpStatusCode)429)
            throw new HttpRequestException("Osiągnięto limit API Simkl. Spróbuj później.");
        if(status==HttpStatusCode.Unauthorized)throw new InvalidOperationException("Połączenie Simkl wygasło. Rozłącz i połącz konto ponownie.");
        throw new HttpRequestException("Simkl odrzucił żądanie (HTTP "+(int)status+", "+code+").");
    }
    public async Task<SimklConnection> ConnectionAsync(string user,CancellationToken cancel)
    {
        var credential=await ReadCredential(user,cancel).ConfigureAwait(false);
        return new SimklConnection(credential is not null,
            credential?.Scope.Split(' ',StringSplitOptions.RemoveEmptyEntries).Contains("media:write")??false);
    }
    public async Task<SimklPin> StartAsync(string user,CancellationToken cancel)
    {
        PathFor(user);
        var clientId=ClientId();
        // AUTH V2 requires PKCE S256 for both browser and device authorization.
        var verifier=Convert.ToBase64String(RandomNumberGenerator.GetBytes(48))
            .TrimEnd('=').Replace('+','-').Replace('/','_');
        var challenge=Convert.ToBase64String(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)))
            .TrimEnd('=').Replace('+','-').Replace('/','_');
        var input=new Dictionary<string,string>{{"client_id",clientId},{"scope","media:read media:write"},
            {"code_challenge",challenge},{"code_challenge_method","S256"}};
        var(status,doc)=await SendAsync(HttpMethod.Post,"/oauth2/device",null,input,cancel,true).ConfigureAwait(false);
        using(doc)
        {
            EnsureSuccess(status,doc);
            var value=doc.RootElement;
            var device=Get(value,"device_code");var code=Get(value,"user_code");
            var uri=Get(value,"verification_uri");
            var ttl=Count(value,"expires_in")??900;var interval=Math.Max(5,Count(value,"interval")??5);
            if(device.Length<8||code.Length<4||ttl<30||ttl>3600||
                !Uri.TryCreate(uri,UriKind.Absolute,out var parsed)||parsed.Scheme!="https"||parsed.Host!="simkl.com")
                throw new InvalidOperationException("Simkl zwrócił nieprawidłowy kod logowania.");
            _pending[user]=new DevicePending(clientId,device,code,DateTimeOffset.UtcNow.AddSeconds(ttl),
                DateTimeOffset.UtcNow.AddSeconds(interval),interval,uri,verifier);
            return new SimklPin(code,uri,ttl,interval);
        }
    }
    public async Task<SimklPoll> PollAsync(string user,CancellationToken cancel)
    {
        PathFor(user);
        if(!_pending.TryGetValue(user,out var pending))throw new InvalidOperationException("Najpierw wybierz Połącz Simkl.");
        var now=DateTimeOffset.UtcNow;
        if(now>=pending.ExpiresAt){_pending.TryRemove(user,out _);throw new InvalidOperationException("Kod Simkl wygasł. Rozpocznij logowanie ponownie.");}
        if(now<pending.NextPoll)return new SimklPoll(false,true,(int)Math.Ceiling((pending.NextPoll-now).TotalSeconds));
        // Claim the poll interval before network I/O: simultaneous browsers cannot poll too fast.
        _pending[user]=pending with { NextPoll=now.AddSeconds(pending.Interval) };
        var input=new Dictionary<string,string> {
            {"grant_type","urn:ietf:params:oauth:grant-type:device_code"},
            {"device_code",pending.DeviceCode},{"client_id",pending.ClientId},
            {"code_verifier",pending.CodeVerifier}
        };
        var(status,doc)=await SendAsync(HttpMethod.Post,"/oauth2/token",null,input,cancel,true).ConfigureAwait(false);
        using(doc)
        {
            var error=Get(doc.RootElement,"error");
            if(error=="authorization_pending")return new SimklPoll(false,true,pending.Interval);
            if(error=="slow_down"){
                var delay=pending.Interval+5;
                _pending[user]=pending with {NextPoll=DateTimeOffset.UtcNow.AddSeconds(delay),Interval=delay};
                return new SimklPoll(false,true,delay);
            }
            if(error is "expired_token" or "access_denied"){
                _pending.TryRemove(user,out _);throw new InvalidOperationException("Logowanie Simkl nie zostało zatwierdzone. Rozpocznij je ponownie.");
            }
            EnsureSuccess(status,doc);
            var credential=ParseCredential(doc.RootElement,pending.ClientId);
            if(!credential.Scope.Split(' ',StringSplitOptions.RemoveEmptyEntries).Contains("media:write"))
                throw new InvalidOperationException("Simkl nie przyznał uprawnień do ręcznej edycji. Sprawdź aplikację AUTH V2.");
            await AuthLock(user).WaitAsync(cancel).ConfigureAwait(false);
            try{await SaveCredential(user,credential,cancel).ConfigureAwait(false);}finally{AuthLock(user).Release();}
            _pending.TryRemove(user,out _);_snapshots.TryRemove(user,out _);
            return new SimklPoll(true,false,0);
        }
    }
    private static Credential ParseCredential(JsonElement root,string clientId)
    {
        var token=Get(root,"access_token");var refresh=Get(root,"refresh_token");
        var expires=Count(root,"expires_in")??0;
        if(token.Length<12||refresh.Length<12||expires<60)
            throw new InvalidOperationException("Simkl nie przesłał pełnego zestawu tokenów AUTH V2.");
        return new Credential(clientId,token,refresh,DateTimeOffset.UtcNow.AddSeconds(expires),Get(root,"scope"));
    }
    private async Task<Credential> ValidCredentialAsync(string user,CancellationToken cancel)
    {
        await AuthLock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var credential=await ReadCredential(user,cancel).ConfigureAwait(false)
                ??throw new InvalidOperationException("Połącz własne konto Simkl na stronie głównej.");
            if(credential.ExpiresAt>DateTimeOffset.UtcNow.AddMinutes(5))return credential;
            if(!string.Equals(ClientId(),credential.ClientId,StringComparison.Ordinal))
                throw new InvalidOperationException("Zmieniono Client ID Simkl — ponownie połącz konto.");
            var input=new Dictionary<string,string>{{"grant_type","refresh_token"},
                {"refresh_token",credential.RefreshToken},{"client_id",credential.ClientId}};
            var(status,doc)=await SendAsync(HttpMethod.Post,"/oauth2/token",null,input,cancel,true).ConfigureAwait(false);
            using(doc)
            {
                EnsureSuccess(status,doc);
                var updated=ParseCredential(doc.RootElement,credential.ClientId);
                await SaveCredential(user,updated,cancel).ConfigureAwait(false);
                return updated;
            }
        }
        finally {AuthLock(user).Release();}
    }
    public async Task DisconnectAsync(string user,CancellationToken cancel)
    {
        await AuthLock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var credential=await ReadCredential(user,cancel).ConfigureAwait(false);
            if(credential is not null)
            {
                // Best effort provider-side revoke. Local disconnect never depends on network.
                try
                {
                    var payload=new Dictionary<string,string>{{"client_id",credential.ClientId},{"token",credential.AccessToken}};
                    var(_,doc)=await SendAsync(HttpMethod.Post,"/oauth2/revoke",null,payload,cancel,true).ConfigureAwait(false);
                    doc.Dispose();
                }
                catch(Exception ex) when (ex is HttpRequestException or InvalidOperationException or TaskCanceledException){}
                File.Delete(PathFor(user));
            }
            _pending.TryRemove(user,out _);_snapshots.TryRemove(user,out _);
        }
        finally {AuthLock(user).Release();}
    }
    private async Task<JsonDocument> ApiAsync(string user,HttpMethod method,string route,object? payload,CancellationToken cancel)
    {
        var credential=await ValidCredentialAsync(user,cancel).ConfigureAwait(false);
        // All API calls are scoped to the authenticated user token; no direct browser requests to Simkl.
        var sep=route.Contains('?')?"&":"?";
        var full=route+sep+"client_id="+Uri.EscapeDataString(credential.ClientId)+
            "&app-name=misioflix&app-version=0.4.56";
        var(status,doc)=await SendAsync(method,full,credential.AccessToken,payload,cancel).ConfigureAwait(false);
        try{EnsureSuccess(status,doc);return doc;}catch{doc.Dispose();throw;}
    }
    private static Dictionary<int,List<int>> ParseWatchedSeasons(JsonElement row)
    {
        var map=new Dictionary<int,List<int>>();
        if(!row.TryGetProperty("seasons",out var seasons)||seasons.ValueKind!=JsonValueKind.Array)return map;
        foreach(var season in seasons.EnumerateArray())
        {
            var number=Count(season,"number");
            if(!number.HasValue||number.Value<0||number.Value>500)continue;
            var watched=new List<int>();
            if(season.TryGetProperty("episodes",out var episodes)&&episodes.ValueKind==JsonValueKind.Array)
                foreach(var episode in episodes.EnumerateArray())
                {
                    var episodeNumber=Count(episode,"number");
                    if(episodeNumber is >0 and <10000 && !watched.Contains(episodeNumber.Value))
                        watched.Add(episodeNumber.Value);
                }
            watched.Sort();map[number.Value]=watched;
        }
        return map;
    }
    private static void MergeRows(SyncSnapshot state,JsonElement doc,bool withEpisodes=false)
    {
        foreach(var kind in new[]{"shows","movies"})
        {
            if(doc.ValueKind!=JsonValueKind.Object||!doc.TryGetProperty(kind,out var rows)||rows.ValueKind!=JsonValueKind.Array)continue;
            foreach(var row in rows.EnumerateArray())
            {
                var media=row.TryGetProperty(kind=="shows"?"show":"movie",out var value)?value:default;
                var ids=media.ValueKind==JsonValueKind.Object && media.TryGetProperty("ids",out var identifiers)?identifiers:default;
                var id=Identifier(ids,"simkl");if(id==0)continue;
                var ext=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
                foreach(var idField in new[]{"tmdb","imdb","tvdb"}){
                    var entry=Get(ids,idField);if(!string.IsNullOrWhiteSpace(entry))ext[idField]=entry;
                }
                var score=Count(row,"user_rating");
                var key=kind+":"+id.ToString(CultureInfo.InvariantCulture);
                state.Items.TryGetValue(key,out var oldEntry);
                var seasonHistory=kind=="shows" && withEpisodes
                    ? ParseWatchedSeasons(row) : oldEntry?.WatchedSeasons;
                var entryValue=new SimklEntry(kind,id,Get(row,"status"),score,
                    kind=="shows"?Count(row,"watched_episodes_count"):null,
                    kind=="shows"?Count(row,"total_episodes_count"):null,
                    ext,Get(media,"title"),Get(ids,"slug"),seasonHistory);
                // A title added while offline initially has a synthetic local: key.
                // Once Simkl supplies its real ID, discard the placeholder to avoid
                // ambiguous matches and duplicate backup entries.
                foreach(var localKey in state.Items.Keys.Where(k=>k.StartsWith("local:",StringComparison.Ordinal)&&
                    state.Items[k].Kind==kind&&ext.Any(pair=>state.Items[k].Ids.TryGetValue(pair.Key,out var oldId)&&
                        string.Equals(oldId,pair.Value,StringComparison.OrdinalIgnoreCase))).ToArray())
                    state.Items.Remove(localKey);
                state.Items[key]=entryValue;
            }
        }
    }
    private static SyncSnapshot FromArchive(MisioFlixSimklLocalStore.SnapshotData saved)
    {
        var state=new SyncSnapshot {Activity=saved.Activity,CheckedAt=saved.CheckedAt,HasEpisodeDetails=saved.HasEpisodeDetails};
        foreach(var pair in saved.Items)state.Items[pair.Key]=pair.Value;
        return state;
    }
    private static MisioFlixSimklLocalStore.SnapshotData ToArchive(SyncSnapshot state)=>new()
    {
        Activity=state.Activity,CheckedAt=state.CheckedAt,HasEpisodeDetails=state.HasEpisodeDetails,
        Items=new Dictionary<string,SimklEntry>(state.Items,StringComparer.Ordinal)
    };
    private async Task<SyncSnapshot> LoadSnapshotAsync(string user,bool refresh,CancellationToken cancel,bool needEpisodes=false)
    {
        if(_snapshots.TryGetValue(user,out var cache)&&!refresh&&
            (!needEpisodes||cache.HasEpisodeDetails)&&cache.CheckedAt>DateTimeOffset.UtcNow-CacheLifetime)
            return cache;
        await SyncLock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            if(!_snapshots.TryGetValue(user,out cache))
            {
                var stored=await _local.ReadAsync(user,cancel).ConfigureAwait(false);
                if(stored.Snapshot is not null)cache=FromArchive(stored.Snapshot);
                if(cache is not null)_snapshots[user]=cache;
            }
            if(cache is not null&&!refresh&&(!needEpisodes||cache.HasEpisodeDetails)&&
                cache.CheckedAt>DateTimeOffset.UtcNow-CacheLifetime)return cache;
            if(cache is not null&&_retryAt.TryGetValue(user,out var retryUntil)&&retryUntil>DateTimeOffset.UtcNow)
            {cache.IsOffline=true;return cache;}
            try
            {
                using var activities=await ApiAsync(user,HttpMethod.Get,"/sync/activities",null,cancel).ConfigureAwait(false);
                var nowActivity=Get(activities.RootElement,"all");
                if(string.IsNullOrWhiteSpace(nowActivity))throw new HttpRequestException("Simkl nie zwrócił znacznika zmian list.");
                if(cache is not null&&cache.Activity==nowActivity)
                {
                    if(needEpisodes&&!cache.HasEpisodeDetails)
                    {
                        using var baseline=await ApiAsync(user,HttpMethod.Get,
                            "/sync/all-items/shows?extended=full&include_all_episodes=yes",null,cancel).ConfigureAwait(false);
                        MergeRows(cache,baseline.RootElement,true);
                        cache.HasEpisodeDetails=true;
                    }
                    cache.IsOffline=false;cache.CheckedAt=DateTimeOffset.UtcNow;
                    await _local.SaveSnapshotAsync(user,ToArchive(cache),cancel).ConfigureAwait(false);
                    var refreshedArchive=(await _local.ReadAsync(user,cancel).ConfigureAwait(false)).Snapshot;
                    if(refreshedArchive is not null)cache=FromArchive(refreshedArchive); // includes pending offline watches
                    _snapshots[user]=cache;
                    return cache;
                }
                // A complete first baseline is saved on disk, including episode history.
                // Subsequent requests do not need to pull a full watchlist every visit.
                var result=new SyncSnapshot {HasEpisodeDetails=true};
                if(cache is null)
                {
                    using var shows=await ApiAsync(user,HttpMethod.Get,
                        "/sync/all-items/shows?extended=full&include_all_episodes=yes",null,cancel).ConfigureAwait(false);
                    MergeRows(result,shows.RootElement,true);
                    using var movies=await ApiAsync(user,HttpMethod.Get,"/sync/all-items/movies",null,cancel).ConfigureAwait(false);
                    MergeRows(result,movies.RootElement);
                }
                else
                {
                    foreach(var pair in cache.Items)result.Items[pair.Key]=pair.Value;
                    using var delta=await ApiAsync(user,HttpMethod.Get,"/sync/all-items?date_from="+
                        Uri.EscapeDataString(cache.Activity)+"&extended=full&include_all_episodes=yes",null,cancel).ConfigureAwait(false);
                    MergeRows(result,delta.RootElement,true);
                    if(!cache.HasEpisodeDetails)
                    {
                        using var baseline=await ApiAsync(user,HttpMethod.Get,
                            "/sync/all-items/shows?extended=full&include_all_episodes=yes",null,cancel).ConfigureAwait(false);
                        MergeRows(result,baseline.RootElement,true);
                    }
                    using var ratings=await ApiAsync(user,HttpMethod.Get,"/sync/ratings?date_from="+
                        Uri.EscapeDataString(cache.Activity),null,cancel).ConfigureAwait(false);
                    MergeRatingRows(result,ratings.RootElement);
                    // Reconcile removed entries; deltas never include deletions.
                    foreach(var kind in new[]{"shows","movies"})
                    {
                        using var listing=await ApiAsync(user,HttpMethod.Get,"/sync/all-items/"+kind+
                            "?extended=simkl_ids_only",null,cancel).ConfigureAwait(false);
                        var active=new HashSet<long>();
                        if(listing.RootElement.TryGetProperty(kind,out var rows)&&rows.ValueKind==JsonValueKind.Array)
                            foreach(var row in rows.EnumerateArray())
                            {
                                var media=row.TryGetProperty(kind=="shows"?"show":"movie",out var m)?m:default;
                                var ids=media.ValueKind==JsonValueKind.Object&&media.TryGetProperty("ids",out var i)?i:default;
                                var id=Identifier(ids,"simkl");if(id>0)active.Add(id);
                            }
                        foreach(var key in result.Items.Keys.Where(k=>k.StartsWith(kind+":",StringComparison.Ordinal)).ToArray())
                            if(long.TryParse(key.AsSpan(kind.Length+1),out var id)&&!active.Contains(id))result.Items.Remove(key);
                    }
                }
                result.Activity=nowActivity;result.CheckedAt=DateTimeOffset.UtcNow;
                await _local.SaveSnapshotAsync(user,ToArchive(result),cancel).ConfigureAwait(false);
                var persisted=(await _local.ReadAsync(user,cancel).ConfigureAwait(false)).Snapshot;
                if(persisted is not null)result=FromArchive(persisted); // preserve pending playback overlays
                _snapshots[user]=result;
                return result;
            }
            catch(Exception ex) when (ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
            {
                // Fail open to the *last completed* archive, never overwrite it with partial remote data.
                if(cache is null)throw;
                _retryAt[user]=DateTimeOffset.UtcNow.AddMinutes(5);
                cache.IsOffline=true;_snapshots[user]=cache;
                return cache;
            }
        }
        finally{SyncLock(user).Release();}
    }
    private static void MergeRatingRows(SyncSnapshot state,JsonElement doc)
    {
        foreach(var kind in new[]{"shows","movies"})
        {
            if(doc.ValueKind!=JsonValueKind.Object||!doc.TryGetProperty(kind,out var rows)||rows.ValueKind!=JsonValueKind.Array)continue;
            foreach(var row in rows.EnumerateArray())
            {
                var media=row.TryGetProperty(kind=="shows"?"show":"movie",out var m)?m:default;
                var ids=media.ValueKind==JsonValueKind.Object&&media.TryGetProperty("ids",out var i)?i:default;
                var id=Identifier(ids,"simkl");var key=kind+":"+id;
                if(id>0&&state.Items.TryGetValue(key,out var previous))
                    state.Items[key]=previous with {Score=Count(row,"user_rating")};
            }
        }
    }
    private static SimklEntry? Match(SyncSnapshot snapshot,SimklMediaTarget target)
    {
        SimklEntry? selected=null;
        foreach(var entry in snapshot.Items.Values.Where(e=>e.Kind==target.Kind))
        {
            if(!target.Ids.Any(pair=>entry.Ids.TryGetValue(pair.Key,out var other)&&
                string.Equals(other,pair.Value,StringComparison.OrdinalIgnoreCase)))continue;
            if(selected is not null&&selected.Id!=entry.Id)
                throw new InvalidOperationException("Dane TMDB/IMDb/TVDB wskazują na więcej niż jeden tytuł Simkl. Popraw identyfikatory w Jellyfin.");
            selected=entry;
        }
        return selected;
    }
    public async Task<SimklItemResponse> ReadItemAsync(string user,SimklMediaTarget target,bool refresh,CancellationToken cancel)
    {
        if(!target.Relevant)throw new UnauthorizedAccessException("Simkl nie obsługuje biblioteki AnimePL");
        var connection=await ConnectionAsync(user,cancel).ConfigureAwait(false);
        var archive=await _local.ReadAsync(user,cancel).ConfigureAwait(false);
        if(!connection.Connected&&archive.Snapshot is null)
            return new SimklItemResponse(false,false,null,target.SeasonNumber);
        if(target.Ids.Count==0)
            return new SimklItemResponse(connection.Connected,false,null,target.SeasonNumber);
        var snapshot=await LoadSnapshotAsync(user,refresh,cancel,target.SeasonNumber.HasValue).ConfigureAwait(false);
        return new SimklItemResponse(connection.Connected||archive.Snapshot is not null,true,
            Match(snapshot,target),target.SeasonNumber,snapshot.IsOffline||!connection.Connected);
    }
    private static bool ValidStatus(string? status,string kind)
    {
        if(status is "completed" or "plantowatch" or "dropped")return true;
        return kind=="shows" && (status is "watching" or "hold");
    }
    private static void EnsureWriteAcknowledged(JsonElement root,string kind,bool removal=false)
    {
        if(root.ValueKind!=JsonValueKind.Object)throw new HttpRequestException("Simkl nie potwierdził zapisu.");
        if(root.TryGetProperty("not_found",out var missing)&&missing.ValueKind==JsonValueKind.Object&&
            missing.TryGetProperty(kind,out var list)&&list.ValueKind==JsonValueKind.Array&&list.GetArrayLength()>0)
            throw new InvalidOperationException("Simkl nie rozpoznał filmu/serialu według ID. Nie zapisano zmian.");
        var key=removal?"deleted":"added";
        if(!root.TryGetProperty(key,out var acknowledged)||acknowledged.ValueKind!=JsonValueKind.Object)
            throw new HttpRequestException("Simkl nie potwierdził operacji zapisu.");
        // /sync/add-to-list returns added.shows[] / added.movies[] arrays;
        // ratings use added.shows / added.movies numeric counts; unrating uses deleted counts.
        var count=acknowledged.TryGetProperty(kind,out var confirmed)
            ? confirmed.ValueKind==JsonValueKind.Array?confirmed.GetArrayLength():Count(acknowledged,kind)??0
            : 0;
        if(count<=0)throw new HttpRequestException("Simkl nie potwierdził zapisu tej pozycji.");
    }
    // Explicit season/episode history mutation; never calls add-to-list or ratings.
    // This method is reached ONLY from the confirmed season-editor submission.
    public async Task UpdateSeasonAsync(string user,SimklMediaTarget target,
        SimklSeasonEdit edit,IReadOnlyCollection<int> allowedEpisodes,CancellationToken cancel)
    {
        if(!target.Relevant||target.Kind!="shows"||!target.SeasonNumber.HasValue||
            target.SeasonNumber.Value<0||target.SeasonNumber.Value>500)
            throw new ArgumentException("Edycja historii wymaga wskazania jednego sezonu serialu.");
        if(target.Ids.Count==0)throw new InvalidOperationException("Serial musi mieć poprawny identyfikator TMDB, IMDb albo TVDB.");
        var chosen=edit.EpisodeNumbers;
        if(chosen is not null)
        {
            if(chosen.Count is <1 or >500 ||chosen.Count!=chosen.Distinct().Count() ||
                chosen.Any(n=>n<1||n>9999||!allowedEpisodes.Contains(n)))
                throw new ArgumentException("Wybrane odcinki nie należą do tego sezonu w bibliotece Jellyfin.");
        }
        // Local-first: an unavailable Simkl must never prevent the user from
        // marking individual episodes or the whole selected season.
        await _local.ApplyManualHistoryAsync(user,target,
            chosen??allowedEpisodes,edit.Watched,cancel,wholeSeason:chosen is null).ConfigureAwait(false);
        _snapshots.TryRemove(user,out _);
        try{await TryFlushPendingAsync(user,cancel).ConfigureAwait(false);}
        catch(Exception ex) when(ex is HttpRequestException or InvalidOperationException or TaskCanceledException){}

    }

    public async Task<SimklEntry?> UpdateAsync(string user,SimklMediaTarget target,SimklEdit edit,CancellationToken cancel)
    {
        if(target.SeasonNumber.HasValue)throw new ArgumentException("Status i ocena całego serialu są edytowane wyłącznie na stronie serialu. Dla sezonu użyj historii sezonu.");
        if(!target.Relevant||target.Ids.Count==0)throw new InvalidOperationException("Tytuł musi mieć poprawne TMDB, IMDb albo TVDB ID w Jellyfin.");
        if(!edit.ChangeStatus&&!edit.ChangeScore)throw new ArgumentException("Nie wybrano zmian do zapisania.");
        if(edit.ChangeStatus&&!ValidStatus(edit.Status,target.Kind))throw new ArgumentException("Niedozwolony status Simkl.");
        if(edit.ChangeScore&&(!edit.Score.HasValue||edit.Score.Value is <0 or >10))
            throw new ArgumentException("Ocena Simkl musi mieścić się w zakresie 0–10.");
        var operation=new MisioFlixSimklLocalStore.PendingEdit {
            Key=MisioFlixSimklLocalStore.ManualEditKey(target.Kind,target.Ids),
            Kind=target.Kind,
            Ids=new Dictionary<string,string>(target.Ids,StringComparer.OrdinalIgnoreCase),
            Title=target.Title,Year=target.Year,Status=edit.Status,Score=edit.Score,
            ChangeStatus=edit.ChangeStatus,ChangeScore=edit.ChangeScore,
            CreateIfMissing=edit.CreateIfMissing
        };
        // Durable local commit BEFORE any network I/O. Only movies/shows enter
        // this backup, never Simkl's anime category or AnimePL/MAL.
        await _local.QueueManualEditAsync(user,operation,cancel).ConfigureAwait(false);
        if(edit.ChangeStatus)
            await _local.DiscardPendingForTitleAsync(user,target,cancel).ConfigureAwait(false);
        _snapshots.TryRemove(user,out _);
        try{await TryFlushPendingAsync(user,cancel).ConfigureAwait(false);}
        catch(Exception ex) when(ex is HttpRequestException or InvalidOperationException or TaskCanceledException){}
        return null;
    }

    private async Task SendManualEditAsync(string user,MisioFlixSimklLocalStore.PendingEdit edit,CancellationToken cancel)
    {
        var credential=await ValidCredentialAsync(user,cancel).ConfigureAwait(false);
        if(!credential.Scope.Split(' ',StringSplitOptions.RemoveEmptyEntries).Contains("media:write"))
            throw new InvalidOperationException("Konto Simkl nie ma uprawnienia media:write.");
        var ids=edit.Ids.ToDictionary(x=>x.Key,x=>x.Key=="imdb"?(object)x.Value:
            long.Parse(x.Value,CultureInfo.InvariantCulture));
        var identity=new Dictionary<string,object>{{"ids",ids}};
        if(!string.IsNullOrWhiteSpace(edit.Title))identity["title"]=edit.Title;
        if(edit.Year.HasValue)identity["year"]=edit.Year.Value;
        // An earlier HTTP response may have been lost AFTER Simkl processed the
        // operation. Verify the real remote state before repeating it.
        SimklEntry? observed=null;
        if(edit.Attempts>0)
        {
            using var listing=await ApiAsync(user,HttpMethod.Get,"/sync/all-items/"+edit.Kind+
                "?extended=full",null,cancel).ConfigureAwait(false);
            var remote=new SyncSnapshot();
            MergeRows(remote,listing.RootElement);
            observed=Match(remote,new SimklMediaTarget(true,edit.Kind,null,edit.Ids,edit.Title??"",edit.Year));
            if(observed is not null&&
                (!edit.ChangeStatus||observed.Status==edit.Status)&&
                (!edit.ChangeScore||(edit.Score is >0?observed.Score==edit.Score:observed.Score is null or 0)))
                return;
        }
        if(edit.CreateIfMissing&&(observed is null||observed.Status!=edit.Status))
        {
            if(!edit.ChangeStatus||!ValidStatus(edit.Status,edit.Kind))
                throw new ArgumentException("Dodanie do listy wymaga statusu.");
            using var create=await ApiAsync(user,HttpMethod.Post,"/sync/add-to-list",
                new Dictionary<string,object>{{edit.Kind,new[]{new Dictionary<string,object>(identity){{"to",edit.Status!}}}}},
                cancel).ConfigureAwait(false);
            EnsureWriteAcknowledged(create.RootElement,edit.Kind);
        }
        // Rating first: Simkl may change list status when receiving a rating.
        if(edit.ChangeScore)
        {
            var rating=new Dictionary<string,object>{{"ids",ids}};
            if(edit.Score>0)rating["rating"]=edit.Score.Value;
            using var response=await ApiAsync(user,HttpMethod.Post,edit.Score>0?"/sync/ratings":"/sync/ratings/remove",
                new Dictionary<string,object>{{edit.Kind,new[]{rating}}},cancel).ConfigureAwait(false);
            EnsureWriteAcknowledged(response.RootElement,edit.Kind,removal:edit.Score==0);
        }
        if(edit.ChangeStatus && (!edit.CreateIfMissing||edit.ChangeScore))
        {
            using var response=await ApiAsync(user,HttpMethod.Post,"/sync/add-to-list",
                new Dictionary<string,object>{{edit.Kind,new[]{new Dictionary<string,object>(identity){{"to",edit.Status!}}}}},
                cancel).ConfigureAwait(false);
            EnsureWriteAcknowledged(response.RootElement,edit.Kind);
        }
    }

    /// <summary>Triggered by an active user's first entry after a restart or
    /// at least 72 hours since last successful remote snapshot.</summary>
    public async Task<bool> SyncIfDueAsync(string user,CancellationToken cancel)
    {
        var archive=await _local.ReadAsync(user,cancel).ConfigureAwait(false);
        var credential=await ConnectionAsync(user,cancel).ConfigureAwait(false);
        if(!credential.Connected)return archive.Snapshot is not null;
        if(archive.PendingWatches.Count>0||archive.PendingEdits.Count>0)
            await TryFlushPendingAsync(user,cancel).ConfigureAwait(false);
        if(archive.Snapshot is not null&&
            archive.Snapshot.CheckedAt>DateTimeOffset.UtcNow-CacheLifetime)return true;
        try
        {
            var refreshed=await LoadSnapshotAsync(user,false,cancel,true).ConfigureAwait(false);
            return !refreshed.IsOffline;
        }
        catch(Exception ex) when(ex is HttpRequestException or InvalidOperationException or TaskCanceledException)
        {return archive.Snapshot is not null;}
    }

    /// <summary>
    /// Playback events are queued durably *before* network I/O. Duplicate threshold
    /// notifications replace the same key; retries never create extra watch sessions.
    /// </summary>
    public async Task RecordPlaybackWatchedAsync(string user,SimklMediaTarget target,int? episode,
        CancellationToken cancel)
    {
        if(!target.Relevant||target.Ids.Count==0||
            (target.Kind=="shows"&&(!target.SeasonNumber.HasValue||!episode.HasValue)))return;
        // Confirmed local playback is saved even when Simkl is temporarily offline.
        // It will be sent when the user's connection is available again.
        var key=MisioFlixSimklLocalStore.ManualEditKey(target.Kind,target.Ids)+
            ":"+target.SeasonNumber+":"+episode;
        await _local.QueueWatchAsync(user,new MisioFlixSimklLocalStore.PendingWatch{
            Key=key,Kind=target.Kind,Ids=target.Ids,Season=target.SeasonNumber,Episode=episode,Watched=true
        },cancel).ConfigureAwait(false);
        _snapshots.TryRemove(user,out _); // reload local overlaid history on the next detail view
        await TryFlushPendingAsync(user,cancel).ConfigureAwait(false);
    }
    private sealed record PendingOperation(DateTimeOffset Time,
        MisioFlixSimklLocalStore.PendingWatch? Watch,
        MisioFlixSimklLocalStore.PendingEdit? Edit);
    private readonly ConcurrentDictionary<string,DateTimeOffset> _retryAt = new();
    public async Task TryFlushPendingAsync(string user,CancellationToken cancel)
    {
        if(_retryAt.TryGetValue(user,out var until)&&until>DateTimeOffset.UtcNow)return;
        if(!(await ConnectionAsync(user,cancel).ConfigureAwait(false)).Connected)return;
        await SyncLock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var archive=await _local.ReadAsync(user,cancel).ConfigureAwait(false);
            var operations=archive.PendingWatches.Select(x=>new PendingOperation(x.CreatedAt,x,null))
                .Concat(archive.PendingEdits.Select(x=>new PendingOperation(x.CreatedAt,null,x)))
                .OrderBy(x=>x.Time).Take(100).ToArray();
            foreach(var op in operations)
            {
                var opId=op.Edit?.OperationId??op.Watch?.OperationId??"";
                try
                {
                    if(op.Edit is not null)
                    {
                        await SendManualEditAsync(user,op.Edit,cancel).ConfigureAwait(false);
                        await _local.CompleteManualEditAsync(user,op.Edit.Key,opId,cancel).ConfigureAwait(false);
                    }
                    else if(op.Watch is { } watch)
                    {
                        var ids=watch.Ids.ToDictionary(p=>p.Key,p=>p.Key=="imdb"?(object)p.Value:
                            long.Parse(p.Value,CultureInfo.InvariantCulture));
                        var item=new Dictionary<string,object>{{"ids",ids}};
                        if(watch.Kind=="shows")
                        {
                            if(!watch.Season.HasValue)continue;
                            if(watch.Episode.HasValue)
                                item["seasons"]=new[]{new{number=watch.Season.Value,episodes=new[]{new{number=watch.Episode.Value}}}};
                            else // Whole-season request: Simkl resolves its complete episode list.
                                item["seasons"]=new[]{new{number=watch.Season.Value}};
                        }
                        var route=watch.Watched?"/sync/history":"/sync/history/remove";
                        using var result=await ApiAsync(user,HttpMethod.Post,route,
                            new Dictionary<string,object>{{watch.Kind,new[]{item}}},cancel).ConfigureAwait(false);
                        var root=result.RootElement;
                        if(root.TryGetProperty("not_found",out var missing)&&missing.ValueKind==JsonValueKind.Object &&
                            missing.EnumerateObject().Any(x=>x.Value.ValueKind==JsonValueKind.Array&&x.Value.GetArrayLength()>0))
                            throw new InvalidOperationException("Simkl nie odnalazł pozycji do zapisania historii.");
                        if(!root.TryGetProperty(watch.Watched?"added":"deleted",out _))
                            throw new HttpRequestException("Brak potwierdzenia zapisu historii w Simkl.");
                        await _local.CompleteWatchAsync(user,watch.Key,opId,cancel).ConfigureAwait(false);
                    }
                    await _local.MarkForRefreshAsync(user,cancel).ConfigureAwait(false);
                    _retryAt.TryRemove(user,out _);
                    if(_snapshots.TryGetValue(user,out var snapshot))snapshot.CheckedAt=DateTimeOffset.MinValue;
                }
                catch(Exception ex) when(ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
                {
                    await _local.NoteAttemptAsync(user,opId,ex.Message,cancel).ConfigureAwait(false);
                    // Respect Retry-After on HTTP 429; use bounded exponential
                    // backoff for ambiguous network failures and invalid responses.
                    var previous=op.Edit?.Attempts??op.Watch?.Attempts??0;
                    var delay=ex is SimklRateLimitException limited ? limited.Delay:
                        TimeSpan.FromMinutes(Math.Min(60,Math.Pow(2,Math.Min(6,previous))));
                    _retryAt[user]=DateTimeOffset.UtcNow.Add(delay);
                    break;
                }
            }
        }
        finally{SyncLock(user).Release();}
    }
}
