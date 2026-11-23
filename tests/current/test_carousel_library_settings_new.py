"""Current home carousel configuration and mixed-folder compatibility."""
import re, unittest
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
SERVICE=(SRC/'Services/MisioFlixCatalogService.cs').read_text()
CONTROLLER=(SRC/'Controllers/MisioFlixController.cs').read_text()
WEB=(SRC/'Web/home.js').read_text()
CONFIG=(SRC/'Configuration/PluginConfiguration.cs').read_text()
ADMIN=(SRC/'Web/configPage.html').read_text()
class CarouselLibrarySettings(unittest.TestCase):
  def test_layout_saved_server_side_not_browser_only(self):
    self.assertIn('public List<string> HomeCarouselOrder',CONFIG)
    self.assertIn('public List<string> HiddenHomeCarousels',CONFIG)
    self.assertIn('api/home/carousel-layout',CONTROLLER)
    public=CONTROLLER.split('public IActionResult HomeCarouselLayout()',1)[1].split('[HttpGet("api/home/shelf")]',1)[0]
    self.assertIn('Response.Headers.CacheControl = "private, no-store"',public)
    self.assertNotIn('MalClientSecret',public)
    self.assertNotIn('SimklClientId',public)
    self.assertIn('config.HomeCarouselOrder=rows.map(row=>row.id)',ADMIN)
    self.assertIn('config.HiddenHomeCarousels=rows.filter(row=>!row.visible)',ADMIN)
  def test_known_order_hidden_and_new_library_append(self):
    self.assertIn("request('/home/libraries')",WEB)
    self.assertIn("request('/home/carousel-layout')",WEB)
    self.assertIn('const defaultOrder=[...animeViews,collectionsShelf,...otherViews]',WEB)
    self.assertIn('for(const lib of defaultOrder)',WEB)
    self.assertIn('ordered.filter(lib=>!hidden.has(',WEB)
    self.assertIn('mf-carousel-reload',ADMIN)
    self.assertIn('mf-carousel-list',ADMIN)
    self.assertIn('Ścieżki:',ADMIN)
    self.assertIn("delta<0?'Przesuń w górę",ADMIN)
  def test_folder_fallback_is_anime_only_and_user_scoped(self):
    home=SERVICE.split('public async Task<HomeShelfResponse> ReadHomeShelfAsync(',1)[1].split('private HomeTile? MakeHomeTile',1)[0]
    self.assertIn('GetHomeLibrariesAsync(origin, auth, userId, cancel)',home)
    self.assertIn('view.category == "anime" && list.Count == 0',home)
    self.assertIn('ParentId={libraryId:N}&Recursive=false',home)
    self.assertIn('MakeHomeTile(item, "anime") ?? MakeAnimeFolderTile(item)',home)
    folder=SERVICE.split('private HomeTile? MakeAnimeFolderTile(',1)[1].split('Only returns item IDs',1)[0]
    self.assertIn('AnimeSource(local.Path).Length == 0',folder)
    self.assertIn('nfo is null',folder)
    self.assertIn('simklExcluded = true',folder)
    self.assertIn('tvshow.nfo',SERVICE)
    self.assertIn('movie.nfo',SERVICE)
  def test_generic_catalog_does_not_pull_all_folders(self):
    self.assertIn('includeAnimeFolders = selected.category == "anime"',SERVICE)
    self.assertIn('(includeAnimeFolders ? ",Folder" : string.Empty)',SERVICE)
    self.assertIn('if (!isAnime) continue;',SERVICE)
if __name__=='__main__': unittest.main()
