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
using Microsoft.AspNetCore.Http;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>Direct MAL v2 integration. No third-party services or plugins.
/// Token files stay in Jellyfin's private configuration volume, one per user.</summary>
public sealed class MisioFlixMalService
{
    private const string AuthorizeUrl = "https://myanimelist.net/v1/oauth2/authorize";
    private const string TokenUrl = "https://myanimelist.net/v1/oauth2/token";
    private const string ApiUrl = "https://api.myanimelist.net/v2/";
    private readonly HttpClient _client;
    private readonly string _folder;
    private static readonly ConcurrentDictionary<string, AuthPending> Pending = new();
    private static readonly SemaphoreSlim TokenGate = new(1, 1);
    private static readonly ConcurrentDictionary<string, CachedList> ListCache = new();
    private sealed record AuthPending(string UserId, string Verifier, DateTimeOffset Expires);
    private sealed record TokenRecord(string AccessToken, string RefreshToken, DateTimeOffset Expires);
    private sealed record CachedList(DateTimeOffset Expires, Dictionary<int, MalEntry> Entries);

    public MisioFlixMalService(HttpClient client, IApplicationPaths app)
    {
        _client = client;
        _folder = Path.Combine(app.DataPath,"misioflix","mal");
    }

    private static string UserId(string id) => Guid.TryParse(id, out var g) ? g.ToString("N") :
        throw new UnauthorizedAccessException("Nieprawidłowy użytkownik Jellyfin");
    private string TokenPath(string userId) => Path.Combine(_folder, UserId(userId)+".json");
    private static string RandomUrlSafe(int bytes) => Convert.ToBase64String(RandomNumberGenerator.GetBytes(bytes))
        .TrimEnd('=').Replace('+','-').Replace('/','_');
    private static (string clientId,string secret,string redirect) Settings()
    {
        var c=Plugin.Instance?.Configuration ?? throw new InvalidOperationException("Brak konfiguracji MisioFlix");
        var clientId=(c.MalClientId??"").Trim();
        var redirect=(c.MalRedirectUri??"").Trim();
        if (string.IsNullOrWhiteSpace(clientId) || !Uri.TryCreate(redirect,UriKind.Absolute,out var u)
            || !u.AbsolutePath.EndsWith("/MisioFlix/api/mal/callback",StringComparison.OrdinalIgnoreCase)
            || (u.Scheme!="https" && !(u.Scheme=="http" &&
                (u.IsLoopback || u.Host.IndexOf('.') < 0))))
            throw new InvalidOperationException("Ustaw MAL Client ID i adres callback w ustawieniach wtyczki. HTTPS jest wymagany poza lokalnym NAS.");
        return (clientId,c.MalClientSecret??"",redirect);
    }

    public (string url,string message) Start(string userId)
    {
        var (id,_,redirect)=Settings();
        var state=RandomUrlSafe(32);
        var verifier=RandomUrlSafe(48);
        if(Pending.Count>1000)throw new InvalidOperationException("Zbyt wiele równoczesnych połączeń MAL");
        Pending[state]=new AuthPending(UserId(userId),verifier,DateTimeOffset.UtcNow.AddMinutes(10));
        foreach(var kv in Pending.Where(kv=>kv.Value.Expires<DateTimeOffset.UtcNow).ToArray())Pending.TryRemove(kv.Key,out _);
        var parameters=new Dictionary<string,string> {
            ["response_type"]="code", ["client_id"]=id, ["redirect_uri"]=redirect,
            ["code_challenge"]=verifier, ["code_challenge_method"]="plain", ["state"]=state
        };
        return (AuthorizeUrl+"?"+Form(parameters),"Po połączeniu wróć do MisioFlix i użyj Odśwież MAL.");
    }

    public async Task FinishAsync(string code,string state,CancellationToken cancel)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state) ||
            !Pending.TryRemove(state,out var pending) || pending.Expires<DateTimeOffset.UtcNow)
            throw new InvalidOperationException("Sesja połączenia z MAL wygasła albo jest nieprawidłowa");
        var (id,secret,redirect)=Settings();
        var form = new Dictionary<string,string>{["client_id"]=id,["grant_type"]="authorization_code",
            ["code"]=code,["redirect_uri"]=redirect,["code_verifier"]=pending.Verifier};
        if(!string.IsNullOrWhiteSpace(secret))form["client_secret"]=secret;
        await SaveTokenResponseAsync(pending.UserId,form,cancel).ConfigureAwait(false);
    }

    private static string Form(IDictionary<string,string> values) => string.Join("&",values.Select(x=>
        Uri.EscapeDataString(x.Key)+"="+Uri.EscapeDataString(x.Value)));

    private async Task SaveTokenResponseAsync(string user,Dictionary<string,string> fields,CancellationToken cancel)
    {
        using var request=new HttpRequestMessage(HttpMethod.Post,TokenUrl);
        request.Content=new FormUrlEncodedContent(fields);
        using var response=await _client.SendAsync(request,cancel).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        await using var stream=await response.Content.ReadAsStreamAsync(cancel).ConfigureAwait(false);
        using var doc=await JsonDocument.ParseAsync(stream,cancellationToken:cancel).ConfigureAwait(false);
        var root=doc.RootElement;
        var access=root.GetProperty("access_token").GetString() ?? throw new InvalidOperationException("Brak tokenu MAL");
        var refresh=root.GetProperty("refresh_token").GetString() ?? throw new InvalidOperationException("Brak odświeżenia MAL");
        var lifetime=root.GetProperty("expires_in").GetInt32();
        if(lifetime<=0) throw new InvalidOperationException("Token MAL bez terminu ważności");
        Directory.CreateDirectory(_folder);
        var filename=TokenPath(user);
        var temp=filename+"."+RandomUrlSafe(6)+".tmp";
        try
        {
            await File.WriteAllTextAsync(temp,JsonSerializer.Serialize(new TokenRecord(access,refresh,
                DateTimeOffset.UtcNow.AddSeconds(lifetime))),cancel).ConfigureAwait(false);
            if(OperatingSystem.IsLinux())File.SetUnixFileMode(temp,UnixFileMode.UserRead|UnixFileMode.UserWrite);
            File.Move(temp,filename,true);
            ListCache.TryRemove(user,out _);
        }
        finally {if(File.Exists(temp))File.Delete(temp);}
    }

    private async Task<TokenRecord?> ReadTokenAsync(string user,CancellationToken cancel)
    {
        var file=TokenPath(user);
        if(!File.Exists(file))return null;
        return JsonSerializer.Deserialize<TokenRecord>(await File.ReadAllTextAsync(file,cancel).ConfigureAwait(false));
    }

    public bool Connected(string userId) => File.Exists(TokenPath(userId));
    public async Task DisconnectAsync(string userId,CancellationToken cancel)
    {
        var user=UserId(userId);
        await TokenGate.WaitAsync(cancel).ConfigureAwait(false);
        try {var file=TokenPath(user);if(File.Exists(file))File.Delete(file);ListCache.TryRemove(user,out _);}
        finally {TokenGate.Release();}
    }

    private async Task<string?> AccessAsync(string userId,CancellationToken cancel)
    {
        var user=UserId(userId);
        await TokenGate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var token=await ReadTokenAsync(user,cancel).ConfigureAwait(false);
            if(token is null)return null;
            if(token.Expires>DateTimeOffset.UtcNow.AddSeconds(60))return token.AccessToken;
            var (id,secret,_)=Settings();
            var form=new Dictionary<string,string>{["client_id"]=id,["grant_type"]="refresh_token",
                ["refresh_token"]=token.RefreshToken};
            if(!string.IsNullOrEmpty(secret))form["client_secret"]=secret;
            await SaveTokenResponseAsync(user,form,cancel).ConfigureAwait(false);
            return (await ReadTokenAsync(user,cancel).ConfigureAwait(false))?.AccessToken;
        }
        finally {TokenGate.Release();}
    }

    private async Task<JsonDocument> SendJsonAsync(HttpMethod method,string path,string token,
        Dictionary<string,string>? values,CancellationToken cancel)
    {
        using var request=new HttpRequestMessage(method,new Uri(new Uri(ApiUrl),path));
        request.Headers.Authorization=new AuthenticationHeaderValue("Bearer",token);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if(values is not null)request.Content=new FormUrlEncodedContent(values);
        using var response=await _client.SendAsync(request,cancel).ConfigureAwait(false);
        if(response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.Unauthorized)
            throw new UnauthorizedAccessException("MAL odmówił dostępu. Połącz konto ponownie.");
        response.EnsureSuccessStatusCode();
        await using var stream=await response.Content.ReadAsStreamAsync(cancel).ConfigureAwait(false);
        return await JsonDocument.ParseAsync(stream,cancellationToken:cancel).ConfigureAwait(false);
    }

    public async Task<Dictionary<int,MalEntry>> ReadAllAsync(string userId,bool refresh,CancellationToken cancel)
    {
        var user=UserId(userId);
        if(!refresh && ListCache.TryGetValue(user,out var entry) && entry.Expires>DateTimeOffset.UtcNow)
            return entry.Entries;
        var token=await AccessAsync(user,cancel).ConfigureAwait(false);
        if(token is null)return new();
        var entries=new Dictionary<int,MalEntry>();
        const int batch=1000;
        for(var offset=0;offset<20000;offset+=batch)
        {
            using var doc=await SendJsonAsync(HttpMethod.Get,
                $"users/@me/animelist?fields=list_status&limit={batch}&offset={offset}",token,null,cancel)
                .ConfigureAwait(false);
            var data=doc.RootElement.GetProperty("data");
            foreach(var obj in data.EnumerateArray())
            {
                if(!obj.TryGetProperty("node",out var node)||!node.TryGetProperty("id",out var idEl)||!idEl.TryGetInt32(out var id))continue;
                if(!obj.TryGetProperty("list_status",out var status))continue;
                entries[id]=ReadEntry(id,status);
            }
            if(data.GetArrayLength()<batch)break;
            await Task.Delay(1200,cancel).ConfigureAwait(false); // Avoid MAL rate limiting.
        }
        ListCache[user]=new CachedList(DateTimeOffset.UtcNow.AddMinutes(3),entries);
        return entries;
    }

    public async Task<MalEntry> UpdateAsync(string userId,int malId,MalUpdate value,CancellationToken cancel)
    {
        if(malId<=0)throw new ArgumentOutOfRangeException(nameof(malId));
        if(value.Score.HasValue && (value.Score<0 || value.Score>10))throw new ArgumentOutOfRangeException(nameof(value.Score));
        if(value.TimesRewatched.HasValue && (value.TimesRewatched<0||value.TimesRewatched>10000))
            throw new ArgumentOutOfRangeException(nameof(value.TimesRewatched));
        if(value.EpisodesWatched.HasValue && (value.EpisodesWatched<0||value.EpisodesWatched>10000))
            throw new ArgumentOutOfRangeException(nameof(value.EpisodesWatched));
        var allowed=new[]{"watching","completed","on_hold","dropped","plan_to_watch"};
        if(value.Status is not null && !allowed.Contains(value.Status,StringComparer.Ordinal))
            throw new ArgumentException("Nieznany status MAL");
        var values=new Dictionary<string,string>();
        if(value.Score.HasValue)values["score"]=value.Score.Value.ToString(CultureInfo.InvariantCulture);
        if(value.Status is not null)values["status"]=value.Status;
        if(value.TimesRewatched.HasValue)values["num_times_rewatched"]=value.TimesRewatched.Value.ToString(CultureInfo.InvariantCulture);
        if(value.EpisodesWatched.HasValue)values["num_watched_episodes"]=value.EpisodesWatched.Value.ToString(CultureInfo.InvariantCulture);
        if(values.Count==0)throw new ArgumentException("Brak zmian do zapisania");
        var token=await AccessAsync(userId,cancel).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Połącz MyAnimeList przed zapisem");
        using var doc=await SendJsonAsync(HttpMethod.Patch,$"anime/{malId}/my_list_status",token,values,cancel).ConfigureAwait(false);
        ListCache.TryRemove(UserId(userId),out _);
        return ReadEntry(malId,doc.RootElement);
    }

    private static MalEntry ReadEntry(int id,JsonElement e)
    {
        static int Int(JsonElement x,string key) => x.TryGetProperty(key,out var v) && v.TryGetInt32(out var n)?n:0;
        static string Str(JsonElement x,string key)=>x.TryGetProperty(key,out var v)?v.GetString()??"":"";
        return new MalEntry(id,Str(e,"status"),Int(e,"score"),Int(e,"num_episodes_watched"),
            Int(e,"num_times_rewatched"));
    }
}
public sealed record MalEntry(int mal_id,string status,int score,int episodes_watched,int times_rewatched);
public sealed record MalUpdate(string? Status,int? Score,int? EpisodesWatched,int? TimesRewatched);
