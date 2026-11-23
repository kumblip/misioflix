"""Two independently configurable collections shelves; compact native settings."""
from pathlib import Path
import unittest
R=Path(__file__).resolve().parents[2]/'src/Jellyfin.Plugin.MisioFlix'
HOME=(R/'Web/home.js').read_text(encoding='utf-8')
ADMIN=(R/'Web/configPage.html').read_text(encoding='utf-8')
CATALOG=(R/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')

class CollectionsAdmin(unittest.TestCase):
 def test_virtual_and_physical_are_both_allowed_and_scoped(self):
  self.assertIn("'mixed','collections'].includes(lib.category)",HOME)
  self.assertIn("const collectionsShelf={id:'collections'",HOME)
  self.assertIn("const endpoint=row.lib.id==='collections'",HOME)
  self.assertIn("const isGlobalCollections=lib.id==='collections'",HOME)
  self.assertIn('ParentId={libraryId:N}&Recursive=false',CATALOG)
  self.assertIn('MakeHomeTile(item, view.category)',CATALOG)
  self.assertIn('var collections = view.category == "collections"',CATALOG)
 def test_independent_visibility_and_order_persist(self):
  self.assertIn("const fresh=[...anime,{id:'collections'",ADMIN)
  self.assertIn('const classified=libraries.filter(x=>normalizedId(x.ItemId))',ADMIN)
  self.assertIn('config.HomeCarouselOrder=rows.map(row=>row.id)',ADMIN)
  self.assertIn('config.HiddenHomeCarousels=rows.filter(row=>!row.visible)',ADMIN)
  self.assertIn('Kolekcje — globalne',ADMIN)
  self.assertIn('biblioteka Jellyfina',ADMIN)
 def test_admin_sections_are_compact_without_losing_edit(self):
  self.assertIn('max-width:1080px',ADMIN)
  self.assertIn("const box=el('details');box.className='mf-lib-entry'",ADMIN)
  self.assertIn('source.open=true',ADMIN)
  self.assertIn('mf-config-help',ADMIN)
  self.assertIn('mf-carousel-edit',ADMIN)
  self.assertIn('mf-carousel-save',ADMIN)
  self.assertIn('mf-library-save',ADMIN)
  self.assertIn('mf-nfo-collections-panel',ADMIN)
  self.assertIn('mf-updates-panel',ADMIN)
if __name__=='__main__':unittest.main()
