"""Read-only language ornaments, user scoping and media-availability contracts."""
import re
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
SERV=ROOT/'src/Jellyfin.Plugin.MisioFlix/Services'
CTRL=ROOT/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs'

class LanguageFlags126(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.js=(WEB/'language-flags.js').read_text(encoding='utf8')
        cls.css=(WEB/'language-flags.css').read_text(encoding='utf8')
        cls.service=(SERV/'MisioFlixCatalogService.cs').read_text(encoding='utf8')
        cls.controller=CTRL.read_text(encoding='utf8')
        cls.injection=(SERV/'ScriptInjection.cs').read_text(encoding='utf8')

    def test_semantics_and_both_sources(self):
        for mode in ['audio','subtitles','both']:
            self.assertIn(mode,self.js)
        for stream_type in ['"Audio"','"Subtitle"']:
            self.assertIn(stream_type,self.service)
        self.assertIn('Get(item, "MediaStreams")',self.service)
        self.assertIn('Get(source, "MediaStreams")',self.service)
        self.assertIn('return audio && subs ? "both"',self.service)
        self.assertIn('Source',self.service)
        self.assertNotIn('AnimeRoot)',self.service.split('public async Task<List<LanguageFlagInfo>>')[1].split('private sealed class TrackAvailability')[0])

    def test_access_and_pagination(self):
        self.assertRegex(self.controller,r'HttpGet\("api/language-flags"\)\]\s*\[Authorize\]')
        self.assertIn('AuthenticatedUserAsync(caller, cancel)', self.service)
        self.assertIn('requestedSet.Contains(id)',self.service)
        self.assertIn('ParentId={id:N}&Recursive=true&IncludeItemTypes=Episode',self.service)
        self.assertIn('LanguageFlagsCache',self.service)
        self.assertIn('userId + ":"',self.service)
        self.assertIn('maxEpisodes = 3000',self.service)

    def test_independent_embedded_assets(self):
        for filename in ('language-flags.js','language-flags.css'):
            self.assertIn(filename,self.controller)
            self.assertIn(filename,self.injection)
        self.assertIn('document.querySelectorAll(selector)',self.js)
        self.assertIn('IntersectionObserver',self.js)
        self.assertIn('tokenGuard()',self.js)
        self.assertIn('.mf-home-card .mf-home-poster',self.js)
        self.assertIn('.card[data-id]',self.js)
        self.assertIn('.mf-home-resume-card',self.js)
        self.assertIn('data-mf-language-id',self.js)
        self.assertIn('data-mf-language-id', (WEB/'home.js').read_text(encoding='utf8'))
        self.assertIn('pointer-events:none',self.css)
        self.assertNotIn('setTimeout(()=>window.location.reload',self.js)

    def test_draws_three_distinct_shapes_for_each_flag(self):
        self.assertIn("mode === 'audio'", self.js)
        self.assertIn("mode === 'subtitles'",self.js)
        self.assertIn('clipPath',self.js)
        self.assertIn("language === 'pl'",self.js)
        self.assertIn("'#012169'",self.js)
        self.assertIn("'#dc143c'",self.js)
        self.assertIn("modeLabel[value]",self.js)

if __name__=='__main__': unittest.main()
