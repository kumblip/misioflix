using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.MisioFlix.Configuration;

/// <summary>MisioFlix never writes to media files or NFO.</summary>
public sealed class PluginConfiguration : BasePluginConfiguration
{
    public bool Enabled { get; set; } = true;

    // Path seen FROM INSIDE the Jellyfin container, NOT the NAS host path.
    public string AnimeRoot { get; set; } = "/media/raid/animelektor";

    // Only local loopback is allowed by CatalogService. Keep the server port here.
    public string JellyfinLoopbackUrl { get; set; } = "http://127.0.0.1:8096";
}
