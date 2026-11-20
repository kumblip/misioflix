import json
import re
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
HOME=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf-8')
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf-8')

class LibrariesVisibility106(unittest.TestCase):
    def test_only_home_shelves_hidden(self):
        mount=HOME.split('  function mount(host){',1)[1].split('  function unmountHome(){',1)[0]
        self.assertLess(mount.index('homeRoot.appendChild(resumeShelf())'),mount.index('homeRoot.appendChild(libraryShelvesToggle())'))
        self.assertLess(mount.index('homeRoot.appendChild(libraryShelvesToggle())'),mount.index('homeRoot.appendChild(rowsArea)'))
        self.assertIn("rowsArea.hidden=true",mount)
        self.assertIn("homeRoot.appendChild(hero(discoveryRefs.section))",mount)
        self.assertIn('homeRoot.appendChild(collectionsPage.section)',mount)
        self.assertIn('void loadLibraries(serial)',mount)
        self.assertIn('void loadResume(serial)',mount)

    def test_switch_is_button_with_default_off_state(self):
        toggle=HOME.split('  function libraryShelvesToggle(){',1)[1].split('  async function loadLibraries(serial){',1)[0]
        self.assertIn("button.setAttribute('role','switch')",toggle)
        self.assertIn("button.setAttribute('aria-checked','false')",toggle)
        self.assertIn("button.setAttribute('aria-expanded','false')",toggle)
        self.assertIn("button.setAttribute('aria-controls','mf-home-rows')",toggle)
        self.assertIn("const show=area.hidden",toggle)
        self.assertIn('area.hidden=!show',toggle)
        self.assertNotIn('sessionStorage',toggle)
        self.assertNotIn('localStorage',toggle)

    def test_old_layout_and_release_mechanism(self):
        self.assertIn('.mf-home-0412 [hidden]{display:none!important}',CSS)
        self.assertIn('mf-home-libraries-toggle[aria-checked="true"]',CSS)
        self.assertIn('html.misioflix-skin .mf-home-rows{display:flex',CSS)
        self.assertEqual(json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))['version'],'0.4.106.0')
        for path in ['tools/package.py','tools/sync_version.py','.github/workflows/build.yml','.github/workflows/release.yml']:
            self.assertTrue((ROOT/path).is_file(),path)

if __name__=='__main__':
    unittest.main()
