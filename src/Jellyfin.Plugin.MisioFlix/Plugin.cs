using System;
using System.Collections.Generic;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Jellyfin.Plugin.MisioFlix.Configuration;

namespace Jellyfin.Plugin.MisioFlix;

public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public static readonly Guid PluginId = Guid.Parse("97d15b37-b868-492b-83da-eb67b16a0d44");
    public static Plugin? Instance { get; private set; }

    public override Guid Id => PluginId;
    public override string Name => "MisioFlix";
    public override string Description => "Autorski interfejs i katalog NFO wewnątrz Jellyfin 12.4.";

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public IEnumerable<PluginPageInfo> GetPages()
    {
        // Jellyfin 12 plugin configuration pages support a left-hand admin link.
        // The underlying embedded Web.configPage.html stays the existing one.
        yield return new PluginPageInfo
        {
            Name = "MisioFlix",
            EmbeddedResourcePath = "Jellyfin.Plugin.MisioFlix.Web.configPage.html",
            DisplayName = "MisioFlix",
            MenuIcon = "movie",
            EnableInMainMenu = true
        };
    }
}
