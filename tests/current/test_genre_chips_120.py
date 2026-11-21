"""v120 desktop-only CSS badge scaling: 1.5x 119 size, not the posters."""
import re
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf-8')
class DesktopChips120(unittest.TestCase):
    def test_both_card_kinds_scale_font(self):
        before=CSS.split('/* v0.4.119:',1)[1].split('/* v0.4.120:',1)[0]
        # Previous original declaration must not be edited.
        self.assertIn('font-size:11.5px;',before)
        block=CSS.split('/* v0.4.120:',1)[1].split('/* v0.4.118',1)[0]
        self.assertIn('@media (min-width:921px)',block)
        self.assertIn('html.misioflix-skin .mf-native-genre,',block)
        self.assertIn('html.misioflix-skin .mf-home-genre{',block)
        self.assertRegex(block,r'font-size\s*:\s*17\.25px')
        self.assertEqual(17.25/11.5,1.5)
        self.assertNotIn('!important',block)
        self.assertNotIn('transform:scale(',block.split('@media (min-width:921px)',1)[1])
    def test_geometry_scales_without_clipping_card(self):
        block=CSS.split('/* v0.4.120:',1)[1].split('/* v0.4.118',1)[0]
        self.assertIn('padding:4.5px 10.5px',block)
        self.assertIn('padding:3px 7.5px',block)
        self.assertIn('gap:6px',block)
        self.assertIn('gap:4.5px',block)
        self.assertNotIn('display:none',block)
        self.assertNotIn('touch-action',block)
    def test_mobile_original_rules_unchanged(self):
        self.assertIn('html.misioflix-skin .mf-native-genre{font-size:9px;padding:2px 5px}',CSS)
        self.assertIn('html.misioflix-skin .mf-home-search-grid .mf-home-poster[data-mf-item-id] .mf-home-genre {padding:2px 4px;font-size:9px}',CSS)
if __name__=='__main__':unittest.main()
