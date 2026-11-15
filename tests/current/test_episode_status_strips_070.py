"""Episode-only side/bottom markers, no full borders, no provider mutations."""
from pathlib import Path
import json, unittest
ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
MAL=(WEB/'mal-frames.css').read_text('utf8')
SIMKL=(WEB/'simkl.css').read_text('utf8')
MALJS=(WEB/'mal.js').read_text('utf8')
SIMKLJS=(WEB/'simkl.js').read_text('utf8')
DETAILS=(WEB/'details.js').read_text('utf8')

class StatusStrips070(unittest.TestCase):
    def test_current_version(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'],'0.4.70.0')
    def test_colors_are_only_on_left_except_mixed_bottom(self):
        for css,key in [(MAL,'mal'),(SIMKL,'simkl')]:
            for state,color in [('unwatched','#f4a5ce'),('started','#e6a23c'),('watched','#45b879'),('mixed','#45b879')]:
                self.assertIn(f'[data-mf-{key}-episode-watch="{state}"]',css)
                self.assertIn(f'--mf-{key}-episode-left:{color}',css)
            block=css[css.index('/* v0.4.70'):css.index('/* v0.4.6',css.index('/* v0.4.70')+5)] if key=='mal' else css[css.index('/* v0.4.70: independent'):css.index('/* v0.4.56')]
            self.assertIn('width:4px;',block)
            self.assertIn('height:4px;',block)
            self.assertIn('pointer-events:none',block)
            self.assertIn('background:none!important',block)
            self.assertNotIn('mask-composite:exclude',block)
            self.assertNotIn('padding:2px',block)
    def test_mal_read_only_series_support(self):
        segment=MALJS[MALJS.index('const malEpisodeIndexes=new Map();'):MALJS.index('function saveIndexEntry(')]
        self.assertIn('session.seasonId||session.catalogId',segment)
        self.assertIn('cache.multipleSeasons=seasonIds.size!==1;',segment)
        self.assertIn('!episodeData.multipleSeasons',segment)
        self.assertIn('malResumeEpisodes.has(episodeId)',segment)
        self.assertNotIn("request('/update'",segment)
        self.assertNotIn('POST',segment)
    def test_no_reparent_or_simkl_sync_changes(self):
        self.assertIn('NEVER reparent a Jellyfin-owned node',DETAILS)
        self.assertIn('decorateEpisodeFrames(session)',SIMKLJS)
        self.assertNotIn('mf-simkl-episode-row',MALJS)

if __name__=='__main__':unittest.main()
