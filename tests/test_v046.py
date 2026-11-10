"""v0.4.6 native Jellyfin Home integration: source + behavioral tests, not live-browser E2E."""
from pathlib import Path
import subprocess
import unittest
import json
import re
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
UI=(SRC/'Web/client.js').read_text()
CSS=(SRC/'Web/theme.css').read_text()
FILTER=(SRC/'Services/ScriptInjection.cs').read_text()
CATALOG=(SRC/'Services/MisioFlixCatalogService.cs').read_text()
CTRL=(SRC/'Controllers/MisioFlixController.cs').read_text()

class NativeJellyfinHomeTests(unittest.TestCase):
    def test_native_home_mounted_not_floating(self):
        self.assertIn("document.querySelector('#indexPage')", UI)
        self.assertIn("page.querySelector('.homeSectionsContainer')", UI)
        self.assertIn("host.appendChild(root)", UI)
        self.assertIn("root.className='mf-native-home'", UI)
        self.assertNotIn("id='mf-launch'",UI)
        self.assertNotIn("btn.id='mf-launch'",UI)
        self.assertIn('.homeSectionsContainer.mf-hosted > :not(#mf-portal)',CSS)
        self.assertIn('position:relative!important',CSS)
    def test_auth_and_native_pages(self):
        self.assertIn('if(!host || !apiClient())return null;',UI)
        self.assertIn('document.addEventListener(\'HISTORY_UPDATE\'',UI)
        self.assertIn("window.addEventListener('popstate'", UI)
        self.assertIn('state.open=false; // Jellyfin', UI)
        self.assertIn('window.Emby?.Page?.showItem',UI)
        self.assertNotIn('Otwórz misioflix',UI)
    def test_episodes_are_not_empty_placeholder(self):
        self.assertIn('ReadEpisodesAsync',CATALOG)
        self.assertIn('Shows/{seriesId}/Episodes',CATALOG)
        self.assertIn('anime ? "" : Text(Get(item, "Name"))',CATALOG)
        self.assertIn('ReadEpisodesAsync(Request,id,item.anime', CTRL)
        self.assertNotIn('episodes = Array.Empty<object>()', CTRL)
        self.assertIn('mf-episode-season', UI)
    def test_versions_and_native_injection(self):
        self.assertIn('native-v0.4.6',FILTER)
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'],'0.4.6.0')
        self.assertIn('0.4.6.0', (SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text())
        self.assertIn('0.4.6',UI)
    def test_browser_behaviour(self):
        r=subprocess.run(['node',str(ROOT/'tests/ui_native_v046.cjs')],capture_output=True,text=True)
        self.assertEqual(r.returncode,0,r.stdout+r.stderr)

if __name__=='__main__':unittest.main()
