"""119: exact per-carousel limits and desktop-only genre-chip scaling."""
import json
import re
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HOME=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf8')
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf8')
API=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs').read_text(encoding='utf8')
SERVICE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text(encoding='utf8')
class Carousel119(unittest.TestCase):
    def test_limits_on_home_rows_and_recommendations(self):
        self.assertIn('const SHELF_LIMIT = 10;',HOME)
        self.assertIn('const SHELF_MORE_LIMIT = 25;',HOME)
        self.assertIn("mode==='random'?RANDOM_LIMIT:(reset?SHELF_LIMIT:SHELF_MORE_LIMIT)", HOME)
        loader=HOME.split('async function loadRecommendationPage(row,reset){',1)[1].split('function paintRecommendationSets(',1)[0]
        self.assertIn('const batchLimit=reset?SHELF_LIMIT:SHELF_MORE_LIMIT;',loader)
        self.assertIn('row.offset+batchLimit',loader)
        self.assertIn('row.offset+=batch.length',loader)
        self.assertIn("row.offset=pageStart;throw error",loader)
        self.assertNotIn('RANDOM_LIMIT',loader)
    def test_server_accepts_25_and_collections_directory_still_requests_24(self):
        shelf=API.split('public async Task<IActionResult> HomeShelf(',1)[1].split('    // Public to authenticated Home users:',1)[0]
        self.assertIn('limit > 25',shelf)
        self.assertNotIn('limit > 24',shelf)
        recommendation=API.split('public async Task<IActionResult> HomeRecommendationCards(',1)[1].split('[HttpGet("api/home/collections")]',1)[0]
        self.assertIn('Length > 25',recommendation)
        all_collections=API.split('public async Task<IActionResult> HomeCollections(',1)[1].split('[HttpGet("api/home/resume")]',1)[0]
        self.assertIn('limit > 25',all_collections)
        self.assertIn('limit > 25',SERVICE.split('ReadHomeCollectionsAsync(',1)[1].split('private HomeTile?',1)[0])
        self.assertIn("limit=24",(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf8'))
        self.assertIn('limit > 25',SERVICE.split('ReadHomeShelfAsync(',1)[1].split('// Collections do not need',1)[0])
        self.assertIn('Distinct().Take(25).ToArray()',SERVICE.split('ReadHomeRecommendationCardsAsync(',1)[1])
        self.assertIn('const int randomCount = 5',SERVICE)
    def test_desktop_poster_genres_only_and_no_change_to_mobile(self):
        rule=CSS.split('/* v0.4.119:',1)[1].split('/* v0.4.118',1)[0]
        self.assertIn('@media (min-width:921px)',rule)
        self.assertIn('html.misioflix-skin .mf-native-genre',rule)
        self.assertIn('html.misioflix-skin .mf-home-genre',rule)
        self.assertRegex(rule,r'font-size\s*:\s*11\.5px')
        self.assertNotIn('display:none',rule)
        self.assertNotIn('!important',rule)
    def test_version_and_integrations_unchanged(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text(encoding='utf8'))['version'],'0.4.119.0')
        self.assertIn('data-mf-watch',CSS)
        self.assertIn('data-mf-simkl-watch',CSS)
        self.assertIn('function makeCard(item)',HOME)
        self.assertIn("mode==='random'",HOME)
if __name__=='__main__':unittest.main()
