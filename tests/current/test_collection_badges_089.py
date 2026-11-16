"""v0.4.89 contract: all three collection-count presentations, CSS isolated to BoxSets."""
import json,re,subprocess,unittest
from pathlib import Path
R=Path(__file__).resolve().parents[2]
H=(R/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf-8')
C=(R/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf-8')
class CollectionBadges089(unittest.TestCase):
 def test_current_version_and_outside_changes_log(self):
  self.assertEqual(json.loads((R/'meta.json').read_text(encoding='utf-8'))['version'],'0.4.91.0')
  self.assertTrue((R/'zrobionepozamisioflixem.txt').exists())
 def test_shared_home_card_for_both_views(self):
  self.assertIn("badge(link,collectionSize+' 🎬','mf-home-collection-count')",H)
  self.assertNotIn("badge(left,count+' 🎬'",H)
  self.assertIn('collectionsPage.grid.appendChild(makeCard(',H)
 def test_native_boxset_uses_existing_number(self):
  for marker in ['#itemDetailPage .collectionItems .card .countIndicator::after','.card[data-type="BoxSet"] .countIndicator::after',"content:\"🎬\""]:
   self.assertIn(marker,C)
  self.assertNotIn(".card[data-type=\"Movie\"] .countIndicator::after",C)
 def test_no_changes_to_jellyfin_custom_css_in_skin(self):
  self.assertNotIn('/* Ukryj standardowe oceny Jellyfina',C)
  self.assertIn('Gatunki', (R/'zrobionepozamisioflixem.txt').read_text(encoding='utf-8'))
 def test_js_runtime(self):
  r=subprocess.run(['node',str(R/'tests/current/collection_badges_089.cjs')],capture_output=True,text=True)
  self.assertEqual(r.returncode,0,r.stderr)
if __name__=='__main__':unittest.main()
