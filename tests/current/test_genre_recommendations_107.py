import json
import re
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
CODE=ROOT/'src/Jellyfin.Plugin.MisioFlix'
HOME=(CODE/'Web/home.js').read_text(encoding='utf-8')
CSS=(CODE/'Web/theme.css').read_text(encoding='utf-8')
ADMIN=(CODE/'Web/configPage.html').read_text(encoding='utf-8')
CONFIG=(CODE/'Configuration/PluginConfiguration.cs').read_text(encoding='utf-8')
CONTROLLER=(CODE/'Controllers/MisioFlixController.cs').read_text(encoding='utf-8')
SERVICE=(CODE/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')

class GenreRecommendations107(unittest.TestCase):
    def test_version(self):
        self.assertRegex(json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))['version'],r'^0\.4\.[0-9]+\.0$')

    def test_real_admin_config_list_and_save(self):
        self.assertIn('List<string> RecommendationGenres',CONFIG)
        for field in ['mf-recommendation-config','mf-recommendation-list','mf-recommendation-add',
                      'mf-recommendation-save','mf-recommendation-status']:
            self.assertIn(field, ADMIN)
        self.assertIn('ApiClient.updatePluginConfiguration(pluginId,cfg)',ADMIN)
        self.assertIn('cfg.RecommendationSets=',ADMIN)
        self.assertIn('recommendations.activate()',ADMIN)
        self.assertIn("recommendation-options", ADMIN)
        self.assertIn('Array.isArray(data?.anime)',ADMIN)
        self.assertIn('Array.isArray(data?.media)',ADMIN)

    def test_scoped_backend(self):
        self.assertIn('[Authorize]',CONTROLLER)
        for name in ['api/home/recommendation-genres', 'api/home/recommendation-options',
                     'api/home/recommendation-cards']:
            self.assertIn(name,CONTROLLER)
        self.assertIn('ReadForAuthenticatedUserAsync(Request, cancel)',CONTROLLER)
        self.assertIn('ReadHomeRecommendationCardsAsync',SERVICE)
        self.assertIn('AuthenticatedUserAsync(caller, cancel)',SERVICE)
        self.assertIn('IncludeItemTypes=Movie,Series',SERVICE)
        self.assertIn('allowed.Contains(id)',SERVICE)
        self.assertIn('MakeHomeTile(item, category, media, libraryIds)',SERVICE)
        self.assertIn('AnimeSourceForLibraryMembership(libraryIds, media.Path)',SERVICE)
        self.assertNotIn('MalClientSecret',CONTROLLER.split('HomeRecommendationGenres()',1)[1].split('HomeRecommendationOptions(',1)[0])

    def test_home_both_switches_and_existing_modes(self):
        mount=HOME.split('  function mount(host){',1)[1].split('  function unmountHome(){',1)[0]
        self.assertLess(mount.index('homeRoot.appendChild(resumeShelf())'),mount.index('homeContentModeToggle()'))
        self.assertLess(mount.index('homeContentModeToggle()'),mount.index('recommendationAnimeToggle()'))
        self.assertIn("genreArea.hidden=false",mount)
        self.assertIn("genreArea.id='mf-home-recommendations'",mount)
        self.assertIn('librariesReadyPromise=loadLibraries(serial)',mount)
        self.assertIn("button.setAttribute('aria-checked','true')",HOME.split('function homeContentModeToggle(){',1)[1].split('function randomizeRecommendations(',1)[0])
        self.assertIn("row.isGenre || row.mode==='latest'",HOME)
        self.assertIn('randomizeRecommendations(row.randomPool)',HOME)
        self.assertIn('SHELF_LIMIT',HOME.split('async function loadRecommendationPage(',1)[1].split('function paintRecommendationSets(',1)[0])
        self.assertNotIn('RANDOM_LIMIT',HOME.split('async function loadRecommendationPage(',1)[1].split('function paintRecommendationSets(',1)[0])

    def test_card_layout_and_genres_from_actual_source(self):
        self.assertIn("const data=await getCatalogForSearch()",HOME)
        self.assertIn('parent_series_id',HOME)
        self.assertIn('item.genres',HOME)
        self.assertIn('makeCard(item)',HOME)
        self.assertIn("card.querySelector('.mf-home-card-desc')?.remove()",HOME)
        self.assertIn('.mf-home-recommendations .mf-home-card-desc{display:none!important}',CSS)
        self.assertIn('.mf-home-recommendations .mf-home-card-body{',CSS)
        self.assertIn('mf-home-poster[data-mf-watch="watched"]',CSS)
        self.assertIn('mf-home-poster[data-mf-watch="started"]',CSS)

if __name__ == '__main__': unittest.main()
