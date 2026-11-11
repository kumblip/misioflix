"""Native-home drag regression contract (does not replace browser E2E)."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
JS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text()
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text()
class Drag(unittest.TestCase):
  def test_pointer_drag_guards(self):
    for x in ['enableShelfDrag(scroll,row)','pointerdown','pointermove','pointerup',
              'pointercancel','setPointerCapture','threshold = 7',
              'event.stopImmediatePropagation()',"event.pointerType !== 'mouse'",
              "event.pointerType !== 'pen'"]:
      self.assertIn(x,JS)
  def test_swipe_does_not_break_links(self):
    self.assertIn("const link=set(own('a','mf-home-poster')",JS)
    self.assertIn('nativeDetails(item.id,item.serverId)',JS)
    self.assertIn("scroll.addEventListener('dragstart'",JS)
    self.assertIn("scroll.addEventListener('click'",JS)
  def test_incremental_scrolling_and_touch(self):
    self.assertIn('scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth-360',JS)
    self.assertIn("loadShelf(row,'latest',false)",JS)
    self.assertIn('touch-action:pan-x pan-y',CSS)
    self.assertIn('-webkit-overflow-scrolling:touch',CSS)
    self.assertIn('scroll-snap-type:none!important',CSS)
if __name__=='__main__':unittest.main()
