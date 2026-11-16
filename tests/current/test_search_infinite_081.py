"""v0.4.81 search title boundary + infinite scroll source invariants."""
from pathlib import Path
import json
import unittest
R=Path(__file__).resolve().parents[2]
HOME=(R/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text('utf8')
CSS=(R/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text('utf8')

class Infinite081(unittest.TestCase):
    def test_exact_anime_title_scope(self):
        self.assertIn('return titleMatches(item,q);',HOME)
        self.assertNotIn('relatedSeasons(item,state).some(season=>titleMatches(season,q))',HOME)
        self.assertIn('const titles=state.matches.filter(item=>titleMatches(item,q)).slice(0,18)',HOME)
        self.assertIn('Alternatywny tytuł:',HOME)
        self.assertIn("Tytuł sezonu, OVA, ONA lub Speciala (season.nfo)",HOME)
        self.assertIn('function indexAnimeSeasons(state)',HOME) # no broken grouping
    def test_search_infinite(self):
        self.assertIn('function queueSearchAutoLoad(state)',HOME)
        self.assertIn('main.addEventListener(\'scroll\',()=>queueSearchAutoLoad(state)',HOME)
        self.assertNotIn("'Pokaż kolejne'",HOME)
        self.assertIn('const feed=own(\'div\',\'mf-home-search-feed\'',HOME)
        self.assertIn('state.shown+30',HOME)
    def test_library_pagination(self):
        self.assertIn('scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth-360',HOME)
        self.assertIn("const data=await request('/home/collections?mode=latest&startIndex='+start+'&limit=24')",HOME)
        self.assertIn('function observeCollectionsFeed()',HOME)
        self.assertIn('collectionsPage.observer.observe(collectionsPage.feed)',HOME)
        self.assertIn('collectionsPage?.observer?.disconnect()',HOME)
        self.assertIn('.mf-collections-page-feed',CSS)
        self.assertIn('root:null',HOME) # observer honors any scroll ancestor
    def test_version(self):
        self.assertEqual(json.loads((R/'meta.json').read_text('utf8'))['version'],'0.4.85.0')
