"""Regression: Jellyfin 12.4 episode rows live under primary #childrenContent.

The v0.4.67 no-reparent change kept the native DOM structure intact.
In v0.4.70 MAL/Simkl still scanned the secondary container, causing no
state classes to be applied despite correct CSS. Do not regress to that.
"""
from pathlib import Path
import unittest
import json

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web'
MAL = (WEB/'mal.js').read_text(encoding='utf8')
SIMKL = (WEB/'simkl.js').read_text(encoding='utf8')
DETAILS = (WEB/'details.js').read_text(encoding='utf8')

class NativeEpisodePrimary071(unittest.TestCase):
    def test_release(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text(encoding='utf8'))['version'], '0.4.91.0')
    def test_actual_native_children_container_both_providers(self):
        for provider,source in [('MAL',MAL),('Simkl',SIMKL)]:
            with self.subTest(provider=provider):
                start=source.index('function decorateMalEpisodeFrames' if provider=='MAL' else 'function decorateEpisodeFrames')
                end=source.index('function saveIndexEntry' if provider=='MAL' else 'function decorateDetailFrame',start)
                region=source[start:end]
                self.assertIn("page?.querySelector('#listChildrenCollapsible #childrenContent')",region)
                self.assertNotIn("page?.querySelector('.mf-detail-series-sections')",region)
                self.assertIn("row.classList.add('mf-",region)
                self.assertIn("if(!info)continue",region)
    def test_actual_native_row_buttons_trigger_visual_refresh(self):
        self.assertIn("#itemDetailPage #listChildrenCollapsible .mf-mal-episode-row",MAL)
        self.assertNotIn('request(\'/update\'',MAL[MAL.index('function decorateMalEpisodeFrames'):MAL.index('function saveIndexEntry')])
    def test_original_jellyfin_containers_preserved(self):
        self.assertIn("secondary.classList.add('mf-detail-series-sections')",DETAILS)
        self.assertIn('NEVER reparent a Jellyfin-owned node',DETAILS)
    def test_svg_paws_have_complete_path(self):
        # Browser verified the previous path ended in an incomplete C command.
        for provider,source in [('MAL',MAL),('Simkl',SIMKL)]:
            with self.subTest(provider=provider):
                self.assertIn('-1.7-2.1-3-4.8-4 0Z',source)
                self.assertNotIn('-1.7-2.1-3-4.8-4Z',source)

if __name__=='__main__': unittest.main()
