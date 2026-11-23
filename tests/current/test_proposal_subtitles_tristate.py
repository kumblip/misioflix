import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
class ProposalSubtitlesTristate(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.web=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf-8')
        cls.server=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')
        cls.css=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf-8')
    def test_modes_labels_and_defaults(self):
        self.assertIn("recommendationSubtitlesMode = 'all'",self.web)
        self.assertIn("recommendationSubtitlesMode='all'",self.web)
        self.assertIn("const titles={all:'Wszystkie',pl:'Napisy PL',en:'Napisy EN'}",self.web)
        self.assertIn("recommendationSubtitlesMode==='all'?'pl'",self.web)
        self.assertIn("recommendationSubtitlesMode==='pl'?'en':'all'",self.web)
        self.assertIn('switches.appendChild(recommendationSubtitlesToggle());',self.web)
        self.assertIn("pl:'Audio PL'",self.web)
        self.assertIn("original:'Audio nie-PL'",self.web)
    def test_index_is_identical_to_audio_and_flags(self):
        for item in ('pl_subtitles = KnownSubtitles(itemId, "pl")','en_subtitles = KnownSubtitles(itemId, "en")'):
            self.assertEqual(self.server.count(item),2)
        self.assertIn('LanguageFlagsCache.TryGetValue(id.ToString("N"), out var flags)',self.server)
        self.assertIn('availability is "subtitles" or "both"',self.server)
        self.assertIn('return flags.partial ? null : false;',self.server)
        self.assertIn('public bool? pl_subtitles { get; set; }',self.server)
        self.assertIn('public bool? en_subtitles { get; set; }',self.server)
        self.assertIn('Path.Combine(applicationPaths.DataPath, "misioflix", "language-flags-index.json")',self.server)
    def test_no_per_click_scan_or_new_api(self):
        start=self.web.index('  function recommendationSubtitlesToggle(){')
        end=self.web.index('  function randomizeRecommendations(pool){',start)
        src=self.web[start:end]
        self.assertNotIn('await request(',src)
        self.assertNotIn('fetch(',src)
        self.assertNotIn('RefreshLanguageFlagsIndexAsync',src)
        self.assertIn("if(recommendationSubtitlesMode==='all')return true;",src)
        self.assertIn("item?.pl_subtitles===true",src)
        self.assertIn("item?.en_subtitles===true",src)
        self.assertIn('if(!recommendationHasRequestedSubtitles(item))return false;',self.web)
    def test_css_three_states_present(self):
        for state in ('all','pl','en'):
            self.assertIn('mf-home-subtitles-toggle[data-mf-subtitles-mode="'+state+'"]',self.css)
if __name__=='__main__':unittest.main()
