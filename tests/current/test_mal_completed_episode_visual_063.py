"""v0.4.63 regressions: MAL completion and real resume color, no mutations."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
MAL=(WEB/'mal.js').read_text('utf8')
class CompletedMalEpisodeVisual063(unittest.TestCase):
    def test_completed_season_is_authoritative_for_its_episodes(self):
        block=MAL[MAL.index('function malEpisodeVisualState('):MAL.index('function saveIndexEntry(')]
        self.assertIn('const watched=malCompleted===true||played===true;',block)
        self.assertIn("return watched?'watched':'unwatched'",block)
        self.assertIn("statusState(session.entry)==='watched'",block)
        self.assertIn('SeasonId:session.seasonId',MAL)
        self.assertIn('session.animeVerified!==true',block)
    def test_resume_is_exact_ongoing_episode(self):
        block=MAL[MAL.index('async function refreshMalResume()'):MAL.index('const malEpisodeIndexes=new Map();')]
        self.assertIn('if(row?.next_up===true||!(Number(row?.position_ticks)>0))continue;',block)
        self.assertIn('if(valid(row?.id))episodes.add(compact(row.id));',block)
        self.assertIn('malResumeEpisodes=episodes;',block)
    def test_only_visual_without_provider_or_played_writes(self):
        block=MAL[MAL.index('async function refreshMalResume()'):MAL.index('function saveIndexEntry(')]
        self.assertNotIn("request('/update'",block)
        self.assertNotIn("'POST'",block)
        self.assertNotIn('mf-simkl-',block)
        self.assertIn('malResumeEpisodes.has(episodeId)',block)
if __name__=='__main__':unittest.main()
