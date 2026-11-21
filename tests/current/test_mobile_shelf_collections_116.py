"""v0.4.116: mobile shelf/title and full Collections-directory density."""
import json,re,unittest
from pathlib import Path
R=Path(__file__).resolve().parents[2]
CSS=(R/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf8')
JS=(R/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf8')
CLIENT=(R/'src/Jellyfin.Plugin.MisioFlix/Web/client.js').read_text(encoding='utf8')
BLOCK=CSS.split('/* v0.4.116:',1)[1].split('/* v0.4.94:',1)[0]
class Mobile116(unittest.TestCase):
 def test_previous_nowrap_conflict_is_explicitly_overridden(self):
  self.assertIn('.mf-home-rows > .mf-home-shelf > .mf-home-shelf-scroll > .mf-home-card .mf-home-card-title',BLOCK)
  self.assertIn('display:-webkit-box!important;',BLOCK)
  self.assertIn('-webkit-line-clamp:2!important;',BLOCK)
  self.assertIn('white-space:normal!important;',BLOCK)
  self.assertNotIn('white-space:nowrap!important',BLOCK)
 def test_three_tiles_and_compact_spacings(self):
  self.assertIn('gap:4px!important;',BLOCK)
  self.assertIn('calc((100% - 8px)/3)',BLOCK)
  self.assertIn('padding:5px 4px 7px!important;',BLOCK)
  self.assertIn('padding-left:2px!important;padding-right:2px!important;',BLOCK)
  self.assertIn('padding:0 23px 0 3px!important;',BLOCK)
 def test_collections_page_has_equivalent_tiles(self):
  self.assertIn('mf-collections-page-grid',BLOCK)
  self.assertIn('grid-template-columns:repeat(3,minmax(0,1fr))!important',BLOCK)
  for name in ['.mf-home-card-body','.mf-home-card-title','.mf-home-card-info-button','.mf-home-card-desc','.mf-home-stats','.mf-home-genres']:
   self.assertIn('mf-collections-page-grid '+name,BLOCK)
  self.assertIn('createCollectionsPage(){',JS)
  self.assertIn('mf-collections-page-grid',JS)
  self.assertIn("info.addEventListener('click',()=>openCardInfo(item,info));",JS)
 def test_native_library_keeps_react_layout_and_watch_frames(self):
  self.assertIn('mf-native-library-route',BLOCK)
  self.assertNotIn('.itemsContainer{display:grid',BLOCK)
  self.assertIn('makeNativeLibraryInfo(card)',CLIENT)
  self.assertIn('data-mf-watch',CSS)
 def test_version_matches_assembly(self):
  v=json.loads((R/'meta.json').read_text(encoding='utf8'))['version']
  self.assertEqual(v,'0.4.116.0')
  csproj=(R/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf8')
  self.assertIn('<AssemblyVersion>'+v+'</AssemblyVersion>',csproj)
if __name__=='__main__':unittest.main()
