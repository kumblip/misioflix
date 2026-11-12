"""Regression: native AnimePL /mixed WebComponent must own its card child nodes."""
import json
import subprocess
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
JS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/client.js').read_text()
MAL=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/mal.js').read_text()
class MixedNative0435(unittest.TestCase):
    def test_version_and_node(self):
        version=json.loads((ROOT/'meta.json').read_text())['version']
        self.assertGreaterEqual(tuple(map(int,version.split('.'))),(0,4,35,0))
        self.assertIn(f'<AssemblyVersion>{version}</AssemblyVersion>',(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text())
        for name in ('client.js','mal.js'):
            subprocess.run(['node','--check',str(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'/name)],check=True,capture_output=True)
    def test_native_mixed_route_has_safe_path(self):
        self.assertIn('const modernMixedRoute=',JS)
        self.assertIn('if(modernMixedRoute())return; // Preserve the native Jellyfin virtual list unchanged.', JS)
        self.assertIn('function attachOverlay(card){\n    // Never append nested overlays',JS)
        self.assertIn('if(modernMixedRoute()){\n      // Attribute-only integration',JS)
        self.assertIn('if(modernMixedRoute()){\n      // Native #/mixed never gets appended badges',JS)
    def test_mal_counts_not_fabricated(self):
        self.assertIn("timesRewatched:optionalCount",MAL)
        self.assertIn("episodesWatched:optionalCount",MAL)
        self.assertIn('episodesEdited=false,rewatchesEdited=false',MAL)
        self.assertIn("watchCount===null?'Brak danych'",MAL)
if __name__=='__main__':unittest.main()
