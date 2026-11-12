using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Globalization;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.WebUtilities;
using MediaBrowser.Common.Configuration;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// A single MAL API application, independent OAuth sessions and token/cache storage per Jellyfin user.
/// Credentials are never sent to MisioFlix clients, and no process-wide "current MAL user" exists.
/// </summary>
public sealed class MisioFlixMalService
{
    private const string AuthorizeUrl = "https://myanimelist.net/v1/oauth2/authorize";
    private const string TokenUrl = "https://myanimelist.net/v1/oauth2/token";
    private const string ApiUrl = "https://api.myanimelist.net/v2/";
    private readonly HttpClient _client;
    private readonly string _folder;

    private static readonly ConcurrentDictionary<string, AuthPending> Pending = new();
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> TokenLocks = new();
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> ListLocks = new();
    // Only account linking needs a global check for duplicate MAL identities.
    // Regular list reads/writes and token refreshes for different Jellyfin users run concurrently.
    private static readonly SemaphoreSlim AccountLinkGate = new(1, 1);
    private static readonly ConcurrentDictionary<string, CachedList> ListCache = new();

    private sealed record AuthPending(string UserId, string Verifier, DateTimeOffset Expires, string Redirect);
    // Optional trailing properties migrate v0.4.3 token files without losing access or refresh tokens.
    private sealed record TokenRecord(string AccessToken, string RefreshToken, DateTimeOffset Expires,
        int MalUserId = 0, string MalUsername = "");
    private sealed record MalIdentity(int Id, string Username);
    private sealed record CachedList(DateTimeOffset Expires, Dictionary<int, MalEntry> Entries);
    // Selected-title data is deliberately cached separately: the paginated MAL list can
    // omit advanced list_status properties (in particular the rewatch counter).
    // Never share a user's personal list data with another Jellyfin user.
    private sealed record CachedItem(DateTimeOffset Expires, MalEntry? Entry);
    private static readonly ConcurrentDictionary<string, CachedItem> ItemCache = new();
    // Opt-in, user-scoped, short-lived diagnostic data. Never contains credentials,
    // OAuth codes, MAL profile identifiers, notes or raw JSON.
    private sealed record CachedDiagnostic(DateTimeOffset Expires, object Result);
    private static readonly ConcurrentDictionary<string, CachedDiagnostic> Diagnostics = new();
    public sealed record MalConnection(bool Connected, int? MalUserId, string? Username);

    public MisioFlixMalService(HttpClient client, IApplicationPaths app)
    {
        _client = client;
        _folder = Path.Combine(app.DataPath, "misioflix", "mal");
    }

    private static string UserId(string id) => Guid.TryParse(id, out var guid)
        ? guid.ToString("N") : throw new UnauthorizedAccessException("Nieprawidłowy użytkownik Jellyfin");
    private string TokenPath(string userId) => Path.Combine(_folder, UserId(userId) + ".json");
    private static SemaphoreSlim TokenLock(string user) => TokenLocks.GetOrAdd(user, _ => new SemaphoreSlim(1, 1));
    private static SemaphoreSlim ListLock(string user) => ListLocks.GetOrAdd(user, _ => new SemaphoreSlim(1, 1));
    private static string ItemCacheKey(string user, int malId) =>
        user + ":" + malId.ToString(CultureInfo.InvariantCulture);
    private static void ClearItemCache(string user)
    {
        // Small, in-memory index only. Does not touch token files or MAL itself.
        foreach (var key in ItemCache.Keys)
            if (key.StartsWith(user + ":", StringComparison.Ordinal)) ItemCache.TryRemove(key, out _);
    }
    private static string RandomUrlSafe(int bytes) => Convert.ToBase64String(RandomNumberGenerator.GetBytes(bytes))
        .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static (string clientId, string secret, string redirect) Settings()
    {
        var c = Plugin.Instance?.Configuration ?? throw new InvalidOperationException("Brak konfiguracji MisioFlix");
        var clientId = (c.MalClientId ?? "").Trim();
        var redirect = (c.MalRedirectUri ?? "").Trim();
        var valid = Uri.TryCreate(redirect, UriKind.Absolute, out var url)
            && url is not null
            && string.IsNullOrWhiteSpace(url.UserInfo)
            && string.IsNullOrEmpty(url.Query) && string.IsNullOrEmpty(url.Fragment)
            && ((url.IsLoopback && (url.Scheme == "http" || url.Scheme == "https"))
                || (url.AbsolutePath.EndsWith("/MisioFlix/api/mal/callback", StringComparison.OrdinalIgnoreCase)
                    && (url.Scheme == "https" || (url.Scheme == "http" && url.Host.IndexOf('.') < 0))));
        if (string.IsNullOrWhiteSpace(clientId) || !valid)
            throw new InvalidOperationException("Ustaw Client ID i callback MAL: http://localhost:8765/callback (tryb ręczny) albo adres działającego serwera MisioFlix.");
        return (clientId, c.MalClientSecret ?? "", redirect);
    }

    private static bool ManualRedirect(string redirect) => new Uri(redirect).IsLoopback;

    private static string Query(IDictionary<string, string> values) => string.Join("&", values.Select(kv =>
        Uri.EscapeDataString(kv.Key) + "=" + Uri.EscapeDataString(kv.Value)));

    public (string url, string message, bool manual) Start(string userId)
    {
        var (id, _, redirect) = Settings();
        foreach (var kv in Pending.Where(kv => kv.Value.Expires < DateTimeOffset.UtcNow).ToArray())
            Pending.TryRemove(kv.Key, out _);
        if (Pending.Count > 1000) throw new InvalidOperationException("Zbyt wiele prób łączenia MAL. Spróbuj ponownie.");
        var state = RandomUrlSafe(32);
        // MAL officially supports PKCE plain; S256 is not supported by this provider.
        var verifier = RandomUrlSafe(48);
        Pending[state] = new AuthPending(UserId(userId), verifier, DateTimeOffset.UtcNow.AddMinutes(10), redirect);
        var parameters = new Dictionary<string, string> {
            ["response_type"] = "code", ["client_id"] = id, ["redirect_uri"] = redirect,
            ["code_challenge"] = verifier, ["code_challenge_method"] = "plain", ["state"] = state
        };
        var manual = ManualRedirect(redirect);
        return (AuthorizeUrl + "?" + Query(parameters),
            manual ? "Po autoryzacji skopiuj cały adres z paska przeglądarki (nawet jeśli localhost nie odpowiada) i wklej go w MisioFlix. Ważność próby: 10 minut."
                   : "Po udzieleniu dostępu wróć do MisioFlix i wybierz Odśwież MAL.",
            manual);
    }

    // Existing HTTPS callback remains supported for users who already configured a domain.
    public Task FinishAsync(string code, string state, CancellationToken cancel)
        => FinishCoreAsync(code, state, expectedUser: null, manual: false, cancel);

    /// <summary>
    /// Accept the full localhost redirect URL after OAuth consent. This is an authenticated
    /// POST body, never a URL query to the MisioFlix server or a browser-stored access token.
    /// </summary>
    public async Task FinishManualAsync(string userId, string pastedUrl, CancellationToken cancel)
    {
        var user = UserId(userId);
        if (string.IsNullOrWhiteSpace(pastedUrl) || pastedUrl.Length > 8192
            || !Uri.TryCreate(pastedUrl.Trim(), UriKind.Absolute, out var pasted))
            throw new ArgumentException("Wklej pełny adres localhost z parametrami code i state.");
        var (_, _, redirect) = Settings();
        if (!ManualRedirect(redirect)
            || !string.Equals(pasted.GetLeftPart(UriPartial.Path),
                new Uri(redirect).GetLeftPart(UriPartial.Path), StringComparison.OrdinalIgnoreCase)
            || !string.IsNullOrEmpty(pasted.Fragment)
            || !string.IsNullOrWhiteSpace(pasted.UserInfo))
            throw new ArgumentException("Adres nie odpowiada callbackowi localhost skonfigurowanemu dla MAL.");
        var query = QueryHelpers.ParseQuery(pasted.Query);
        if (!query.TryGetValue("code", out var codes) || codes.Count != 1
            || !query.TryGetValue("state", out var states) || states.Count != 1)
            throw new ArgumentException("W adresie brak jednorazowego kodu MAL lub parametru state.");
        await FinishCoreAsync(codes.ToString(), states.ToString(), user, manual: true, cancel)
            .ConfigureAwait(false);
    }

    private async Task FinishCoreAsync(string code, string state, string? expectedUser, bool manual,
        CancellationToken cancel)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state)
            || !Pending.TryGetValue(state, out var pending) || pending.Expires < DateTimeOffset.UtcNow
            || (expectedUser is not null && pending.UserId != expectedUser)
            || ManualRedirect(pending.Redirect) != manual)
            throw new InvalidOperationException("Sesja logowania MAL jest nieprawidłowa lub wygasła. Rozpocznij nowe połączenie.");
        var (_, _, currentRedirect) = Settings();
        if (!string.Equals(currentRedirect, pending.Redirect, StringComparison.Ordinal))
            throw new InvalidOperationException("Callback MAL zmienił się w trakcie logowania. Rozpocznij ponownie.");
        // One-time state consumption. The verifier never leaves the NAS.
        if (!Pending.TryRemove(state, out pending))
            throw new InvalidOperationException("Ten kod MAL został już wykorzystany.");
        var (id, secret, redirect) = Settings();
        var fields = new Dictionary<string, string> {
            ["client_id"] = id, ["grant_type"] = "authorization_code", ["code"] = code,
            ["redirect_uri"] = redirect, ["code_verifier"] = pending.Verifier
        };
        if (!string.IsNullOrWhiteSpace(secret)) fields["client_secret"] = secret;
        var token = await ExchangeAsync(fields, cancel).ConfigureAwait(false);
        var identity = await IdentifyAsync(token.AccessToken, cancel).ConfigureAwait(false);
        if (identity.Id <= 0 || string.IsNullOrWhiteSpace(identity.Username))
            throw new InvalidOperationException("Nie można potwierdzić tożsamości połączonego konta MAL.");

        await AccountLinkGate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            // Important: two OAuth callbacks arriving at the same time cannot claim the same MAL ID.
            await EnsureAccountNotLinkedElsewhereAsync(pending.UserId, identity.Id, cancel).ConfigureAwait(false);
            var listGate = ListLock(pending.UserId);
            await listGate.WaitAsync(cancel).ConfigureAwait(false);
            try
            {
                var gate = TokenLock(pending.UserId);
                await gate.WaitAsync(cancel).ConfigureAwait(false);
                try
                {
                    await WriteTokenAsync(pending.UserId, token with {
                        MalUserId = identity.Id, MalUsername = identity.Username
                    }, cancel).ConfigureAwait(false);
                }
                finally { gate.Release(); }
                ListCache.TryRemove(pending.UserId, out _);
                ClearItemCache(pending.UserId);
            }
            finally { listGate.Release(); }
        }
        finally { AccountLinkGate.Release(); }
    }

    private async Task EnsureAccountNotLinkedElsewhereAsync(string user, int malId, CancellationToken cancel)
    {
        if (!Directory.Exists(_folder)) return;
        foreach (var path in Directory.EnumerateFiles(_folder, "*.json"))
        {
            var otherUser = Path.GetFileNameWithoutExtension(path);
            if (string.Equals(otherUser, user, StringComparison.Ordinal)) continue;
            if (!Guid.TryParseExact(otherUser, "N", out _)) continue;
            var token = await ReadTokenAsync(otherUser, cancel).ConfigureAwait(false);
            if (token is null) continue;
            if (token.MalUserId <= 0)
            {
                // Migrate older v0.4.3 connections BEFORE enforcing the one-user-one-MAL rule.
                var connection = await GetConnectionAsync(otherUser, cancel).ConfigureAwait(false);
                if (connection.MalUserId == malId)
                    throw new InvalidOperationException("To konto MAL jest już przypisane do innego użytkownika Jellyfin.");
            }
            else if (token.MalUserId == malId)
                throw new InvalidOperationException("To konto MAL jest już przypisane do innego użytkownika Jellyfin.");
        }
    }

    private async Task<TokenRecord> ExchangeAsync(Dictionary<string, string> values, CancellationToken cancel)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, TokenUrl);
        request.Content = new FormUrlEncodedContent(values);
        using var response = await _client.SendAsync(request, cancel).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(cancel).ConfigureAwait(false);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancel).ConfigureAwait(false);
        var root = doc.RootElement;
        var access = root.GetProperty("access_token").GetString() ?? throw new InvalidOperationException("Brak tokenu MAL");
        var refresh = root.GetProperty("refresh_token").GetString() ?? throw new InvalidOperationException("Brak tokenu odświeżania MAL");
        var lifetime = root.GetProperty("expires_in").GetInt32();
        if (lifetime <= 0) throw new InvalidOperationException("Token MAL bez terminu ważności");
        return new TokenRecord(access, refresh, DateTimeOffset.UtcNow.AddSeconds(lifetime));
    }

    private async Task WriteTokenAsync(string userId, TokenRecord token, CancellationToken cancel)
    {
        Directory.CreateDirectory(_folder);
        if (OperatingSystem.IsLinux())
            (new DirectoryInfo(_folder)).UnixFileMode = UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute;
        var filename = TokenPath(userId);
        var temp = filename + "." + RandomUrlSafe(6) + ".tmp";
        try
        {
            await File.WriteAllTextAsync(temp, JsonSerializer.Serialize(token), cancel).ConfigureAwait(false);
            if (OperatingSystem.IsLinux()) File.SetUnixFileMode(temp, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            File.Move(temp, filename, true); // atomic replacement, no partial credentials on crash
        }
        finally { if (File.Exists(temp)) File.Delete(temp); }
    }

    private async Task<TokenRecord?> ReadTokenAsync(string userId, CancellationToken cancel)
    {
        var path = TokenPath(userId);
        if (!File.Exists(path)) return null;
        return JsonSerializer.Deserialize<TokenRecord>(await File.ReadAllTextAsync(path, cancel).ConfigureAwait(false));
    }

    public bool Connected(string userId) => File.Exists(TokenPath(userId));

    public async Task<MalConnection> GetConnectionAsync(string userId, CancellationToken cancel, bool refreshProfile = false)
    {
        var user = UserId(userId);
        var token = await ReadTokenAsync(user, cancel).ConfigureAwait(false);
        if (token is null) return new MalConnection(false, null, null);
        if (!refreshProfile && token.MalUserId > 0 && !string.IsNullOrWhiteSpace(token.MalUsername))
            return new MalConnection(true, token.MalUserId, token.MalUsername);
        var access = await AccessAsync(user, cancel).ConfigureAwait(false);
        if (access is null) return new MalConnection(false, null, null);
        var identity = await IdentifyAsync(access, cancel).ConfigureAwait(false);
        var gate = TokenLock(user);
        await gate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            // Re-read to preserve new refresh tokens written by a simultaneous request.
            var latest = await ReadTokenAsync(user, cancel).ConfigureAwait(false);
            if (latest is null) return new MalConnection(false, null, null);
            // Another OAuth callback may have connected a DIFFERENT account while /users/@me was in flight.
            if (latest.AccessToken != access && latest.MalUserId > 0)
                return new MalConnection(true, latest.MalUserId, latest.MalUsername);
            await WriteTokenAsync(user, latest with { MalUserId = identity.Id, MalUsername = identity.Username }, cancel)
                .ConfigureAwait(false);
        }
        finally { gate.Release(); }
        return new MalConnection(true, identity.Id, identity.Username);
    }

    public async Task DisconnectAsync(string userId, CancellationToken cancel)
    {
        var user = UserId(userId);
        var listGate = ListLock(user);
        await listGate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var gate = TokenLock(user);
            await gate.WaitAsync(cancel).ConfigureAwait(false);
            try
            {
                var path = TokenPath(user);
                if (File.Exists(path)) File.Delete(path);
                ListCache.TryRemove(user, out _);
                ClearItemCache(user);
            }
            finally { gate.Release(); }
        }
        finally { listGate.Release(); }
    }

    private async Task<string?> AccessAsync(string userId, CancellationToken cancel)
    {
        var user = UserId(userId);
        var gate = TokenLock(user);
        await gate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var token = await ReadTokenAsync(user, cancel).ConfigureAwait(false);
            if (token is null) return null;
            if (token.Expires > DateTimeOffset.UtcNow.AddSeconds(60)) return token.AccessToken;
            var (id, secret, _) = Settings();
            var fields = new Dictionary<string, string> {
                ["client_id"] = id, ["grant_type"] = "refresh_token", ["refresh_token"] = token.RefreshToken
            };
            if (!string.IsNullOrWhiteSpace(secret)) fields["client_secret"] = secret;
            var renewed = await ExchangeAsync(fields, cancel).ConfigureAwait(false);
            await WriteTokenAsync(user, renewed with {
                MalUserId = token.MalUserId, MalUsername = token.MalUsername
            }, cancel).ConfigureAwait(false);
            return renewed.AccessToken;
        }
        finally { gate.Release(); }
    }

    public sealed record BackgroundRefreshResult(int Linked, int Renewed, int Failed);

    /// <summary>
    /// Runs even when no Jellyfin user is online. Refreshes expiring credentials (including
    /// the rotating refresh token) a week early; one failed account cannot block another.
    /// Each account has its own lock, shared with interactive reads, writes, and relinks.
    /// </summary>
    public async Task<BackgroundRefreshResult> RefreshInactiveAccountsAsync(CancellationToken cancel)
    {
        if (!Directory.Exists(_folder)) return new BackgroundRefreshResult(0, 0, 0);
        if (string.IsNullOrWhiteSpace(Plugin.Instance?.Configuration.MalClientId))
            return new BackgroundRefreshResult(0, 0, 0);
        var linked = 0;
        var renewed = 0;
        var failed = 0;
        foreach (var path in Directory.EnumerateFiles(_folder, "*.json").ToArray())
        {
            cancel.ThrowIfCancellationRequested();
            var user = Path.GetFileNameWithoutExtension(path);
            if (!Guid.TryParseExact(user, "N", out _)) continue;
            linked++;
            try
            {
                var gate = TokenLock(user);
                await gate.WaitAsync(cancel).ConfigureAwait(false);
                try
                {
                    var token = await ReadTokenAsync(user, cancel).ConfigureAwait(false);
                    if (token is null || token.Expires > DateTimeOffset.UtcNow.AddDays(7)) continue;
                    var (id, secret, _) = Settings();
                    var fields = new Dictionary<string, string> {
                        ["client_id"] = id,
                        ["grant_type"] = "refresh_token",
                        ["refresh_token"] = token.RefreshToken
                    };
                    if (!string.IsNullOrWhiteSpace(secret)) fields["client_secret"] = secret;
                    var next = await ExchangeAsync(fields, cancel).ConfigureAwait(false);
                    // Token files are atomically replaced before proceeding to the next user.
                    await WriteTokenAsync(user, next with {
                        MalUserId = token.MalUserId, MalUsername = token.MalUsername
                    }, cancel).ConfigureAwait(false);
                    renewed++;
                }
                finally { gate.Release(); }
            }
            catch (OperationCanceledException) when (cancel.IsCancellationRequested) { throw; }
            catch (Exception e) when (e is HttpRequestException or IOException
                 or JsonException or InvalidOperationException or UnauthorizedAccessException)
            {
                failed++; // Do not log access tokens, refresh tokens, redirect URLs or secrets.
            }
        }
        return new BackgroundRefreshResult(linked, renewed, failed);
    }

    private async Task<MalIdentity> IdentifyAsync(string accessToken, CancellationToken cancel)
    {
        using var doc = await SendJsonAsync(HttpMethod.Get, "users/@me", accessToken, null, cancel)
            .ConfigureAwait(false);
        var root = doc.RootElement;
        var id = root.GetProperty("id").GetInt32();
        var name = root.GetProperty("name").GetString() ?? "";
        return new MalIdentity(id, name);
    }

    private async Task<JsonDocument> SendJsonAsync(HttpMethod method, string path, string token,
        Dictionary<string, string>? values, CancellationToken cancel)
    {
        // All outgoing requests use the fixed official MAL domain, never a URL supplied by the browser.
        using var request = new HttpRequestMessage(method, new Uri(new Uri(ApiUrl), path));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        if (values is not null) request.Content = new FormUrlEncodedContent(values);
        using var response = await _client.SendAsync(request, cancel).ConfigureAwait(false);
        if (response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.Unauthorized)
            throw new UnauthorizedAccessException("MAL odmówił dostępu. Połącz swoje konto ponownie.");
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(cancel).ConfigureAwait(false);
        return await JsonDocument.ParseAsync(stream, cancellationToken: cancel).ConfigureAwait(false);
    }

    public async Task<Dictionary<int, MalEntry>> ReadAllAsync(string userId, bool refresh, CancellationToken cancel)
    {
        var user = UserId(userId);
        if (!refresh && ListCache.TryGetValue(user, out var entry) && entry.Expires > DateTimeOffset.UtcNow)
            return entry.Entries;
        var gate = ListLock(user);
        await gate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            if (!refresh && ListCache.TryGetValue(user, out entry) && entry.Expires > DateTimeOffset.UtcNow)
                return entry.Entries;
            var token = await AccessAsync(user, cancel).ConfigureAwait(false);
            if (token is null) return new();
            var entries = new Dictionary<int, MalEntry>();
            const int batch = 1000;
            for (var offset = 0; offset < 20000; offset += batch)
            {
                using var doc = await SendJsonAsync(HttpMethod.Get,
                    $"users/@me/animelist?fields=list_status&limit={batch}&offset={offset}", token, null, cancel)
                    .ConfigureAwait(false);
                var data = doc.RootElement.GetProperty("data");
                foreach (var obj in data.EnumerateArray())
                {
                    if (!obj.TryGetProperty("node", out var node)
                        || !node.TryGetProperty("id", out var idEl) || !idEl.TryGetInt32(out var id)) continue;
                    if (!obj.TryGetProperty("list_status", out var status)) continue;
                    entries[id] = ReadEntry(id, status);
                }
                if (data.GetArrayLength() < batch) break;
                await Task.Delay(1200, cancel).ConfigureAwait(false);
            }
            ListCache[user] = new CachedList(DateTimeOffset.UtcNow.AddMinutes(3), entries);
            return entries;
        }
        finally { gate.Release(); }
    }

    /// <summary>
    /// Read the complete, authenticated status for ONE MAL anime. Unlike the paged
    /// user list, /anime/{id}?fields=my_list_status includes advanced counters.
    /// Uses the same per-user lock as writes and keeps a one-hour cache; refresh
    /// bypasses it only when explicitly requested by the user.
    /// </summary>
    public async Task<MalEntry?> ReadItemAsync(string userId, int malId, bool refresh, CancellationToken cancel)
    {
        var user = UserId(userId);
        if (malId <= 0) throw new ArgumentOutOfRangeException(nameof(malId));
        var key = ItemCacheKey(user, malId);
        if (!refresh && ItemCache.TryGetValue(key, out var hit) && hit.Expires > DateTimeOffset.UtcNow)
            return hit.Entry;
        var gate = ListLock(user);
        await gate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            if (!refresh && ItemCache.TryGetValue(key, out hit) && hit.Expires > DateTimeOffset.UtcNow)
                return hit.Entry;
            var access = await AccessAsync(user, cancel).ConfigureAwait(false);
            if (access is null) return null;
            // MAL can omit num_times_rewatched when only my_list_status is requested.
            // The 0.4.38 diagnostics confirmed that the explicit nested selector
            // returns the real rewatch count (e.g. MAL 1195 -> 6). Do not replace
            // a missing value with zero and do not scrape the HTML website.
            var requested = Uri.EscapeDataString(
                "my_list_status{status,score,num_episodes_watched,num_times_rewatched,is_rewatching}");
            using var doc = await SendJsonAsync(HttpMethod.Get,
                $"anime/{malId}?fields={requested}", access, null, cancel).ConfigureAwait(false);
            var root = doc.RootElement;
            MalEntry? result = null;
            if (root.TryGetProperty("my_list_status", out var status) && status.ValueKind == JsonValueKind.Object)
                result = ReadEntry(malId, status);
            ItemCache[key] = new CachedItem(DateTimeOffset.UtcNow.AddHours(1), result);
            return result;
        }
        finally { gate.Release(); }
    }

    /// <summary>
    /// On-demand read-only MAL diagnostics for ONE authorized anime. Called only by
    /// an explicit click in the detail UI; max two GET requests and one result per
    /// user/title per 45 seconds. No token, user ID, full response or notes leave
    /// the server. The normal cached read path is not mutated by these probes.
    /// </summary>
    public async Task<object> DiagnoseItemAsync(string userId, int malId, CancellationToken cancel)
    {
        var user = UserId(userId);
        if (malId <= 0) throw new ArgumentOutOfRangeException(nameof(malId));
        var key = ItemCacheKey(user, malId);
        if (Diagnostics.TryGetValue(key, out var old) && old.Expires > DateTimeOffset.UtcNow)
            return old.Result;
        var gate = ListLock(user);
        await gate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            if (Diagnostics.TryGetValue(key, out old) && old.Expires > DateTimeOffset.UtcNow)
                return old.Result;
            var access = await AccessAsync(user, cancel).ConfigureAwait(false)
                ?? throw new InvalidOperationException("MAL nie jest połączony");
            var hasItemCache = ItemCache.TryGetValue(key, out var itemHit);
            var item = hasItemCache ? itemHit!.Entry : null;
            var itemCache = new
            {
                present = hasItemCache,
                valid = hasItemCache && itemHit!.Expires > DateTimeOffset.UtcNow,
                watchedEpisodes = item?.episodes_watched,
                timesRewatched = item?.times_rewatched
            };
            var probes = new List<object>();
            probes.Add(await ProbeItemStatusAsync(access, malId,
                "standard", $"anime/{malId}?fields=my_list_status", cancel).ConfigureAwait(false));
            // Nested field selector is an independent probe: if MAL rejects it,
            // display HTTP status without disrupting the working standard reader.
            var requested = Uri.EscapeDataString(
                "my_list_status{status,score,num_episodes_watched,num_times_rewatched,is_rewatching}");
            probes.Add(await ProbeItemStatusAsync(access, malId,
                "explicit_fields", $"anime/{malId}?fields={requested}", cancel).ConfigureAwait(false));
            object result = new
            {
                malId,
                generatedUtc = DateTimeOffset.UtcNow.ToString("O", CultureInfo.InvariantCulture),
                itemCache,
                probes,
                note = "GET tylko dla wskazanego anime. Brak pola nie oznacza zera. Nie ujawnia tokenów ani surowego JSON."
            };
            Diagnostics[key] = new CachedDiagnostic(DateTimeOffset.UtcNow.AddSeconds(45), result);
            return result;
        }
        finally { gate.Release(); }
    }

    private async Task<object> ProbeItemStatusAsync(string access, int malId, string stage,
        string path, CancellationToken cancel)
    {
        var watch = Stopwatch.StartNew();
        try
        {
            using var doc = await SendJsonAsync(HttpMethod.Get, path, access, null, cancel)
                .ConfigureAwait(false);
            watch.Stop();
            var root = doc.RootElement;
            var exists = root.TryGetProperty("my_list_status", out var value)
                && value.ValueKind == JsonValueKind.Object;
            if (!exists)
                return new { stage, httpStatus = 200, elapsedMs = watch.ElapsedMilliseconds,
                    listStatusPresent = false, fieldNames = Array.Empty<string>(),
                    episodes = (int?)null, rewatches = (int?)null,
                    episodesFieldPresent = false, rewatchesFieldPresent = false,
                    status = (string?)null, score = (int?)null, error = (string?)null };
            var allowed = new HashSet<string>(StringComparer.Ordinal)
            {
                "status", "score", "num_episodes_watched", "num_times_rewatched",
                "is_rewatching", "updated_at", "rewatch_value", "priority"
            };
            var names = value.EnumerateObject().Select(p => p.Name)
                .Where(allowed.Contains).OrderBy(n => n, StringComparer.Ordinal).ToArray();
            var parsed = ReadEntry(malId, value);
            return new { stage, httpStatus = 200, elapsedMs = watch.ElapsedMilliseconds,
                listStatusPresent = true, fieldNames = names,
                episodes = parsed.episodes_watched, rewatches = parsed.times_rewatched,
                episodesFieldPresent = value.TryGetProperty("num_episodes_watched", out _),
                rewatchesFieldPresent = value.TryGetProperty("num_times_rewatched", out _),
                status = (string?)parsed.status, score = (int?)parsed.score, error = (string?)null };
        }
        catch (HttpRequestException ex)
        {
            watch.Stop();
            return new { stage, httpStatus = (int?)ex.StatusCode, elapsedMs = watch.ElapsedMilliseconds,
                listStatusPresent = false, fieldNames = Array.Empty<string>(),
                episodes = (int?)null, rewatches = (int?)null,
                episodesFieldPresent = false, rewatchesFieldPresent = false,
                status = (string?)null, score = (int?)null,
                error = "MAL odrzucił żądanie GET (bez treści odpowiedzi)" };
        }
    }

    public async Task<MalEntry> UpdateAsync(string userId, int malId, MalUpdate value, CancellationToken cancel)
    {
        if (malId <= 0) throw new ArgumentOutOfRangeException(nameof(malId));
        if (value.Score.HasValue && (value.Score < 0 || value.Score > 10))
            throw new ArgumentOutOfRangeException(nameof(value.Score));
        if (value.TimesRewatched.HasValue && (value.TimesRewatched < 0 || value.TimesRewatched > 10000))
            throw new ArgumentOutOfRangeException(nameof(value.TimesRewatched));
        if (value.EpisodesWatched.HasValue && (value.EpisodesWatched < 0 || value.EpisodesWatched > 10000))
            throw new ArgumentOutOfRangeException(nameof(value.EpisodesWatched));
        var allowed = new[] { "watching", "completed", "on_hold", "dropped", "plan_to_watch" };
        if (value.Status is not null && !allowed.Contains(value.Status, StringComparer.Ordinal))
            throw new ArgumentException("Nieznany status MAL");
        var fields = new Dictionary<string, string>();
        if (value.Score.HasValue) fields["score"] = value.Score.Value.ToString(CultureInfo.InvariantCulture);
        if (value.Status is not null) fields["status"] = value.Status;
        if (value.TimesRewatched.HasValue)
            fields["num_times_rewatched"] = value.TimesRewatched.Value.ToString(CultureInfo.InvariantCulture);
        if (value.EpisodesWatched.HasValue)
            fields["num_watched_episodes"] = value.EpisodesWatched.Value.ToString(CultureInfo.InvariantCulture);
        if (fields.Count == 0) throw new ArgumentException("Brak zmian do zapisania");
        var user = UserId(userId);
        // Writes, disconnect and relink are ordered for this one user only.
        var gate = ListLock(user);
        MalEntry updated;
        await gate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var token = await AccessAsync(user, cancel).ConfigureAwait(false)
                ?? throw new InvalidOperationException("Połącz własne konto MAL przed zapisem");
            using var doc = await SendJsonAsync(HttpMethod.Patch,
                $"anime/{malId}/my_list_status", token, fields, cancel).ConfigureAwait(false);
            updated = ReadEntry(malId, doc.RootElement);
            ListCache.TryRemove(user, out _);
            ItemCache.TryRemove(ItemCacheKey(user, malId), out _);
        }
        finally { gate.Release(); }
        // PATCH is already committed. If the follow-up read fails, never report
        // the successful write as failed, and never invent missing counters.
        try { return await ReadItemAsync(user, malId, refresh: true, cancel: cancel).ConfigureAwait(false) ?? updated; }
        catch (HttpRequestException) { return updated; }
    }

    private static MalEntry ReadEntry(int id, JsonElement e)
    {
        static int Int(JsonElement x, string key) => x.TryGetProperty(key, out var v) && v.TryGetInt32(out var n) ? n : 0;
        static int? OptionalCount(JsonElement x, string key) =>
            x.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.Number &&
            v.TryGetInt32(out var n) && n >= 0 ? n : null;
        static string Str(JsonElement x, string key) => x.TryGetProperty(key, out var v) ? v.GetString() ?? "" : "";
        return new MalEntry(id, Str(e, "status"), Int(e, "score"),
            OptionalCount(e, "num_episodes_watched"), OptionalCount(e, "num_times_rewatched"));
    }
}

public sealed record MalEntry(int mal_id, string status, int score, int? episodes_watched, int? times_rewatched);
public sealed record MalUpdate(string? Status, int? Score, int? EpisodesWatched, int? TimesRewatched);