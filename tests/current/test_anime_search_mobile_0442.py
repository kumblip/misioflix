"""0.4.42: mobile anime results match the 3-column native library, titles one line."""
from pathlib import Path
import unittest, json, re

ROOT=Path(__file__).resolve().parents[2]
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf8')

class AnimeSearchMobile0442(unittest.TestCase):
    def test_version_matches_assembly(self):
        version=json.loads((ROOT/'meta.json').read_text(encoding='utf8'))['version']
        self.assertGreaterEqual(tuple(map(int,version.split('.'))),(0,4,42,0))
        csproj=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text()
        self.assertIn(f'<AssemblyVersion>{version}</AssemblyVersion>',csproj)
    def test_only_anime_modal_gets_three_columns(self):
        self.assertIn('.mf-home-search-dialog[aria-label="Wyszukiwarka anime"] .mf-home-search-grid',CSS)
        self.assertRegex(CSS,r'grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important')
        self.assertNotIn('aria-label="Wyszukiwarka filmów i seriali"] .mf-home-search-grid',CSS)
    def test_one_line_mobile_anime_titles(self):
        block=CSS.split('/* v0.4.42 — Match the native AnimePL mobile density',1)[1]
        self.assertIn('.mf-modern-mixed-route .card[data-mf-anime="1"] .cardText-first',block)
        self.assertIn('.mf-home-search-dialog[aria-label="Wyszukiwarka anime"] .mf-home-card-title',block)
        for rule in ['white-space:nowrap!important','text-overflow:ellipsis!important','-webkit-line-clamp:unset!important']:
            self.assertIn(rule,block)
        self.assertIn('@media (max-width:680px)',block)
    def test_mal_outlines_and_paws_retained(self):
        for state in ('watched','started','unwatched'):
            self.assertIn(f'.card[data-mf-anime="1"][data-mf-watch="{state}"]',CSS)
        self.assertIn('.mf-home-paw',CSS)
        self.assertIn('.mf-native-stats',CSS)

if __name__=='__main__':unittest.main()
