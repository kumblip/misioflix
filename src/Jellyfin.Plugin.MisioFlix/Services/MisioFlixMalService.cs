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
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
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

    private sealed record AuthPending(string UserId, string Verifier, DateTimeOffset Expires);
    // Optional trailing properties migrate v0.4.3 token files without losing access or refresh tokens.
    private sealed record TokenRecord(string AccessToken, string RefreshToken, DateTimeOffset Expires,
        int MalUserId = 0, string MalUsername = "");
    private sealed record MalIdentity(int Id, string Username);
    private sealed record CachedList(DateTimeOffset Expires, Dictionary<int, MalEntry> Entries);
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
    private static string RandomUrlSafe(int bytes) => Convert.ToBase64String(RandomNumberGenerator.GetBytes(bytes))
        .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static (string clientId, string secret, string redirect) Settings()
    {
        var c = Plugin.Instance?.Configuration ?? throw new InvalidOperationException("Brak konfiguracji MisioFlix");
        var clientId = (c.MalClientId ?? "").Trim();
        var redirect = (c.MalRedirectUri ?? "").Trim();
        if (string.IsNullOrWhiteSpace(clientId) || !Uri.TryCreate(redirect, UriKind.Absolute, out var u)
            || !u.AbsolutePath.EndsWith("/MisioFlix/api/mal/callback", StringComparison.OrdinalIgnoreCase)
            || (u.Scheme != "https" && !(u.Scheme == "http" && (u.IsLoopback || u.Host.IndexOf('.') < 0))))
            throw new InvalidOperationException("Administrator musi ustawić wspólny MAL Client ID i poprawny callback. Poza LAN wymagane jest HTTPS.");
        return (clientId, c.MalClientSecret ?? "", redirect);
    }

    private static string Query(IDictionary<string, string> values) => string.Join("&", values.Select(kv =>
        Uri.EscapeDataString(kv.Key) + "=" + Uri.EscapeDataString(kv.Value)));

    public (string url, string message) Start(string userId)
    {
        var (id, _, redirect) = Settings();
        foreach (var kv in Pending.Where(kv => kv.Value.Expires < DateTimeOffset.UtcNow).ToArray())
            Pending.TryRemove(kv.Key, out _);
        if (Pending.Count > 1000) throw new InvalidOperationException("Zbyt wiele prób łączenia MAL. Spróbuj ponownie.");
        var state = RandomUrlSafe(32);
        // MAL officially supports PKCE plain; S256 is not supported by this provider.
        var verifier = RandomUrlSafe(48);
        Pending[state] = new AuthPending(UserId(userId), verifier, DateTimeOffset.UtcNow.AddMinutes(10));
        var parameters = new Dictionary<string, string> {
            ["response_type"] = "code", ["client_id"] = id, ["redirect_uri"] = redirect,
            ["code_challenge"] = verifier, ["code_challenge_method"] = "plain", ["state"] = state
        };
        return (AuthorizeUrl + "?" + Query(parameters),
            "Po udzieleniu dostępu wróć do MisioFlix i wybierz Odśwież MAL.");
    }

    public async Task FinishAsync(string code, string state, CancellationToken cancel)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state)
            || !Pending.TryRemove(state, out var pending) || pending.Expires < DateTimeOffset.UtcNow)
            throw new InvalidOperationException("Sesja łączenia MAL wygasła albo jest nieprawidłowa.");
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
        await gate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var token = await AccessAsync(user, cancel).ConfigureAwait(false)
                ?? throw new InvalidOperationException("Połącz własne konto MAL przed zapisem");
            using var doc = await SendJsonAsync(HttpMethod.Patch,
                $"anime/{malId}/my_list_status", token, fields, cancel).ConfigureAwait(false);
            ListCache.TryRemove(user, out _);
            return ReadEntry(malId, doc.RootElement);
        }
        finally { gate.Release(); }
    }

    private static MalEntry ReadEntry(int id, JsonElement e)
    {
        static int Int(JsonElement x, string key) => x.TryGetProperty(key, out var v) && v.TryGetInt32(out var n) ? n : 0;
        static string Str(JsonElement x, string key) => x.TryGetProperty(key, out var v) ? v.GetString() ?? "" : "";
        return new MalEntry(id, Str(e, "status"), Int(e, "score"),
            Int(e, "num_episodes_watched"), Int(e, "num_times_rewatched"));
    }
}

public sealed record MalEntry(int mal_id, string status, int score, int episodes_watched, int times_rewatched);
public sealed record MalUpdate(string? Status, int? Score, int? EpisodesWatched, int? TimesRewatched);
