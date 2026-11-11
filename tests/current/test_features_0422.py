"""v0.4.22 regression contracts, updated from the tested 12.4 detail DOM.

CI has no live Jellyfin; Playwright integration checks are performed on a local
DOM + mocked per-user API outside CI. These tests assert wiring and safe scope.
"""
from pathlib import Path
import json
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[2]
P=ROOT/'src/Jellyfin.Plugin.MisioFlix'
HOME=(P/'Web/home.js').read_text(encoding='utf-8')
DETAILS=(P/'Web/details.js').read_text(encoding='utf-8')
CSS=(P/'Web/theme.css').read_text(encoding='utf-8')
SERVICE=(P/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')

class Features0422(unittest.TestCase):
    def test_release_single_version_source(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'],'0.4.22.0')
        self.assertIn('0.4.22.0',(P/'Jellyfin.Plugin.MisioFlix.csproj').read_text())
    def test_home_uses_proven_native_detail_button_for_resume(self):
        self.assertIn('window.MisioFlixPlayItem(entry.resumeId)',HOME)
        self.assertIn('window.MisioFlixPlayItem = playEpisode;',DETAILS)
        self.assertIn('const page = activeDetailsPage(target)',DETAILS)
        self.assertIn('button.click(); return true;',DETAILS)
        self.assertIn('await playViaItemDetails(entry,serial)',HOME) # only fallback
        self.assertNotIn("'data-id':compactId(entry.resumeId)",HOME)
        self.assertNotIn('manager.play({ids:',HOME)
    def test_back_and_native_shuffle_hidden_only_on_details(self):
        self.assertIn('ensureBackButton(page);',DETAILS)
        self.assertIn("create('button','mf-detail-back','← Wstecz')",DETAILS)
        self.assertIn('window.history.back()',DETAILS)
        self.assertIn("window.location.hash='#/home'",DETAILS)
        self.assertIn('#itemDetailPage .mainDetailButtons .btnShuffle',CSS)
        self.assertIn('mf-home-shuffle',HOME) # homepage random remains
    def test_separate_genre_navigation_from_real_jellyfin_markup(self):
        self.assertIn('.itemDetailsGroup a[href*="genreId="]',DETAILS)
        self.assertIn("document.addEventListener('click',onGenreClick,true)",DETAILS)
        self.assertIn("window.location.hash = '#/home?mfSearch='",DETAILS)
        self.assertIn("fetch(API + '/overlays?ids='",DETAILS)
        self.assertIn("item.anime === true ? 'anime' : 'media'",DETAILS)
        self.assertIn('IsBelowRoot(libItem.Path, root)',SERVICE)
        self.assertIn('ReadNfo(libItem.Path, type)',SERVICE)
        self.assertIn('const names=state.kind===\'anime\'',HOME)
        self.assertIn('ANIME_GENRES.filter(g=>counts.has(normalized(g)))',HOME)
        self.assertIn('!x.anime',HOME)
    def test_landing_search_has_required_green_genre(self):
        self.assertIn('linkedGenreRequest()',HOME)
        self.assertIn('maybeOpenLinkedGenre()',HOME)
        self.assertIn('state.initialGenre=initialGenre',HOME)
        self.assertIn('state.genreStates.set(key,1)',HOME)
        self.assertIn('if(state.unmatchedGenre)return false;',HOME)
        self.assertIn('state.unmatchedGenre=\'\';state.initialGenre=\'\';',HOME)
        self.assertIn('processedGenreLink=\'\';',HOME)
    def test_native_pages_outside_details_untouched(self):
        self.assertIn('activeDetailsPage(id) !== page',DETAILS)
        self.assertIn("if (!id || !page || activeDetailsPage(id) !== page) return;",DETAILS)
        self.assertIn('html.misioflix-skin #itemDetailPage.mf-detail-compact',CSS)
        self.assertNotIn('HTMLVideoElement',DETAILS)
        self.assertNotIn('video.play()',DETAILS)
    def test_node_js_syntax(self):
        for filename in ('home.js','details.js'):
            result=subprocess.run(['node','--check',str(P/'Web'/filename)],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)

if __name__=='__main__':unittest.main()
