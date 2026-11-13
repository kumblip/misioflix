using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.MisioFlix.Configuration;

/// <summary>MisioFlix never writes to media files or NFO.</summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    public bool Enabled { get; set; } = true;
    // Register this callback URL in the MAL API application. Never commit credentials.
    public string MalClientId { get; set; } = string.Empty;
    public string MalClientSecret { get; set; } = string.Empty;
    public string MalRedirectUri { get; set; } = string.Empty;

    // Simkl AUTH V2 device application ID. Never store tokens in plugin configuration.
    public string SimklClientId { get; set; } = string.Empty;

    // Path seen FROM INSIDE the Jellyfin container, NOT the NAS host path.
    public string AnimeRoot { get; set; } = "/media/raid/animelektor";

    // Only local loopback is allowed by CatalogService. Keep the server port here.
    public string JellyfinLoopbackUrl { get; set; } = "http://127.0.0.1:8096";
}
