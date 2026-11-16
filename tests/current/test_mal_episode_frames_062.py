"""v0.4.62: read-only MAL anime episode borders without Simkl/metadata changes."""
from version_contract import CURRENT_RELEASE
from pathlib import Path
import json
import unittest
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
WEB=SRC/'Web'
MAL=(WEB/'mal.js').read_text('utf8')
CSS=(WEB/'mal-frames.css').read_text('utf8')
SIMKL=(WEB/'simkl.js').read_text('utf8')

class MalEpisodeFrames062(unittest.TestCase):
    def test_version_and_original_skins_retained(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'], CURRENT_RELEASE)
        self.assertIn(f'AssemblyVersion>{CURRENT_RELEASE}',(SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text())
        self.assertIn('assets/mal-frames.css?v=',(SRC/'Services/ScriptInjection.cs').read_text())
    def test_read_only_and_native_per_episode_jellyfin_source(self):
        section=MAL[MAL.index('const malEpisodeIndexes=new Map();'):MAL.index('function saveIndexEntry(')]
        self.assertIn("EnableUserData:'true'",section)
        self.assertIn("params.set('SeasonId',session.seasonId)",section)
        self.assertIn('item?.UserData?.Played===true',section)
        self.assertIn('malResumeEpisodes.has(episodeId)',section)
        self.assertIn("statusState(session.entry)==='watched'",section)
        self.assertIn("session.animeVerified!==true",section)
        self.assertIn("if(!info)continue;",section)
        self.assertNotIn("request('/update'",section)
        self.assertNotIn('POST',section)
        self.assertNotIn('mf-simkl-',section)
    def test_every_state_and_only_season_episode_rows(self):
        for state,color in [('unwatched','#f4a5ce'),('started','#e6a23c'),('watched','#45b879'),('mixed','--mf-mal-episode-left:#45b879')]:
            self.assertIn(f'data-mf-mal-episode-watch="{state}"',CSS)
            self.assertIn(color,CSS)
        self.assertIn('.mf-detail-series-sections .mf-mal-episode-row',CSS)
        self.assertIn('pointer-events:none',CSS)
        self.assertIn('width:4px',CSS)
        self.assertIn('height:4px',CSS)
        self.assertIn('::after',CSS)
        self.assertNotIn('mf-simkl-episode-row',CSS)
    def test_cleanup_and_lifecycle(self):
        self.assertIn('malEpisodeIndexes.clear();clearMalEpisodeFrames();',MAL)
        self.assertIn('malResumeEpisodes=new Set()',MAL)
        self.assertIn('clearMalEpisodeFrames();\n    if(detailPanel?.isConnected)',MAL)
        self.assertIn('decorateMalEpisodeFrames();\n    void refreshMalResume()',MAL)
        self.assertIn('row.setAttribute(\'data-mf-mal-episode-watch\',state);',MAL)
    def test_simkl_remains_isolated_under_064_layout(self):
        import hashlib
        self.assertEqual(hashlib.sha256(SIMKL.encode()).hexdigest(),
            '54820d94422fd5f7abbf1336199cfc7499b8a0d9051b175abd0a1e28a87f43d8')

if __name__=='__main__':unittest.main()
