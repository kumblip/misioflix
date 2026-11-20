import json
import re
import unittest
from pathlib import Path
from lxml import html

ROOT=Path(__file__).resolve().parents[2]
CODE=ROOT/'src/Jellyfin.Plugin.MisioFlix'
HOME=(CODE/'Web/home.js').read_text(encoding='utf-8')
ADMIN=(CODE/'Web/configPage.html').read_text(encoding='utf-8')
CSS=(CODE/'Web/theme.css').read_text(encoding='utf-8')
CONFIG=(CODE/'Configuration/PluginConfiguration.cs').read_text(encoding='utf-8')
API=(CODE/'Controllers/MisioFlixController.cs').read_text(encoding='utf-8')

class ProposalSets108(unittest.TestCase):
    def test_version_and_backward_compatible_configuration(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))['version'],'0.4.108.0')
        for token in ['List<MisioFlixRecommendationSet> RecommendationSets',
                      'List<string> RecommendationGenres', 'public bool MatchAll',
                      'public List<string> Genres']:
            self.assertIn(token,CONFIG)
        self.assertIn('config.RecommendationGenres',API)
        self.assertIn('config.RecommendationSets',API)
        self.assertIn('return Ok(new { proposals = sets })',API)
        public=API.split('HomeRecommendationGenres()',1)[1].split('HomeRecommendationOptions(',1)[0]
        self.assertNotIn('MalClientSecret',public)
        self.assertNotIn('SimklClientId',public)
        self.assertIn('[Authorize]',API)

    def test_all_major_config_groups_are_independently_collapsible(self):
        document=html.fromstring(ADMIN)
        groups=document.xpath('//details[contains(concat(" ",normalize-space(@class)," ")," mf-config-collapse ")]')
        self.assertEqual(len(groups),6)
        self.assertTrue(all(len(x.xpath('./summary'))==1 for x in groups))
        self.assertTrue(all(x.get('open') is None for x in groups))
        for name in ['mf-config-form','mf-simkl-config-form','mf-nfo-collections-panel',
                     'mf-native-cover-panel','mf-recommendation-config','mf-updates-panel']:
            self.assertEqual(len(document.xpath(f'//*[@id="{name}"]/ancestor::details[contains(@class,"mf-config-collapse")]')),1,name)
        self.assertIn('mf-proposal-genre-toggle',ADMIN)
        self.assertIn('mf-proposal',ADMIN)
        self.assertIn('Propozycja ',ADMIN)
        self.assertIn('Co najmniej jeden z wybranych gatunków',ADMIN)
        self.assertIn('Wszystkie wybrane gatunki',ADMIN)
        self.assertIn('+ Dodaj propozycję',ADMIN)
        self.assertIn('cfg.RecommendationSets=',ADMIN)

    def test_home_three_switches_in_one_row_and_random_by_default(self):
        mount=HOME.split('  function mount(host){',1)[1].split('  function unmountHome(){',1)[0]
        self.assertIn("const switches=own('div','mf-home-switches')",mount)
        self.assertIn('append(switches,libraryShelvesToggle(),recommendationToggle(),recommendationAnimeToggle())',mount)
        self.assertIn('recommendationIncludeAnime=true',mount)
        self.assertIn('display:flex;flex-flow:row nowrap',CSS)
        self.assertIn('overflow-x:auto',CSS)
        self.assertIn("button.setAttribute('aria-checked','true')",HOME.split('function recommendationAnimeToggle(){',1)[1].split('function randomizeRecommendations(',1)[0])
        shelf=HOME.split('  function recommendationShelf(',1)[1].split('  async function loadRecommendationPage(',1)[0]
        self.assertIn("mode:'random'",shelf)
        self.assertIn('ordered:randomizeRecommendations(base)',shelf)
        self.assertIn('randomizeRecommendations(row.base)',shelf)
        self.assertIn("mode==='latest'",shelf)
        self.assertIn("row.mode==='random'",HOME.replace("row.shuffle.classList.toggle('mf-home-view-active',mode==='random')","row.mode==='random'"))
        self.assertIn('preset.matchAll?selected.every(g=>genres.has(g)):selected.some(g=>genres.has(g))',HOME)
        self.assertIn('if(!recommendationIncludeAnime&&item.anime)return false',HOME)
        self.assertIn('SHELF_LIMIT',HOME.split('async function loadRecommendationPage(',1)[1].split('function paintRecommendationSets(',1)[0])
        self.assertIn("card.querySelector('.mf-home-card-desc')?.remove()",HOME)

if __name__=='__main__': unittest.main()
