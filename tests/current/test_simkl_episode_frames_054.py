"""v0.4.54: Simkl row frames are visually and logically isolated."""
from pathlib import Path
import re
import unittest
ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
JS=(WEB/'simkl.js').read_text(encoding='utf-8')
CSS=(WEB/'simkl.css').read_text(encoding='utf-8')
MAL=(WEB/'mal.js').read_text(encoding='utf-8')

class EpisodeFrames054(unittest.TestCase):
    def test_episode_frames_are_not_global_season_frames(self):
        self.assertIn('decorateEpisodeFrames(session)',JS)
        self.assertIn('watchedEpisodeNumbers',JS)
        self.assertIn('resumeEpisodes.has(episodeId)',JS)
        self.assertIn('if(!info)continue;',JS)
        self.assertIn('session.data?.relevant!==true',JS)
    def test_episode_scope_is_only_season_details(self):
        self.assertIn("page?.querySelector('.mf-detail-series-sections')",JS)
        self.assertIn("const key=`${session.user}:${session.seasonId}`",JS)
        self.assertIn('SeasonId:session.seasonId',JS)
        self.assertIn("row.classList.add('mf-simkl-episode-row')",JS)
    def test_no_mal_css_or_mutation(self):
        self.assertNotIn('mf-simkl-episode-row',MAL)
        self.assertNotIn('.mf-mal-',re.sub(r'/\*.*?\*/','',CSS,flags=re.S))
        self.assertIn('pointer-events:none',CSS)
        self.assertIn('mask-composite:exclude',CSS)
    def test_states_are_own_classes(self):
        for state, color in [('unwatched','#f4a5ce'),('started','#e6a23c'),('watched','#45b879'),('mixed','linear-gradient(90deg')]:
            self.assertIn(f'data-mf-simkl-episode-watch="{state}"',CSS)
            self.assertIn(color,CSS)
    def test_cleanup_on_user_change_and_route(self):
        self.assertIn('episodeIndex.clear();invalidateSeasonProgress();clearEpisodeFrames();clearDetailFrames();',JS)
        self.assertIn('clearEpisodeFrames();clearDetailFrames();panel?.remove()',JS)

if __name__=='__main__':unittest.main()
