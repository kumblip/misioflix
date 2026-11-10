import json
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NFO = ROOT / "tests" / "tvshow.nfo"
JS = ROOT / "src" / "Jellyfin.Plugin.MisioFlix" / "Web" / "client.js"
CSS = ROOT / "src" / "Jellyfin.Plugin.MisioFlix" / "Web" / "theme.css"

class SourceTests(unittest.TestCase):
    def test_anime_romanized_title_and_genres_from_sample_nfo(self):
        node = ET.parse(NFO).getroot()
        self.assertEqual(node.findtext('originaltitle'), 'Aho Girl')
        self.assertEqual([el.text for el in node.findall('genre')],
                         ['Komedia', 'Protagonistka', 'Slice of Life', 'Szkoła'])
        self.assertIn('Typ: Seria TV', [t.text for t in node.findall('tag')])
    def test_no_injected_external_plugins(self):
        client = JS.read_text(encoding='utf-8')
        self.assertIn('/MisioFlix/api/', client)
        self.assertIn('search-anime', client)
        self.assertIn('search-media', client)
        self.assertNotIn('/misioflix/api/', client)
        self.assertNotIn('https://cdn.', client)
    def test_assets_embedded(self):
        base = JS.parent
        for name in ['client.js', 'theme.css', 'assets/logo.png', 'assets/mark.png', 'assets/background.png']:
            self.assertTrue((base / name).is_file(), name)
        self.assertIn('/MisioFlix/assets/background.png', CSS.read_text(encoding='utf-8'))
    def test_jellyfin_plugin_manifest(self):
        m = json.loads((ROOT / 'meta.json').read_text(encoding='utf-8'))
        self.assertEqual(m['version'], '0.4.6.0')
        self.assertEqual(m['targetAbi'], '12.4.0.0')
        self.assertEqual(m['assemblies'], ['Jellyfin.Plugin.MisioFlix.dll'])

if __name__ == '__main__':
    unittest.main()
