"""v121: final computed desktop genre-chip values, mobile unaffected."""
import json
import re
import unittest
from version_contract import CURRENT_RELEASE
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf-8')
class DesktopGenres121(unittest.TestCase):
    def setUp(self):
        self.assertEqual(CSS.count('/* v0.4.121:'),1)
        self.assertLess(CSS.index('/* v0.4.120:'),CSS.index('/* v0.4.121:'))
        self.block=CSS.split('/* v0.4.121:',1)[1].split('/* v0.4.118',1)[0]
    def test_active_style_at_14px_desktop(self):
        self.assertIn('@media (min-width:921px)',self.block)
        self.assertIn('html.misioflix-skin .mf-native-genre,',self.block)
        self.assertIn('html.misioflix-skin .mf-home-genre{',self.block)
        self.assertRegex(self.block,r'font-size:\s*14px;')
        self.assertNotIn('font-size:17.25px',self.block)
    def test_proportional_padding_not_scaled_transform(self):
        self.assertIn('padding:3.5px 8.5px;',self.block)
        self.assertIn('padding:2.5px 6px;',self.block)
        self.assertIn('gap:5px',self.block)
        self.assertIn('gap:3.5px',self.block)
        self.assertNotIn('transform:scale(',self.block.split('@media (min-width:921px)',1)[1])
        self.assertNotIn('!important',self.block)
    def test_mobile_unchanged_and_release_version(self):
        self.assertNotIn('max-width',self.block)
        self.assertIn('html.misioflix-skin .mf-native-genre{font-size:9px;padding:2px 5px}',CSS)
        self.assertEqual(json.loads((ROOT/'meta.json').read_text(encoding='utf8'))['version'], CURRENT_RELEASE)
if __name__=='__main__':unittest.main()
