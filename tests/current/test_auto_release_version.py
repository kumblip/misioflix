"""Automatic release-number selection never overwrites a published Git tag."""
import importlib.util
from pathlib import Path
import unittest

MODULE_PATH = Path(__file__).resolve().parents[2] / 'tools' / 'next_release.py'
SPEC = importlib.util.spec_from_file_location('misioflix_next_release', MODULE_PATH)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)

class ReleaseVersioningTests(unittest.TestCase):
    def test_increment_when_metadata_matches_published_release(self):
        self.assertEqual(MOD.next_version('0.4.121.0', ['v0.4.120.0', 'v0.4.121.0']), '0.4.122.0')

    def test_skip_higher_tag_when_meta_is_stale(self):
        self.assertEqual(MOD.next_version('0.4.121.0', ['v0.4.124.0']), '0.4.125.0')

    def test_preserve_explicit_unpublished_higher_version(self):
        self.assertEqual(MOD.next_version('0.4.128.0', ['v0.4.121.0']), '0.4.128.0')

    def test_tag_with_build_segment_is_handled(self):
        self.assertEqual(MOD.next_version('0.4.121.0', ['v0.4.121.1']), '0.4.122.0')

    def test_no_tags_can_release_existing_meta(self):
        self.assertEqual(MOD.next_version('0.4.1.0', []), '0.4.1.0')

    def test_ignore_unrelated_tags(self):
        self.assertEqual(MOD.next_version('0.4.121.0', ['junk', 'my-release', 'v0.4.121.0']), '0.4.122.0')

    def test_invalid_version_is_rejected(self):
        with self.assertRaises(ValueError):
            MOD.next_version('0.4.x.0', ['v0.4.121.0'])

if __name__ == '__main__':
    unittest.main()
