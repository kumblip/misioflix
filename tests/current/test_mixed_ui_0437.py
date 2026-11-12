"""Regression protection for 0.4.37 AnimePL's safe, CSS-backed MisioFlix card UI."""
from pathlib import Path
import json, subprocess, unittest
ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web'
CSS = (WEB / 'theme.css').read_text(encoding='utf-8')
JS = (WEB / 'client.js').read_text(encoding='utf-8')
MAL = (WEB / 'mal.js').read_text(encoding='utf-8')

class MixedUi0437(unittest.TestCase):
    def test_version(self):
        v = json.loads((ROOT / 'meta.json').read_text(encoding='utf-8'))['version']
        self.assertGreaterEqual(tuple(map(int,v.split('.'))), (0,4,37,0))
    def test_shared_native_badges_paws_and_nfo_content(self):
        for marker in ('mf-native-overlay','mf-native-stats','mf-native-stat','mf-native-genres','mf-native-description'):
            self.assertIn(marker,CSS)
            self.assertIn(marker,JS)
        self.assertIn("card.setAttribute('data-mf-anime','1')",JS)
        self.assertIn('mf-modern-mixed-route',CSS)
        self.assertIn("classList.toggle('mf-modern-mixed-route',modernMixedRoute())",JS)
        self.assertIn('data-mf-watch="watched"',CSS)
        self.assertIn('data-mf-watch="started"',CSS)
        self.assertIn('data-mf-watch="unwatched"',CSS)
    def test_original_card_link_and_scroll_controller_untouched(self):
        self.assertIn('resetCardIfReused(card)',JS)
        self.assertIn("clearMixedCard(card)",JS)
        self.assertIn('surface.appendChild(overlay)',JS)
        self.assertIn('pointer-events:none',CSS)
        self.assertNotIn('addScrollEventListener',JS)
        self.assertNotIn('replaceWith(',JS)
    def test_late_mal_rating_updates_overlay(self):
        self.assertIn("window.addEventListener('misioflix-mal-cards-updated'",JS)
        self.assertIn('if(modernMixedRoute())paintMixedCard(card)',JS)
        self.assertIn("window.dispatchEvent(new Event('misioflix-mal-cards-updated'))",MAL)

    def test_mal_rewatches_remain_literal(self):
        self.assertIn("['Ponowne obejrzenia'",MAL)
        self.assertNotIn('1+data.timesRewatched',MAL)
        self.assertIn('const rewatchCount=data?.timesRewatched ?? null;',MAL)
    def test_js_syntax(self):
        for script in ('client.js','mal.js','home.js'):
            subprocess.run(['node','--check',str(WEB/script)],check=True,capture_output=True)

if __name__=='__main__': unittest.main()
