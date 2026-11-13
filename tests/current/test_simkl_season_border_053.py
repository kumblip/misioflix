"""Focused regression tests for v0.4.53: poster anchoring + season resume."""
import re
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
SVC=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text()
CSS=(WEB/'simkl.css').read_text()
JS=(WEB/'simkl.js').read_text()
CLIENT=(WEB/'client.js').read_text()
MAL=(WEB/'mal.js').read_text()

class SimklSeasonBorder053(unittest.TestCase):
    def test_detail_frame_is_anchored_to_poster_not_detail_page(self):
        selector='html.misioflix-skin #itemDetailPage.mf-detail-compact.mf-simkl-detail-ready .mf-detail-poster-rail > .detailImageContainer {'
        self.assertIn(selector,CSS)
        pos=CSS.index(selector)
        decl=CSS[pos:CSS.index('}',pos)]
        self.assertIn('position:relative!important',decl)
        self.assertIn('isolation:isolate',decl)
        self.assertIn('.mf-detail-poster-rail > .detailImageContainer::after',CSS)
    def test_new_season_frames_do_not_inherit_global_series_rating(self):
        self.assertIn('mf-simkl-season-media',CSS)
        self.assertIn("if(mediaType==='season')continue",JS)
        self.assertIn("resumeSeasons.get(parent)?.has(season)",JS)
        self.assertIn('card.classList.add(\'mf-simkl-season-media\')',JS)
        self.assertIn('card.querySelector(\'.mf-simkl-native-score\')?.remove()',JS)
        self.assertIn("data-mf-simkl-series",CLIENT)
        self.assertIn("data-mf-simkl-season",CLIENT)
    def test_season_identity_from_jellyfin_not_title(self):
        self.assertIn('simklSeriesId = seasonParentId',SVC)
        self.assertIn('simklSeasonNumber = simklIndex',SVC)
        self.assertIn('if (type == "Season" && !anime)',SVC)
        self.assertIn('Get(item,"SeriesId")',SVC)
        self.assertIn('Get(item,"IndexNumber")',SVC)
        self.assertIn('misioflix-simkl-season-ready',JS)
    def test_rating_has_no_redundant_simkl_label_and_stretches_to_buttons(self):
        self.assertIn("badge.append(el('span','mf-simkl-detail-score-number',value),simklPaw())",JS)
        self.assertIn('align-self:stretch',CSS)
        self.assertIn('Bez oceny',JS)
    def test_no_mal_modified(self):
        self.assertNotIn('mf-simkl-season-media',MAL)
        self.assertNotIn('data-mf-simkl-series',MAL)

if __name__=='__main__':unittest.main()
