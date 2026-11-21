"""v0.4.117: pure CSS native-library 3-up layout without card replacement."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
THEME=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf8')
CLIENT=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/client.js').read_bytes()
HOME=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_bytes()
BLOCK=THEME.split('/* v0.4.117',1)[1].split('/* v0.4.94:',1)[0]
class Native117(unittest.TestCase):
 def test_mobile_only_native_route(self):
  self.assertIn('@media (max-width:680px)',BLOCK)
  self.assertIn('html.misioflix-skin.mf-native-library-route .itemsContainer',BLOCK)
  self.assertNotIn('display:grid!important',BLOCK)
  self.assertNotIn('display:flex!important',BLOCK)
 def test_grid_or_flex_three_up(self):
  self.assertIn('grid-template-columns:repeat(3,minmax(0,1fr))!important;',BLOCK)
  self.assertIn('flex:0 0 calc((100% - 8px)/3)!important;',BLOCK)
  self.assertIn('width:100%!important;',BLOCK)
  self.assertIn('column-gap:4px!important;',BLOCK)
  self.assertIn('flex-wrap:wrap!important;',BLOCK)
 def test_do_not_hide_replace_or_rebuild_tiles(self):
  self.assertNotIn('display:none!important;',BLOCK)
  self.assertNotIn('visibility:hidden',BLOCK)
  self.assertNotIn('content:"";',BLOCK)
  self.assertNotIn('transform:',BLOCK)
 def test_full_library_title_preview_remains_intact(self):
  self.assertIn('mf-native-info-button',THEME)
  self.assertIn('-webkit-line-clamp:2!important;',THEME)
  self.assertIn('data-mf-watch',THEME)
  self.assertIn('data-mf-simkl-watch',THEME)
 def test_native_card_behaviour_contract(self):
  # Stable repository-local assertions; no local absolute paths in CI.
  self.assertIn(b'function makeNativeLibraryInfo(card)',CLIENT)
  self.assertIn(b'function mfLibraryRoute()',CLIENT)
  self.assertIn(b'function mfDecorateFolders()',CLIENT)
  self.assertIn(b'mf-home-shelf-scroll',HOME)
if __name__=='__main__':unittest.main()
