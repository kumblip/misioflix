"""MisioFlix v0.4.7 — static safety/regression tests for native Jellyfin reskin.
Live functional testing of Jellyfin 12.4 Modern is still required on NAS.
"""
import json
import subprocess
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web'
JS = (WEB / 'client.js').read_text(encoding='utf-8')
CSS = (WEB / 'theme.css').read_text(encoding='utf-8')
INJECT = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Services/ScriptInjection.cs').read_text(encoding='utf-8')

class NativeSkinTests(unittest.TestCase):
    def test_no_second_application(self):
        for forbidden in ('buildHome(', 'buildHome', 'homeSectionsContainer', 'window.open(', 'pushState(', 'Emby.Page', 'createElement('):
            self.assertNotIn(forbidden, JS, forbidden)
        self.assertNotIn('#mf-portal', CSS)
        self.assertNotIn('.mf-hosted', CSS)
        self.assertNotIn('display:none', CSS.replace(' ', '').lower())

    def test_no_catalog_or_media_fetch(self):
        self.assertNotIn('fetch(', JS)
        self.assertNotIn("get('catalog')", JS)
        self.assertNotIn('item/', JS)
        self.assertNotIn('apiClient()', JS)

    def test_native_cards_and_status(self):
        for name in ('.card', '.MuiCard-root', 'playedIndicator', 'itemProgressBarForeground', 'data-mf-watch'):
            self.assertIn(name, JS + CSS, name)
        self.assertIn('--mf-pink', CSS)
        self.assertIn('--mf-amber', CSS)
        self.assertIn('--mf-green', CSS)

    def test_no_conflicting_web_modification(self):
        self.assertIn('skin-v0.4.7', INJECT)
        self.assertIn('v=0.4.7.0', INJECT)
        self.assertIn('IsIndex', INJECT)
        self.assertIn('ctx.Response.Body = originalStream', INJECT)

    def test_version_alignment(self):
        meta = json.loads((ROOT / 'meta.json').read_text(encoding='utf-8'))
        csproj = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf-8')
        self.assertEqual(meta['version'], '0.4.7.0')
        self.assertEqual(meta['targetAbi'], '12.4.0.0')
        self.assertIn('<Version>0.4.7</Version>', csproj)
        self.assertIn('0.4.7.0', csproj)

    def test_js_syntax(self):
        out = subprocess.run(['node', '--check', str(WEB / 'client.js')], capture_output=True, text=True)
        self.assertEqual(out.returncode, 0, out.stderr)

if __name__ == '__main__':
    unittest.main()
