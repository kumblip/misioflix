"""Static injection contracts (C# runtime checked by Jellyfin CI)."""
from pathlib import Path
import re, unittest
ROOT=Path(__file__).resolve().parents[2]/'src/Jellyfin.Plugin.MisioFlix'
INJ=(ROOT/'Services/ScriptInjection.cs').read_text()
CONF=(ROOT/'Configuration/PluginConfiguration.cs').read_text()
ADMIN=(ROOT/'Web/configPage.html').read_text()
DETAIL=(ROOT/'Web/details.js').read_text()
class WebCompatibility149(unittest.TestCase):
    def test_settings_match_injection_and_default_on(self):
        keys=set(re.findall(r'data-mf-web-module="(Web\w+Enabled)"', ADMIN))
        self.assertEqual(len(keys),9)
        self.assertEqual(keys,set(re.findall(r'public bool (Web\w+Enabled) \{ get; set; \} = true;',CONF)))
        self.assertEqual(keys,set(re.findall(r'config\.(Web\w+Enabled)',INJ)))
    def test_asset_order_and_single_injection(self):
        assets=re.findall(r'assets/([\w.-]+)\?v=',INJ)
        self.assertEqual(assets,['theme.css','client.js','diagnostics.js','home.js','details.js','library-scroll.js','next-episode-watch.js','player-back.js','mal.js','mal-archive.css','mal-frames.css','simkl.css','simkl.js','language-flags.css','language-flags.js'])
        self.assertIn('!input.Contains(InjectionMarker, StringComparison.Ordinal)',INJ)
        self.assertIn('new StringBuilder(InjectionMarker)',INJ)
    def test_visual_dependencies_and_independent_player_hooks(self):
        for flag, assets in [('WebHomeEnabled',['home.js']),('WebLibraryScrollEnabled',['library-scroll.js']),('WebMalEnabled',['mal.js','mal-archive.css','mal-frames.css']),('WebSimklEnabled',['simkl.css','simkl.js']),('WebLanguageFlagsEnabled',['language-flags.css','language-flags.js'])]:
            for asset in assets:
                self.assertRegex(INJ,rf'if \(config.WebSkinEnabled && config\.{flag}\)\s+inject.Append\([^\n]+assets/{re.escape(asset)}\?v=')
        for flag, asset in [('WebNextWatchEnabled','next-episode-watch.js'),('WebPlayerBackEnabled','player-back.js')]:
            self.assertRegex(INJ,rf'if \(config\.{flag}\)\s+inject.Append\([^\n]+assets/{re.escape(asset)}\?v=')
    def test_details_helper_only_before_init(self):
        self.assertIn('config.WebSkinEnabled && (config.WebDetailsEnabled || config.WebHomeEnabled)',INJ)
        self.assertIn('data-mf-playback-only',INJ)
        self.assertLess(DETAIL.index('window.MisioFlixPlayItem = playEpisode;'),DETAIL.index("document.currentScript?.getAttribute('data-mf-playback-only')"))
        self.assertLess(DETAIL.index("document.currentScript?.getAttribute('data-mf-playback-only')"),DETAIL.index('function init()'))
    def test_no_new_api_or_diagnostics(self):
        self.assertIn('ApiClient.getPluginConfiguration(pluginId)',ADMIN)
        self.assertIn('ApiClient.updatePluginConfiguration(pluginId,config)',ADMIN)
        self.assertIn('if (config is null || !config.Enabled ||',INJ)
if __name__=='__main__': unittest.main()
