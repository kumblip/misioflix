import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CSS = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'

class SuggestedCardFrameV102(unittest.TestCase):
    def test_scoped_stateful_similar_only(self):
        text = CSS.read_text(encoding='utf-8')
        marker = '/* Sugerowane: the outer card frame in the native Similar section must use'
        self.assertEqual(text.count(marker), 1)
        block = text.split(marker, 1)[1].split('/* Mobile and narrow browser windows retain all native controls', 1)[0]
        self.assertIn('#itemDetailPage #similarCollapsible .similarContent', block)
        self.assertIn('[data-mf-watch="unwatched"]', block)
        self.assertIn('[data-mf-watch="started"]', block)
        self.assertIn('[data-mf-watch="watched"]', block)
        self.assertIn('[data-mf-mal-frame="mixed"]', block)
        self.assertIn('[data-mf-simkl-watch="unwatched"]', block)
        self.assertIn('[data-mf-simkl-watch="started"]', block)
        self.assertIn('[data-mf-simkl-watch="watched"]', block)
        self.assertIn('[data-mf-simkl-watch="mixed"]', block)
        self.assertIn('border-color:#f4a5ce!important', block)
        self.assertIn('border-color:#e6a23c!important', block)
        self.assertIn('border-color:#45b879!important', block)
        self.assertIn('background:linear-gradient(90deg,#e6a23c 0 50%,#45b879 50% 100%)', block)

    def test_original_release_mechanism_and_version(self):
        meta = json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))
        self.assertEqual(meta['version'], '0.4.102.0')
        csproj = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf-8')
        for name, value in [('Version', '0.4.102'), ('AssemblyVersion','0.4.102.0'), ('FileVersion','0.4.102.0')]:
            self.assertIn(f'<{name}>{value}</{name}>', csproj)
        for f in ['tools/sync_version.py','tools/package.py','.github/workflows/release.yml','.github/workflows/build.yml']:
            self.assertTrue((ROOT/f).is_file())

if __name__=='__main__': unittest.main()
