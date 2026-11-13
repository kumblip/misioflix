"""v0.4.41: restore proven native AnimePL badge DOM and MAL-only card outlines."""
import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'src/Jellyfin.Plugin.MisioFlix'
WEB = BASE / 'Web'
CLIENT = (WEB / 'client.js').read_text(encoding='utf-8')
MAL = (WEB / 'mal.js').read_text(encoding='utf-8')
CSS = (WEB / 'theme.css').read_text(encoding='utf-8')

class AnimeFramesMobile0441(unittest.TestCase):
    def test_version_uses_project_metadata(self):
        ver = json.loads((ROOT/'meta.json').read_text())['version']
        self.assertGreaterEqual(tuple(map(int,ver.split('.'))), (0,4,41,0))
        csproj = (BASE/'Jellyfin.Plugin.MisioFlix.csproj').read_text()
        self.assertIn(f'<AssemblyVersion>{ver}</AssemblyVersion>', csproj)
    def test_restore_v039_single_year_ornament_without_reparenting_native_cards(self):
        self.assertIn("topLeft.appendChild(makeEl('span','mf-native-year',year+format));",CLIENT)
        self.assertNotIn("makeEl('span','mf-native-format',format)",CLIENT)
        self.assertIn('surface.appendChild(overlay)',CLIENT)
        self.assertNotIn('addScrollEventListener',CLIENT)
        self.assertIn('resetCardIfReused(card)',CLIENT)
        self.assertIn('if(modernMixedRoute() && (!card.closest(',CLIENT)
    def test_personal_mal_only_unchanged_for_movies_and_series(self):
        self.assertIn("if(cardKind(card)==='anime')card.dataset.mfWatch='unknown'",CLIENT)
        self.assertIn("const state=entry?statusState(entry):(malId>0&&snapshot.full?'unwatched':'unknown');",MAL)
        self.assertIn("card.setAttribute('data-mf-watch',state)",MAL)
        self.assertIn("if(overlayChanged)window.dispatchEvent(new Event('misioflix-mal-cards-updated'))",MAL)
    def test_details_seasons_similar_and_native_all_get_same_three_colors(self):
        for status,color in [('unwatched','#f4a5ce'),('started','#e6a23c'),('watched','#45b879')]:
            self.assertIn(f'.card[data-mf-anime="1"][data-mf-watch="{status}"]',CSS)
            self.assertIn(f'--mf-mal-card-border:{color}',CSS)
        self.assertIn('.cardScalable::after',CSS)
        self.assertIn('pointer-events:none',CSS)
        self.assertIn('content:none',CSS) # Unknown is never faked as watched.
        self.assertIn('position:absolute',CSS)
    def test_mobile_paw_size_and_anime_search_match_library(self):
        self.assertIn('width:10px!important;height:10px!important',CSS)
        self.assertIn('font-size:10px!important;line-height:1.03!important',CSS)
        self.assertIn('.mf-home-search-grid .mf-home-poster[data-mf-item-id] .mf-home-kind {display:none!important}',CSS)
        self.assertIn('.mf-home-search-grid .mf-home-card:has(.mf-home-poster[data-mf-item-id]) .mf-home-card-title',CSS)
        self.assertIn('.mf-home-search-grid .mf-home-card:has(.mf-home-poster[data-mf-item-id]) .mf-home-card-desc',CSS)
        self.assertIn('.mf-home-search-grid .mf-home-poster[data-mf-item-id] .mf-home-stats',CSS)
    def test_scripts_still_parse(self):
        for name in ('client.js','mal.js','home.js','details.js'):
            subprocess.run(['node','--check',str(WEB/name)],check=True,capture_output=True)

if __name__=='__main__':unittest.main()
