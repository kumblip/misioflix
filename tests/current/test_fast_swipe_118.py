"""v0.4.118: faster carousels without hijacking native touch gestures."""
import json, re, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
WEB=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf8')
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf8')
BLOCK=CSS.split('/* v0.4.118',1)[1].split('/* v0.4.117',1)[0]
class FasterSwipe118(unittest.TestCase):
 def test_touch_has_native_momentum_without_forced_scripting(self):
  self.assertIn('@media (pointer:coarse), (any-pointer:coarse)',BLOCK)
  for cls in ('.mf-home-shelf-scroll','.mf-home-resume-items','.mf-home-resume-hidden'):
   self.assertIn(cls,BLOCK)
  self.assertIn('scroll-snap-type:none!important;',BLOCK)
  self.assertIn('scroll-behavior:auto!important;',BLOCK)
  self.assertIn('-webkit-overflow-scrolling:touch;',BLOCK)
  self.assertNotIn('touch-action:pan-x;',BLOCK)
  self.assertNotIn('display:none',BLOCK)
 def test_mouse_drag_moves_faster_but_touch_is_natively_managed(self):
  drag=WEB.split('function enableShelfDrag(scroll, row)',1)[1].split('function shelfShell(lib)',1)[0]
  self.assertIn("event.pointerType !== 'mouse' && event.pointerType !== 'pen'",drag)
  self.assertIn('scroll.scrollLeft = g.scrollStart - dx * 1.35;',drag)
  self.assertIn('if (event.cancelable) event.preventDefault();',drag)
  self.assertNotIn('touchstart',drag)
  self.assertNotIn('touchmove',drag)
  self.assertNotIn('touchend',drag)
  self.assertIn('event.stopImmediatePropagation()',drag)
  self.assertIn('scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth-360',drag)
 def test_arrows_move_further_in_all_three_carousels(self):
  self.assertEqual(WEB.count('scroll.clientWidth*1.12'),3)
  self.assertEqual(WEB.count('scroll.clientWidth*1.15'),3)
  self.assertNotIn('scroll.clientWidth*.77',WEB)
  self.assertNotIn('scroll.clientWidth*.75',WEB)
 def test_no_poster_tile_or_integrations_changed_in_release(self):
  self.assertIn('data-mf-watch',CSS)
  self.assertIn('data-mf-simkl-watch',CSS)
  self.assertIn('function makeCard(item)',WEB)
  self.assertRegex(json.loads((ROOT/'meta.json').read_text(encoding='utf8'))['version'],r'^0\.4\.(?:11[8-9]|1[2-9][0-9])\.0$')
if __name__=='__main__':unittest.main()
