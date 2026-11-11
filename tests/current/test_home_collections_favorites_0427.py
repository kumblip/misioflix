"""MisioFlix 0.4.27: user-reported homepage regressions.
The original Jellyfin 12.4 HTML has Favorites href='#/home?tab=1'.
Collections are BoxSets, and do not require a boxsets user-view.
"""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HOME = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text()
API = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs').read_text()
CATALOG = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text()

class Home0427(unittest.TestCase):
    def test_version_is_current(self):
        self.assertRegex(json.loads((ROOT / 'meta.json').read_text())['version'], r'^0\.4\.[0-9]+\.0$')

    def test_favorites_are_not_the_homepage(self):
        self.assertIn('const tab=new URLSearchParams(query).get(\'tab\')', HOME)
        self.assertIn("return tab===null || tab==='0'", HOME)
        self.assertIn('window.addEventListener(\'hashchange\'', HOME)
        self.assertIn('if(!homeRoute())unmountHome()', HOME)

    def test_anime_route_keeps_native_react_tree(self):
        self.assertIn("link && !homeRouteFor(link.getAttribute('href')||'')", HOME)
        self.assertIn("document.addEventListener('pointerdown'", HOME)
        self.assertIn("const LIBRARY_ROUTE = /^#\\/(?:movies|tv)", HOME)
        self.assertNotIn("(?:movies|tv|mixed)", HOME)

    def test_collections_row_without_jellyfin_user_view(self):
        self.assertIn("const collectionsShelf={id:'collections'", HOME)
        self.assertIn('const ordered=[...animeViews,collectionsShelf,...otherViews]', HOME)
        self.assertIn("row.lib.category==='collections'", HOME)
        self.assertIn("'/home/collections?'", HOME)
        self.assertIn("collectionButton.setAttribute('aria-label','Otwórz listę wszystkich kolekcji')", HOME)

    def test_collections_are_boxsets_not_folders(self):
        self.assertIn('ReadHomeCollectionsAsync', CATALOG)
        self.assertIn('var tile = MakeHomeTile(item, "collections")', CATALOG)
        self.assertIn('if (collection ? type != "BoxSet"', CATALOG)
        self.assertIn('"&Recursive=true&IncludeItemTypes=BoxSet&CollapseBoxSetItems=false"', CATALOG)

    def test_collections_do_not_require_parent_or_grouping(self):
        method = CATALOG.split('public async Task<HomeShelfResponse> ReadHomeCollectionsAsync', 1)[1].split('private HomeTile? MakeHomeTile',1)[0]
        self.assertNotIn('ParentId=', method)
        self.assertNotIn('EnableGroupingMoviesIntoCollections', method)
        self.assertIn('AuthenticatedUserAsync(caller, cancel)', method)

    def test_api_endpoint_authorization_and_error_handling(self):
        endpoint = API.split('[HttpGet("api/home/collections")]', 1)[1].split('[HttpGet("api/home/resume")]', 1)[0]
        self.assertIn('[Authorize]', endpoint)
        self.assertIn('Response.Headers.CacheControl = "private, no-store";', endpoint)
        self.assertIn('ReadHomeCollectionsAsync', endpoint)
        self.assertIn('catch (UnauthorizedAccessException)', endpoint)

if __name__ == '__main__':
    unittest.main()
