"""Safety and isolation checks for the Simkl-only detail/thumbnail borders."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
SIMKL=(SRC/'Web/simkl.js').read_text()
CSS=(SRC/'Web/simkl.css').read_text()
CTRL=(SRC/'Controllers/MisioFlixSimklController.cs').read_text()
MAL=(SRC/'Web/mal.js').read_text()
THEME=(SRC/'Web/theme.css').read_text()
HOME=(SRC/'Web/home.js').read_text()
CLIENT=(SRC/'Web/client.js').read_text()

class SimklFrames052(unittest.TestCase):
    def test_api_scoped_and_per_user(self):
        self.assertIn('_local.ReadAsync(user,cancel)',CTRL)
        self.assertIn('AuthorizedSimklCardTargetsAsync',CTRL)
        self.assertIn('if(matches.Length!=1)continue',CTRL)
        self.assertIn('states[target.Key]=new {status=found.Status',CTRL)
        self.assertIn('return Ok(new {scores,states})',CTRL)
        self.assertNotIn('_simkl.ReadItemAsync',CTRL.split('CardScores(',1)[1].split('[HttpGet("connection")]',1)[0])
    def test_separate_mal_styles(self):
        for name in ('mf-simkl-media-poster','mf-simkl-native-media','mf-simkl-detail-ready','mf-simkl-detail-score'):
            self.assertIn(name,CSS)
            self.assertNotIn(name,MAL)
        self.assertNotIn('html.misioflix-skin .mf-mal-',CSS)
        self.assertIn('mf-detail-mal-rating',THEME)
    def test_exact_split_frame(self):
        self.assertIn('linear-gradient(90deg,#e6a23c 0 50%,#45b879 50% 100%)',CSS)
        self.assertIn('#f4a5ce',CSS)
        self.assertIn('#e6a23c',CSS)
        self.assertIn('#45b879',CSS)
        self.assertIn('mask-composite:exclude',CSS)
    def test_resume_excludes_next_up_and_hidden(self):
        self.assertIn("fetch('/MisioFlix/api/resume'",SIMKL)
        self.assertIn('row?.next_up===true',SIMKL)
        self.assertIn('Number(row?.position_ticks)>0',SIMKL)
        self.assertIn('resumeSeasons',SIMKL)
        self.assertIn('data-mf-simkl-watch',SIMKL)
        self.assertIn('resumeForUser=new Set()',SIMKL)
    def test_rating_in_details_only_nonanime_movie_series(self):
        self.assertIn("const type=session.episodeId?'Episode':session.seasonId?'Season':",SIMKL)
        self.assertIn("const actions=page.querySelector('.mainDetailButtons')",SIMKL)
        self.assertIn("if(type==='Season'||!data.connected)",SIMKL)
        self.assertIn("badge.append(el('span','mf-simkl-detail-score-number',value),simklPaw()",SIMKL)
        self.assertIn("card.dataset.mfAnime==='1'",SIMKL)
        self.assertIn('link.dataset.mfSimklId',HOME)
        self.assertIn('data-mf-card',CLIENT)
    def test_no_player_or_mal_changes(self):
        self.assertNotIn('misioflix-simkl',MAL)
        self.assertNotIn('mf-simkl-detail-ready',THEME)

if __name__=='__main__':unittest.main()
