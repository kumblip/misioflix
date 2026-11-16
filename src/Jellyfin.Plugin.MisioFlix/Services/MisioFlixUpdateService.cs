using System.Collections.Generic;
using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// Read-only update discovery for this plugin, independent of Jellyfin's own
/// plugin catalog cache. NEVER installs packages or edits plugin DLLs.
/// </summary>
public sealed class MisioFlixUpdateService : BackgroundService
{
    private const string GitHubUrl = "https://api.github.com/repos/kumblip/misioflix/releases/latest";
    private const string ManifestUrl = "https://raw.githubusercontent.com/kumblip/misioflix/main/manifest.json";
    public const string ManifestRepositoryUrl = ManifestUrl;
    private const string PluginGuid = "97d15b37-b868-492b-83da-eb67b16a0d44";
    private static readonly TimeSpan Period = TimeSpan.FromMinutes(15);
    private static readonly Regex VersionPattern = new(@"^v?(\d+\.\d+\.\d+(?:\.\d+)?)$", RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    private readonly IHttpClientFactory _clients;
    private readonly ILogger<MisioFlixUpdateService> _logger;
    private readonly SemaphoreSlim _sync = new(1, 1);
    private UpdateSnapshot? _snapshot;

    public MisioFlixUpdateService(IHttpClientFactory clients, ILogger<MisioFlixUpdateService> logger)
    {
        _clients = clients;
        _logger = logger;
    }

    public record UpdateSnapshot(
        string InstalledVersion,
        string? GitHubVersion,
        string? GitHubReleaseUrl,
        string? RepositoryVersion,
        string? RepositoryTargetAbi,
        string RepositoryUrl,
        DateTimeOffset CheckedAt,
        string? GitHubError,
        string? RepositoryError);

    public async Task<UpdateSnapshot> StatusAsync(bool force, CancellationToken cancel)
    {
        var current = _snapshot;
        if (!force && current is not null && DateTimeOffset.UtcNow - current.CheckedAt < Period)
            return current;

        await _sync.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            current = _snapshot;
            if (!force && current is not null && DateTimeOffset.UtcNow - current.CheckedAt < Period)
                return current;
            var github = await ReadLatestReleaseAsync(cancel).ConfigureAwait(false);
            var repository = await ReadRepositoryAsync(force, cancel).ConfigureAwait(false);
            var installed = typeof(Plugin).Assembly.GetName().Version?.ToString() ?? "nieznana";
            var snapshot = new UpdateSnapshot(installed, github.version, github.url,
                repository.version, repository.abi, ManifestUrl, DateTimeOffset.UtcNow,
                github.error, repository.error);
            _snapshot = snapshot;
            return snapshot;
        }
        finally { _sync.Release(); }
    }

    private static string? NormalizeVersion(string? candidate)
    {
        var match = VersionPattern.Match((candidate ?? string.Empty).Trim());
        return match.Success ? match.Groups[1].Value : null;
    }

    private async Task<(string? version, string? url, string? error)> ReadLatestReleaseAsync(CancellationToken cancel)
    {
        try
        {
            using var response = await RequestAsync(GitHubUrl, "application/vnd.github+json", cancel).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode) return (null, null, "GitHub: HTTP " + (int)response.StatusCode);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(cancel).ConfigureAwait(false));
            var root = doc.RootElement;
            var raw = root.GetProperty("tag_name").GetString();
            var version = NormalizeVersion(raw);
            if (version is null) return (null, null, "GitHub zwrócił nieprawidłową wersję Release.");
            var url = root.TryGetProperty("html_url", out var page) ? page.GetString() : null;
            if (url is null || !url.StartsWith("https://github.com/kumblip/misioflix/releases/tag/", StringComparison.OrdinalIgnoreCase))
                url = "https://github.com/kumblip/misioflix/releases";
            return (version, url, null);
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or InvalidOperationException or TaskCanceledException or KeyNotFoundException)
        { return (null, null, "Nie udało się odczytać GitHub Release: " + ex.GetType().Name); }
    }

    private async Task<(string? version, string? abi, string? error)> ReadRepositoryAsync(bool force, CancellationToken cancel)
    {
        try
        {
            // A fresh URL bypasses the upstream CDN's cached copy when requested by an admin.
            var url = force ? ManifestUrl + "?mf_refresh=" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(System.Globalization.CultureInfo.InvariantCulture) : ManifestUrl;
            using var response = await RequestAsync(url, "application/json", cancel).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode) return (null, null, "Manifest: HTTP " + (int)response.StatusCode);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(cancel).ConfigureAwait(false));
            if (doc.RootElement.ValueKind != JsonValueKind.Array)
                return (null, null, "Manifest nie jest listą pakietów Jellyfin.");
            Version? best = null;
            string? bestText = null;
            string? bestAbi = null;
            foreach (var package in doc.RootElement.EnumerateArray())
            {
                if (package.ValueKind != JsonValueKind.Object ||
                    !package.TryGetProperty("guid", out var guid) ||
                    !string.Equals(guid.GetString(), PluginGuid, StringComparison.OrdinalIgnoreCase) ||
                    !package.TryGetProperty("versions", out var versions) || versions.ValueKind != JsonValueKind.Array)
                    continue;
                foreach (var entry in versions.EnumerateArray())
                {
                    if (!entry.TryGetProperty("version", out var rawVersion)) continue;
                    var vText = NormalizeVersion(rawVersion.GetString());
                    if (vText is null || !Version.TryParse(vText, out var v)) continue;
                    if (!entry.TryGetProperty("sourceUrl", out var source)) continue;
                    var sourceUrl = source.GetString();
                    if (sourceUrl is null || !sourceUrl.StartsWith("https://github.com/kumblip/misioflix/releases/download/", StringComparison.OrdinalIgnoreCase))
                        continue;
                    if (best is not null && v.CompareTo(best) <= 0) continue;
                    best = v;
                    bestText = vText;
                    bestAbi = entry.TryGetProperty("targetAbi", out var abi) ? abi.GetString() : null;
                }
            }
            if (best is null) return (null, null, "Brak prawidłowej wersji MisioFlix w manifeście.");
            return (bestText, bestAbi, null);
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or InvalidOperationException or TaskCanceledException)
        { return (null, null, "Nie udało się odczytać manifestu: " + ex.GetType().Name); }
    }

    private async Task<HttpResponseMessage> RequestAsync(string url, string accept, CancellationToken cancel)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.UserAgent.ParseAdd("MisioFlix-Jellyfin/0.4.79");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue(accept));
        request.Headers.CacheControl = new CacheControlHeaderValue { NoCache = true, NoStore = true };
        return await _clients.CreateClient("MisioFlixUpdates").SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancel).ConfigureAwait(false);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Initial read + periodic server-side refresh, not dependent on an open browser.
        while (!stoppingToken.IsCancellationRequested)
        {
            if (Plugin.Instance?.Configuration.AutoCheckUpdates != false)
            {
                try { await StatusAsync(false, stoppingToken).ConfigureAwait(false); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
                catch (Exception ex) { _logger.LogWarning(ex, "MisioFlix: update discovery failed"); }
            }
            try { await Task.Delay(Period, stoppingToken).ConfigureAwait(false); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
        }
    }
}
