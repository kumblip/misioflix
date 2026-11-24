"""Source-level API contract; JS regression exercises the real search loader and filters."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
SERVICE=(SRC/'Services/MisioFlixCatalogService.cs').read_text()
HOME=(SRC/'Web/home.js').read_text()
class AnimeLibrarySource146(unittest.TestCase):
    def test_role_only_from_authorized_view_and_matching_configured_guid(self):
        body=SERVICE.split('private async Task<List<HomeLibrary>> GetHomeLibrariesAsync(',1)[1].split('// v0.4.90:',1)[0]
        self.assertIn('Users/{Uri.EscapeDataString(userId)}/Views',body)
        self.assertIn('Guid.TryParse(x.LibraryId, out var mappedId) && mappedId == guid',body)
        self.assertIn('var animeRole = isAnime ? mapped?.Role ?? string.Empty : string.Empty;',body)
        self.assertIn('new HomeLibrary(guid.ToString("N"), name, category, href, revision, animeRole)',body)
        self.assertIn('string animeRole = ""',SERVICE)
    def test_scoped_search_uses_existing_index_without_requests(self):
        body=HOME.split('function scopedAnimeSearchSource(lib,item){',1)[1].split('async function loadScopedCatalogForMode',1)[0]
        self.assertLess(body.index('switch(lib.animeRole)'),body.index('item.pl_audio===true'))
        self.assertIn("if(item.pl_audio===false)return 'original'",body)
        self.assertIn("return 'unknown'",body)
        self.assertNotIn('pl_subtitles',body)
        self.assertNotIn('request(',body)
        self.assertIn("search_anime_source:scopedAnimeSearchSource(lib,item)",HOME)
        self.assertIn('const source=item.search_anime_source??',HOME)
    def test_no_catalog_limit_reintroduced(self):
        body=SERVICE.split('public async Task<CatalogResponse> ReadForAuthenticatedUserAsync(',1)[1].split('// An unknown/incomplete index',1)[0]
        self.assertIn('EnableTotalRecordCount=false',body)
        self.assertIn('start = checked(start + received);',body)
        self.assertNotIn('16000',body)
