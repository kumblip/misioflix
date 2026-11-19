import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CSS = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'

class SuggestedCardFrameV101(unittest.TestCase):
    def test_scoped_completed_similar_only(self):
        text = CSS.read_text(encoding='utf-8')
        marker = '/* Sugerowane: the generic rose cardBox border'
        self.assertEqual(text.count(marker), 1)
        rule = text.split(marker, 1)[1].split('}', 1)[0]
        self.assertIn('#itemDetailPage #similarCollapsible .similarContent', rule)
        self.assertIn('.card[data-mf-card="1"]', rule)
        self.assertIn('[data-mf-watch="watched"]', rule)
        self.assertIn('[data-mf-simkl-watch="watched"]', rule)
        self.assertIn('[data-mf-simkl-watch="mixed"]', rule)
        self.assertIn('> .cardBox', rule)
        self.assertIn('border-color:transparent!important', rule)
        self.assertNotIn('unwatched', rule)
        self.assertNotIn('started', rule)

    def test_original_release_mechanism_and_version(self):
        meta = json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))
        self.assertEqual(meta['version'], '0.4.101.0')
        csproj = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf-8')
        for name, value in [('Version', '0.4.101'), ('AssemblyVersion','0.4.101.0'), ('FileVersion','0.4.101.0')]:
            self.assertIn(f'<{name}>{value}</{name}>', csproj)
        for f in ['tools/sync_version.py','tools/package.py','.github/workflows/release.yml','.github/workflows/build.yml']:
            self.assertTrue((ROOT/f).is_file())

if __name__=='__main__': unittest.main()
