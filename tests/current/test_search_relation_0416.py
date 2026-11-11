"""Source contracts for version 0.4.19 search parent relationships and media genres."""
from pathlib import Path
import json
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]
SERVER = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text(encoding='utf8')
CLIENT = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf8')

class SearchRelation0416(unittest.TestCase):
    def test_real_jellyfin_parent_guid_and_nfo_names(self):
        for symbol in ['public string parent_series_id','public List<string> search_titles',
                       'NormalizeCatalogGuid(Get(json, "SeriesId"), Get(json, "ParentId"))',
                       'V("originaltitle")','V("title")']:
            self.assertIn(symbol,SERVER)
        # NFO-only naming for anime (never season Name from Jellyfin).
        self.assertIn('title = local?.OriginalTitle ?? "Brak tytułu w NFO"',SERVER)
        self.assertIn('search_titles = local is null',SERVER)

    def test_search_index_and_independent_non_anime_genres(self):
        for symbol in ['function indexAnimeSeasons(state)', 'function relatedSeasons(item,state)',
                       'relatedSeasons(item,state).some(season=>titleMatches(season,q))',
                       'state.kind===\'anime\'&&item.type===\'Series\'',
                       'function searchTile(item,state)',
                       'data.items.filter(x=>state.kind===\'anime\'',
                       ": !x.anime && ['Series','Movie'].includes(x.type)"]:
            self.assertIn(symbol,CLIENT)
        self.assertIn("const names=state.kind==='anime'",CLIENT)
        self.assertIn(': [...display.values()].sort',CLIENT)

    def test_version_and_behavior_js(self):
        self.assertRegex(json.loads((ROOT/'meta.json').read_text())['version'],r'^\d+\.\d+\.\d+\.\d+$')
        result = subprocess.run(['node',str(ROOT/'tests/current/search_relation_0416.cjs')],
                                capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

if __name__ == '__main__': unittest.main()
