using MediaBrowser.Model.Plugins;
using System.Collections.Generic;

namespace Jellyfin.Plugin.MisioFlix.Configuration;

/// <summary>MisioFlix never writes to media files or NFO.</summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    public bool Enabled { get; set; } = true;
    // Only CHECK for updates every 15 minutes. Installation always requires admin action.
    public bool AutoCheckUpdates { get; set; } = true;
    // Synchronize native Jellyfin BoxSets bidirectionally from <set> tags; prune only tracked links.
    public bool AutoSyncNfoCollections { get; set; } = true;
    // Admin-selected home recommendation rows. Empty list means no rows.
    // Only genre names: never tokens, private per-user watch state or credentials.
    public List<string> RecommendationGenres { get; set; } = new();
    // v0.4.108: independent admin-created recommendation rows (AND / OR).
    // Legacy RecommendationGenres is retained only for old installation migrations.
    public List<MisioFlixRecommendationSet> RecommendationSets { get; set; } = new();
    // Register this callback URL in the MAL API application. Never commit credentials.
    public string MalClientId { get; set; } = string.Empty;
    public string MalClientSecret { get; set; } = string.Empty;
    public string MalRedirectUri { get; set; } = string.Empty;

    // Simkl AUTH V2 device application ID. Never store tokens in plugin configuration.
    public string SimklClientId { get; set; } = string.Empty;

    // Path seen FROM INSIDE the Jellyfin container, NOT the NAS host path.
    public string AnimeRoot { get; set; } = "/media/raid/animelektor";
    // Future second anime library: original sound + English subtitles, folder named "anime".
    // Not an AnimeEN directory; keep AnimeRoot unchanged for all existing installations.
    public string AnimeOriginalRoot { get; set; } = "/media/raid/anime";

    // Only local loopback is allowed by CatalogService. Keep the server port here.
    public string JellyfinLoopbackUrl { get; set; } = "http://127.0.0.1:8096";
}


/// <summary>One admin-defined genre recommendation rail; no user-private data.</summary>
public sealed class MisioFlixRecommendationSet
{
    public List<string> Genres { get; set; } = new();
    public bool MatchAll { get; set; } = false;
}
