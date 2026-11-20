"""v0.4.110 (scalone): two native Jellyfin admin menu entries without web-core edits."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLUGIN = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Plugin.cs'
WEB = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web'
OVERVIEW_ROUTE = '#/dashboard/plugins/97d15b37b868492b83daeb67b16a0d44?name=MisioFlix'

class AdminOverviewMenu110(unittest.TestCase):
    def test_native_registration_keeps_settings_first(self):
        code = PLUGIN.read_text(encoding='utf-8')
        settings = code.index('Name = "MisioFlix",')
        overview = code.index('Name = "MisioFlixOverview",')
        self.assertLess(settings, overview)
        self.assertEqual(len(re.findall(r'new PluginPageInfo\s*\{', code)), 2)
        self.assertIn('EmbeddedResourcePath = "Jellyfin.Plugin.MisioFlix.Web.configPage.html"', code)
        self.assertIn('DisplayName = "MisioFlix — ustawienia"', code)
        self.assertIn('EmbeddedResourcePath = "Jellyfin.Plugin.MisioFlix.Web.overviewPage.html"', code)
        self.assertIn('DisplayName = "MisioFlix"', code)
        self.assertEqual(code.count('EnableInMainMenu = true'), 2)

    def test_native_overview_uses_current_origin_and_fallback_link(self):
        page = (WEB/'overviewPage.html').read_text(encoding='utf-8')
        self.assertIn('id="misioflixOverviewPage"', page)
        self.assertIn(f'href="{OVERVIEW_ROUTE}"', page)
        self.assertIn("window.location.hash=target", page)
        self.assertIn("view.addEventListener('pageshow',showOverview)", page)
        self.assertNotIn('http://kumadlaneko:', page)
        self.assertNotIn('window.open(', page)
        self.assertNotIn('innerHTML=', page)
        # The prior settings-page bottom link is retained as a navigation fallback.
        config = (WEB/'configPage.html').read_text(encoding='utf-8')
        self.assertIn(f'href="{OVERVIEW_ROUTE}"', config)

    def test_embedded_and_release_contract(self):
        csproj=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf-8')
        meta=json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))
        version = meta['version']
        self.assertRegex(version, r'^0\.4\.\d+\.0$')
        self.assertIn('<EmbeddedResource Include="Web/**/*" />', csproj)
        self.assertIn(f'<AssemblyVersion>{version}</AssemblyVersion>', csproj)
        self.assertIn(f'<FileVersion>{version}</FileVersion>', csproj)
        self.assertIn(f'<Version>{version.rsplit(".", 1)[0]}</Version>', csproj)
        for flow in ('build.yml','release.yml'):
            self.assertTrue((ROOT/'.github/workflows'/flow).exists())

if __name__ == '__main__':
    unittest.main()
