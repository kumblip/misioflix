from pathlib import Path
import unittest
import subprocess

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'src/Jellyfin.Plugin.MisioFlix'
CSS=(SOURCE/'Web/theme.css').read_text(encoding='utf-8')
JS=(SOURCE/'Web/client.js').read_text(encoding='utf-8')
SERVICE=(SOURCE/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')
CONTROLLER=(SOURCE/'Controllers/MisioFlixController.cs').read_text(encoding='utf-8')

class CompactViewTests(unittest.TestCase):
    def test_two_line_titles(self):
        self.assertIn('-webkit-line-clamp:2',CSS)
        self.assertIn('title="${h(it.title',JS)
    def test_three_most_common_genres_separately_from_nfo_and_jellyfin(self):
        self.assertIn('genreFrequency:{anime:new Map(),media:new Map()}',JS)
        self.assertIn("item.anime?'anime':'media'",JS)
        self.assertIn('genrePills(popularGenres(it,3))',JS)
        self.assertIn('.slice(0,max)',JS)
    def test_desc_is_not_reduced(self):
        self.assertIn('-webkit-line-clamp:4',CSS)
        self.assertIn('h(it.plot||',JS)
    def test_poster_aspect_ratio(self):
        self.assertIn('flex:0 0 196px',CSS)
        self.assertIn('aspect-ratio:2/3',CSS)
    def test_continue_watching_in_hero_and_secure_resume_endpoint(self):
        self.assertIn('${continueWatchingHero()}</section>',JS)
        self.assertIn("get('resume')",JS)
        self.assertIn('ReadResumeForAuthenticatedUserAsync',SERVICE)
        self.assertIn('[HttpGet("api/resume")]',CONTROLLER)
        self.assertIn('[Authorize]',CONTROLLER)
        self.assertIn('Users/Me',SERVICE)
        self.assertIn('MediaTypes=Video',SERVICE)
        self.assertIn('Text(Get(item, "SeriesId"))',SERVICE)
        self.assertIn('state.items.find(',JS)
    def test_js_behavior_on_real_sample_data(self):
        result=subprocess.run(['node',str(ROOT/'tests/ui_behavior.cjs')],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

    def test_original_player_untouched(self):
        self.assertIn('function openNative(',JS)
        self.assertIn('data-mf-jellyfin=',JS)

if __name__=='__main__': unittest.main()
