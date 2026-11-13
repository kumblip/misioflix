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
/// Independent Simkl AUTH V2 and sync module. Never references MAL or changes
/// Jellyfin playback, status, NFO, folders or user ratings. Writes happen only
/// in UpdateAsync, invoked by the explicit authenticated /simkl/update endpoint.
/// </summary>
public sealed class MisioFlixSimklService
{
    private const string Api = "https://api.simkl.com";
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromMinutes(45);
    private readonly HttpClient _http;
    private readonly string _folder;
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
    }
    public sealed record SimklConnection(bool Connected, bool CanWrite);
    public sealed record SimklPin(string Code, string Uri, int ExpiresIn, int Interval);
    public sealed record SimklPoll(bool Connected, bool Pending, int RetryAfter);
    public sealed record SimklEntry(string Kind, long Id, string Status, int? Score,
        int? WatchedEpisodes, int? TotalEpisodes, Dictionary<string,string> Ids,
        string? Title, string? Slug);
    public sealed record SimklItemResponse(bool Connected, bool Matched, SimklEntry? Entry,
        int? SeasonNumber);
    public sealed record SimklEdit(string? Status, int? Score, bool ChangeStatus, bool ChangeScore);

    public MisioFlixSimklService(HttpClient http, IApplicationPaths paths)
    {
        _http=http;
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
        request.Headers.UserAgent.ParseAdd("MisioFlix/0.4.46 (Jellyfin)");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if(!string.IsNullOrWhiteSpace(bearer))request.Headers.Authorization=new AuthenticationHeaderValue("Bearer",bearer);
        if(payload is Dictionary<string,string> pairs && form)
            request.Content=new FormUrlEncodedContent(pairs);
        else if(payload is not null)
            request.Content=new StringContent(JsonSerializer.Serialize(payload),Encoding.UTF8,"application/json");
        using var response=await _http.SendAsync(request,HttpCompletionOption.ResponseHeadersRead,cancel).ConfigureAwait(false);
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
            "&app-name=misioflix&app-version=0.4.46";
        var(status,doc)=await SendAsync(method,full,credential.AccessToken,payload,cancel).ConfigureAwait(false);
        try{EnsureSuccess(status,doc);return doc;}catch{doc.Dispose();throw;}
    }
    private static void MergeRows(SyncSnapshot state,JsonElement doc)
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
                foreach(var key in new[]{"tmdb","imdb","tvdb"}){
                    var entry=Get(ids,key);if(!string.IsNullOrWhiteSpace(entry))ext[key]=entry;
                }
                var score=Count(row,"user_rating");
                var entryValue=new SimklEntry(kind,id,Get(row,"status"),score,
                    kind=="shows"?Count(row,"watched_episodes_count"):null,
                    kind=="shows"?Count(row,"total_episodes_count"):null,
                    ext,Get(media,"title"),Get(ids,"slug"));
                state.Items[kind+":"+id.ToString(CultureInfo.InvariantCulture)]=entryValue;
            }
        }
    }
    private async Task<SyncSnapshot> LoadSnapshotAsync(string user,bool refresh,CancellationToken cancel)
    {
        if(_snapshots.TryGetValue(user,out var cache)&&!refresh && cache.CheckedAt>DateTimeOffset.UtcNow-CacheLifetime)
            return cache;
        await SyncLock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            if(_snapshots.TryGetValue(user,out cache)&&!refresh && cache.CheckedAt>DateTimeOffset.UtcNow-CacheLifetime)
                return cache;
            using var activities=await ApiAsync(user,HttpMethod.Get,"/sync/activities",null,cancel).ConfigureAwait(false);
            var nowActivity=Get(activities.RootElement,"all");
            if(string.IsNullOrWhiteSpace(nowActivity))throw new HttpRequestException("Simkl nie zwrócił znacznika zmian list.");
            if(cache is not null && cache.Activity==nowActivity)
            {
                cache.CheckedAt=DateTimeOffset.UtcNow;
                return cache;
            }
            var result=new SyncSnapshot();
            if(cache is null)
            {
                // Official Simkl phase 1: activities BEFORE initial sequential pulls.
                using var shows=await ApiAsync(user,HttpMethod.Get,"/sync/all-items/shows",null,cancel).ConfigureAwait(false);
                MergeRows(result,shows.RootElement);
                using var movies=await ApiAsync(user,HttpMethod.Get,"/sync/all-items/movies",null,cancel).ConfigureAwait(false);
                MergeRows(result,movies.RootElement);
            }
            else
            {
                foreach(var pair in cache.Items)result.Items[pair.Key]=pair.Value;
                // Official phase 2: only changes since the *previous* activities snapshot.
                using var delta=await ApiAsync(user,HttpMethod.Get,"/sync/all-items?date_from="+
                    Uri.EscapeDataString(cache.Activity),null,cancel).ConfigureAwait(false);
                MergeRows(result,delta.RootElement);
                // A rating-only change is absent from all-items; fetch the ratings delta.
                using var ratings=await ApiAsync(user,HttpMethod.Get,"/sync/ratings?date_from="+
                    Uri.EscapeDataString(cache.Activity),null,cancel).ConfigureAwait(false);
                MergeRatingRows(result,ratings.RootElement);
                // Deleted watchlist entries are absent from the delta; reconcile IDs.
                foreach(var kind in new[]{"shows","movies"})
                {
                    using var listing=await ApiAsync(user,HttpMethod.Get,"/sync/all-items/"+kind+
                        "?extended=simkl_ids_only",null,cancel).ConfigureAwait(false);
                    var active=new HashSet<long>();
                    if(listing.RootElement.TryGetProperty(kind,out var rows) && rows.ValueKind==JsonValueKind.Array)
                        foreach(var row in rows.EnumerateArray())
                        {
                            var media=row.TryGetProperty(kind=="shows"?"show":"movie",out var m)?m:default;
                            var ids=media.ValueKind==JsonValueKind.Object&&media.TryGetProperty("ids",out var i)?i:default;
                            var id=Identifier(ids,"simkl");if(id>0)active.Add(id);
                        }
                    foreach(var key in result.Items.Keys.Where(k=>k.StartsWith(kind+":",StringComparison.Ordinal)).ToArray())
                        if(long.TryParse(key.AsSpan(kind.Length+1),out var id) && !active.Contains(id))result.Items.Remove(key);
                }
            }
            result.Activity=nowActivity;result.CheckedAt=DateTimeOffset.UtcNow;
            _snapshots[user]=result;
            return result;
        }
        finally {SyncLock(user).Release();}
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
        if(!connection.Connected)return new SimklItemResponse(false,false,null,target.SeasonNumber);
        if(target.Ids.Count==0)return new SimklItemResponse(true,false,null,target.SeasonNumber);
        var snapshot=await LoadSnapshotAsync(user,refresh,cancel).ConfigureAwait(false);
        return new SimklItemResponse(true,true,Match(snapshot,target),target.SeasonNumber);
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
    public async Task<SimklEntry?> UpdateAsync(string user,SimklMediaTarget target,SimklEdit edit,CancellationToken cancel)
    {
        if(!target.Relevant||target.Ids.Count==0)throw new InvalidOperationException("Tytuł musi mieć poprawne TMDB, IMDb albo TVDB ID w Jellyfin.");
        if(!edit.ChangeStatus&&!edit.ChangeScore)throw new ArgumentException("Nie wybrano zmian do zapisania.");
        if(edit.ChangeStatus&&!ValidStatus(edit.Status,target.Kind))throw new ArgumentException("Niedozwolony status Simkl.");
        if(edit.ChangeScore&&(!edit.Score.HasValue||edit.Score.Value is <0 or >10))
            throw new ArgumentException("Ocena Simkl musi mieścić się w zakresie 0–10.");
        var token=await ValidCredentialAsync(user,cancel).ConfigureAwait(false);
        if(!token.Scope.Split(' ',StringSplitOptions.RemoveEmptyEntries).Contains("media:write"))
            throw new InvalidOperationException("Połącz ponownie Simkl z uprawnieniem media:write.");
        var payloadIds=target.Ids.ToDictionary(x=>x.Key,x=>(object)x.Value);
        // Ratings can auto-move items into Watching/Completed. Therefore apply
        // the selected status LAST. Do not submit unchanged fields.
        if(edit.ChangeScore)
        {
            var payload=new Dictionary<string,object>{{"ids",payloadIds}};
            if(edit.Score>0)payload["rating"]=edit.Score.Value;
            var endpoint=edit.Score>0?"/sync/ratings":"/sync/ratings/remove";
            using var response=await ApiAsync(user,HttpMethod.Post,endpoint,
                new Dictionary<string,object>{{target.Kind,new[]{payload}}},cancel).ConfigureAwait(false);
            EnsureWriteAcknowledged(response.RootElement,target.Kind,removal:edit.Score==0);
        }
        if(edit.ChangeStatus)
        {
            var element=new Dictionary<string,object>{{"ids",payloadIds},{"to",edit.Status!}};
            using var response=await ApiAsync(user,HttpMethod.Post,"/sync/add-to-list",
                new Dictionary<string,object>{{target.Kind,new[]{element}}},cancel).ConfigureAwait(false);
            EnsureWriteAcknowledged(response.RootElement,target.Kind);
        }
        // No global cache flush. The next user-triggered read checks activity
        // deltas, including rating-only changes; nothing is sent on playback.
        // Explicit save should display authoritative results, not the old cache.
        _snapshots.TryRemove(user,out _);
        return null;
    }
}
