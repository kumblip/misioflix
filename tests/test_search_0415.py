"""Source-level checks for MisioFlix 0.4.16 modal search.
Browser interaction checks are run locally with Playwright; GitHub needs no browser.
"""
import json
import re
import subprocess
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
HOME = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text()
CSS = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text()
SERVICE = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text()
WORKFLOW = (ROOT / '.github/workflows/build.yml').read_text()

class TestSearch0415(unittest.TestCase):
    def test_library_row_only_no_home_search_panels(self):
        self.assertIn("own('nav','mf-home-discovery')", HOME)
        self.assertIn("'Wyszukiwarka anime'",HOME)
        self.assertIn("'Wyszukiwarka filmów i seriali'",HOME)
        self.assertNotIn('Przejdź do bibliotek', HOME)
        self.assertNotIn('mf-home-search-panels', HOME)
        self.assertIn('aria-haspopup',HOME)

    def test_separate_modal_on_demand(self):
        self.assertIn("own('section','mf-home-search-dialog')",HOME)
        self.assertIn("dialog.setAttribute('aria-modal','true')",HOME)
        self.assertIn("function openSearch(kind)",HOME)
        self.assertIn('document.body.appendChild(state.overlay)',HOME)
        self.assertNotIn('void primeSearchGenres()',HOME)
        self.assertIn("const path='/catalog'+(key==='all'?'':'?libraryId='+encodeURIComponent(key))",HOME)
        self.assertIn('.mf-home-search-overlay',CSS)

    def test_canonical_52_anime_genres(self):
        m = re.search(r'const ANIME_GENRES = Object\.freeze\(\[(.*?)\]\);',HOME,re.S)
        self.assertIsNotNone(m)
        names = re.findall(r"'([^']+)'",m.group(1))
        self.assertEqual(len(names),52)
        self.assertEqual(len(set(names)),52)
        self.assertEqual(names[0],'Akcja')
        self.assertEqual(names[-1],'Post Apo')
        self.assertIn("ANIME_GENRES.filter(g=>counts.has(normalized(g)))",HOME)
        self.assertIn("catalogGenres(item,state.kind)",HOME)

    def test_tristate_boolean_and_results(self):
        self.assertIn('state.genreStates.set(term,(mode+1)%3)', HOME)
        self.assertIn('mode===1&&!terms.has(term)',HOME)
        self.assertIn('mode===2&&terms.has(term)',HOME)
        self.assertIn("mf-genre-on", CSS)
        self.assertIn("mf-genre-no", CSS)
        self.assertIn('state.matches.slice(state.shown,state.shown+30)',HOME)
        self.assertIn('state.matches.slice(state.shown,state.shown+30)',HOME)

    def test_seasons_anime_only_and_metadata_policy(self):
        self.assertIn('IncludeItemTypes=Movie,Series,Season',SERVICE)
        self.assertIn('if (type == "Season") continue;',SERVICE)
        self.assertIn('var local = ReadNfo(mediaPath, Text(Get(json, "Type")))',SERVICE)
        self.assertIn("if(kind==='anime')type.appendChild(optionNode('seasons'",HOME)
        self.assertIn('Wszystkie typy',HOME)
        self.assertIn('GetHomeLibrariesAsync(origin, auth, userId, cancel)',SERVICE)
        self.assertIn('ParentId={libraryId.Value:N}',SERVICE)
        self.assertIn("library.addEventListener('change'",HOME)

    def test_dynamic_artifact_name(self):
        self.assertIn('id: pack',WORKFLOW)
        self.assertIn('path: ${{ steps.pack.outputs.archive }}',WORKFLOW)
        self.assertNotIn('dist/MisioFlix_0.4.13.0_JF12.4.zip',WORKFLOW)

    def test_syntax_and_version(self):
        for name in ['client.js','home.js']:
            result=subprocess.run(['node','--check',str(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'/name)],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'],'0.4.16.0')

if __name__ == '__main__': unittest.main()
