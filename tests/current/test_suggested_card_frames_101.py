"""Regression of the original native Similar card poster compositor (v0.4.103)."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web'


class SuggestedCardFrameV103(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.theme = (WEB / 'theme.css').read_text(encoding='utf-8')
        marker = '/* v0.4.104: similar cards show the personal watch state ON THE POSTER.'
        cls.block = cls.theme.split(marker, 1)[1].split('/* Mobile and narrow browser windows retain all native controls', 1)[0]

    def test_real_poster_not_outer_card_box_gets_one_frame(self):
        block = self.block
        self.assertIn('#itemDetailPage #similarCollapsible .similarContent', block)
        self.assertIn('.cardScalable::after', block)
        self.assertIn('background:var(--mf-similar-frame)!important', block)
        self.assertIn('outline:0!important;box-shadow:none!important', block)
        self.assertIn('border-color:transparent!important', block)
        self.assertIn('pointer-events:none', block)
        self.assertIn('-webkit-mask-composite:xor;mask-composite:exclude', block)
        self.assertNotIn('.cardBox::before', block)
        # Old v0.4.101/102 patch never affected the actual poster:
        self.assertNotIn('/* Sugerowane: the outer card frame', self.theme)
        self.assertNotIn('/* Sugerowane: the generic rose cardBox border', self.theme)

    def test_all_four_states_for_both_sources(self):
        b = self.block
        for attr in ['data-mf-watch', 'data-mf-simkl-watch']:
            for state in ['unwatched', 'started', 'watched']:
                self.assertIn(f'[{attr}="{state}"]', b)
        for color in ['#f4a5ce', '#e6a23c', '#45b879']:
            self.assertIn('--mf-similar-frame:' + color, b)
        self.assertIn('data-mf-mal-frame="mixed"', b)
        self.assertIn('data-mf-simkl-watch="mixed"', b)
        self.assertIn('--mf-similar-frame:linear-gradient(90deg,#e6a23c 0 50%,#45b879 50% 100%)', b)
        self.assertIn('.mf-simkl-native-media', b)
        self.assertIn('.mf-simkl-season-media', b)
        self.assertNotIn('data-mf-watch="unknown"] {--mf-similar-frame:', b)

    def test_shared_watch_logic_remains_unchanged(self):
        for source in ['client.js','mal.js','simkl.js','details.js','mal-frames.css','simkl.css']:
            self.assertTrue((WEB / source).is_file())
        # No new source of truth for watching; the existing MAL/Simkl attributes are read-only.
        self.assertNotIn('setAttribute(',self.block)

    def test_version_and_existing_release_workflows(self):
        meta = json.loads((ROOT / 'meta.json').read_text(encoding='utf-8'))
        self.assertRegex(meta['version'], r'^\d+\.\d+\.\d+\.\d+$')
        csproj = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf-8')
        for name, version in [('Version',meta['version'].removesuffix('.0')),('AssemblyVersion',meta['version']),('FileVersion',meta['version'])]:
            self.assertIn(f'<{name}>{version}</{name}>', csproj)
        for f in ['tools/sync_version.py','tools/package.py','.github/workflows/release.yml','.github/workflows/build.yml']:
            self.assertTrue((ROOT / f).is_file())


if __name__ == '__main__':
    unittest.main()
