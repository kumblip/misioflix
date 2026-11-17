using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Updates;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Model.Updates;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// Administrator-only refresh of Jellyfin's real repository configuration.
/// Jellyfin 12.4 has no local package-catalog file: InstallationManager obtains
/// packages directly from configured repository URLs. Use a Git commit-pinned
/// manifest to eliminate staleness of the moving raw.githubusercontent.com/main URL.
/// Do not download or replace plugin binaries here.
/// </summary>
public sealed class MisioFlixNativeCatalogRefreshService
{
    private const string Canonical = "https://raw.githubusercontent.com/kumblip/misioflix/main/manifest.json";
    private const string CommitApi = "https://api.github.com/repos/kumblip/misioflix/commits/main";
    private const string RawPrefix = "https://raw.githubusercontent.com/kumblip/misioflix/";
    private const string DownloadPrefix = "https://github.com/kumblip/misioflix/releases/download/";
    private static readonly Guid PluginGuid = Guid.Parse("97d15b37-b868-492b-83da-eb67b16a0d44");
    private static readonly Regex ShaPattern = new("^[a-fA-F0-9]{40}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private readonly IInstallationManager _install;
    private readonly IServerConfigurationManager _server;
    private readonly IHttpClientFactory _clients;
    private readonly ILogger<MisioFlixNativeCatalogRefreshService> _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public MisioFlixNativeCatalogRefreshService(
        IInstallationManager install,
        IServerConfigurationManager server,
        IHttpClientFactory clients,
        ILogger<MisioFlixNativeCatalogRefreshService> logger)
    {
        _install = install;
        _server = server;
        _clients = clients;
        _logger = logger;
    }

    public sealed record NativeRefreshResult(
        string RepositoryVersion,
        string RepositoryTargetAbi,
        string RepositoryUrl,
        bool Updated,
        bool VerifiedByJellyfin);

    public static bool IsOwnRepository(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return false;
        var clean = url.Split('?', '#')[0].TrimEnd('/');
        if (string.Equals(clean, Canonical, StringComparison.OrdinalIgnoreCase)) return true;
        if (!clean.StartsWith(RawPrefix, StringComparison.OrdinalIgnoreCase) ||
            !clean.EndsWith("/manifest.json", StringComparison.OrdinalIgnoreCase)) return false;
        var commit = clean.Substring(RawPrefix.Length, clean.Length - RawPrefix.Length - "/manifest.json".Length);
        return ShaPattern.IsMatch(commit);
    }

    public async Task<NativeRefreshResult> RefreshAsync(CancellationToken cancel)
    {
        await _gate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var repositories = _server.Configuration.PluginRepositories;
            var original = repositories?.Select(r => new RepositoryInfo {
                Name = r.Name, Url = r.Url, Enabled = r.Enabled
            }).ToArray() ?? Array.Empty<RepositoryInfo>();
            var matching = original.Select((r, i) => (r, i)).Where(x => IsOwnRepository(x.r.Url)).ToArray();
            if (matching.Length != 1)
                throw new InvalidOperationException("Jellyfin musi mieć dokładnie jedno repozytorium MisioFlix.");
            var index = matching[0].i;
            if (!original[index].Enabled)
                throw new InvalidOperationException("Repozytorium MisioFlix jest wyłączone w Jellyfin.");

            // GitHub returns an immutable commit ID for current main. The content
            // fetched through this ID cannot be an old CDN snapshot of a moving URL.
            var sha = await ReadCurrentCommitAsync(cancel).ConfigureAwait(false);
            var pinnedUrl = RawPrefix + sha + "/manifest.json";

            // This is Jellyfin's own package parser and compatibility filter,
            // rather than a second, incompatible parser maintained by MisioFlix.
            var verified = await ReadVerifiedVersionAsync(pinnedUrl, cancel).ConfigureAwait(false);
            if (verified.version is null)
                throw new InvalidOperationException("Jellyfin nie znalazł poprawnej wersji MisioFlix w nowym manifeście.");
            var installed = typeof(Plugin).Assembly.GetName().Version;
            if (installed is not null && verified.version.CompareTo(installed) < 0)
                throw new InvalidOperationException("Manifest jest starszy niż zainstalowana wersja; nie zmieniono repozytorium.");

            var existing = original[index].Url;
            if (string.Equals(existing, pinnedUrl, StringComparison.Ordinal))
                return new NativeRefreshResult(verified.version.ToString(), verified.abi!, pinnedUrl, false, true);

            // Save the same configuration Jellyfin itself uses in GET /Packages.
            // Change exactly one URL; keep all other repositories and their flags.
            var replacement = original.Select(r => new RepositoryInfo {
                Name = r.Name, Url = r.Url, Enabled = r.Enabled
            }).ToArray();
            replacement[index].Url = pinnedUrl;
            _server.Configuration.PluginRepositories = replacement;
            try
            {
                _server.SaveConfiguration();
            }
            catch
            {
                _server.Configuration.PluginRepositories = original;
                throw;
            }
            _logger.LogInformation("MisioFlix: Jellyfin repository set to verified Git revision {Commit} ({Version})",
                sha, verified.version);
            return new NativeRefreshResult(verified.version.ToString(), verified.abi!, pinnedUrl, true, true);
        }
        finally { _gate.Release(); }
    }

    private async Task<string> ReadCurrentCommitAsync(CancellationToken cancel)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, CommitApi);
        req.Headers.UserAgent.ParseAdd("MisioFlix-Jellyfin/0.4.97");
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        req.Headers.CacheControl = new CacheControlHeaderValue { NoCache = true, NoStore = true };
        using var result = await _clients.CreateClient("MisioFlixUpdates")
            .SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cancel).ConfigureAwait(false);
        if (!result.IsSuccessStatusCode)
            throw new InvalidOperationException("GitHub nie udostępnił rewizji manifestu (HTTP " + (int)result.StatusCode + ").");
        using var json = await JsonDocument.ParseAsync(await result.Content.ReadAsStreamAsync(cancel).ConfigureAwait(false),
            cancellationToken: cancel).ConfigureAwait(false);
        if (!json.RootElement.TryGetProperty("sha", out var raw) || raw.ValueKind != JsonValueKind.String ||
            !ShaPattern.IsMatch(raw.GetString() ?? ""))
            throw new InvalidOperationException("GitHub zwrócił nieprawidłową rewizję repozytorium.");
        return raw.GetString()!.ToLowerInvariant();
    }

    private async Task<(Version? version, string? abi)> ReadVerifiedVersionAsync(string url, CancellationToken cancel)
    {
        var packages = await _install.GetPackages("MisioFlix", url, true, cancel).ConfigureAwait(false);
        var own = packages.Where(p => p.Id == PluginGuid).ToArray();
        if (own.Length != 1)
            throw new InvalidOperationException("Manifest Jellyfina nie zawiera dokładnie jednego pakietu o identyfikatorze MisioFlix.");
        var versions = own[0].Versions.Where(v =>
            string.Equals(v.TargetAbi, "12.4.0.0", StringComparison.Ordinal) &&
            v.SourceUrl is not null && v.SourceUrl.StartsWith(DownloadPrefix, StringComparison.Ordinal) &&
            v.VersionNumber.CompareTo(new Version(0, 0, 0, 0)) > 0).OrderByDescending(v => v.VersionNumber).ToArray();
        if (versions.Length == 0)
            throw new InvalidOperationException("Manifest nie zawiera zgodnej z Jellyfin 12.4 wersji do instalacji.");
        return (versions[0].VersionNumber, versions[0].TargetAbi);
    }
}
