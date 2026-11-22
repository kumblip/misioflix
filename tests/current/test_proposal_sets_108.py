import json
import re
import unittest
from pathlib import Path
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parents[2]
CODE=ROOT/'src/Jellyfin.Plugin.MisioFlix'
HOME=(CODE/'Web/home.js').read_text(encoding='utf-8')
ADMIN=(CODE/'Web/configPage.html').read_text(encoding='utf-8')
CSS=(CODE/'Web/theme.css').read_text(encoding='utf-8')
CONFIG=(CODE/'Configuration/PluginConfiguration.cs').read_text(encoding='utf-8')
API=(CODE/'Controllers/MisioFlixController.cs').read_text(encoding='utf-8')

class _ConfigCollapseParser(HTMLParser):
    """Check real nested config sections without optional CI dependencies.

    Track only markup structure relevant to the test (details, summary and ids).
    The HTML page includes scripts and CSS, so it cannot be parsed as strict XML.
    """
    VOID = frozenset({'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
                      'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'})

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.groups = []
        self.parent_group_by_id = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        group = None
        if tag == 'details' and 'mf-config-collapse' in attrs.get('class', '').split():
            group = len(self.groups)
            self.groups.append({'direct_summaries': 0, 'open': 'open' in attrs})
        if tag == 'summary' and self.stack:
            parent_tag, parent_group = self.stack[-1]
            if parent_tag == 'details' and parent_group is not None:
                self.groups[parent_group]['direct_summaries'] += 1
        if 'id' in attrs:
            parents = [section for _, section in self.stack if section is not None]
            self.parent_group_by_id[attrs['id']] = parents[-1] if parents else None
        if tag not in self.VOID:
            self.stack.append((tag, group))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

class ProposalSets108(unittest.TestCase):
    def test_version_and_backward_compatible_configuration(self):
        self.assertRegex(json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))['version'],r'^0\.4\.\d+\.0$')
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
        document = _ConfigCollapseParser()
        document.feed(ADMIN)
        document.close()
        self.assertEqual(len(document.groups), 7)
        self.assertTrue(all(group['direct_summaries'] == 1 for group in document.groups))
        self.assertTrue(all(not group['open'] for group in document.groups))
        names = ['mf-config-form', 'mf-simkl-config-form', 'mf-language-index-refresh', 'mf-nfo-collections-panel',
                 'mf-native-cover-panel', 'mf-recommendation-config', 'mf-updates-panel']
        for index, name in enumerate(names):
            self.assertEqual(document.parent_group_by_id.get(name), index, name)
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
