"""Release numbering remains automatic even after restoring the 0.4.121 source."""
import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('next_release',ROOT/'tools/next_release_version.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class NextReleaseVersion(unittest.TestCase):
    def test_restored_good_version_never_reuses_old_tags(self):
        self.assertEqual(mod.next_version({'version':'0.4.121.0'},
          ['v0.4.121.0','v0.4.124.0','other','v0.4.117.0'],[]),'0.4.125.0')
    def test_manifest_prevents_reusing_deleted_tags(self):
        self.assertEqual(mod.next_version({'version':'0.4.121.0'},[],
          [{'versions':[{'version':'0.4.122.0'},{'version':'0.4.124.0'}]}]),'0.4.125.0')
    def test_unrelated_tags_ignored_and_next_release_increments(self):
        self.assertEqual(mod.next_version({'version':'0.4.125.0'},
          ['v0.5.999.0','v0.4.125.0','release-120'],[]),'0.4.126.0')
    def test_explicit_139_target_is_not_incremented_to_140(self):
        self.assertEqual(mod.next_version({'version':'0.4.139.0'},
          ['v0.4.137.0','v0.4.138.0'],[]),'0.4.139.0')
    def test_next_release_after_139_is_140(self):
        self.assertEqual(mod.next_version({'version':'0.4.139.0'},
          ['v0.4.139.0'],[]),'0.4.140.0')
    def test_not_automatically_bumping_build_workflow(self):
        build=(ROOT/'.github/workflows/build.yml').read_text()
        release=(ROOT/'.github/workflows/release.yml').read_text()
        self.assertNotIn('next_release_version.py',build)
        self.assertIn('python3 tools/next_release_version.py',release)
        self.assertIn('git add meta.json src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj manifest.json',release)
        self.assertIn('$(git rev-parse HEAD)',release)

if __name__=='__main__':unittest.main()
