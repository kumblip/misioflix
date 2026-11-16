"""Regression v0.4.94: the single box badge does not reserve paw-stack width."""
from pathlib import Path
import json
import unittest
from version_contract import CURRENT_RELEASE, PROJECT_ROOT

ROOT = PROJECT_ROOT
WEB = ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
CSS = (WEB/'theme.css').read_text(encoding='utf-8')

class CompactMemberBadge094(unittest.TestCase):
    def test_only_collection_member_makes_frame_shrink_to_contents(self):
        css = CSS[CSS.index('/* v0.4.94: the box is the ONLY badge'):]
        self.assertIn('.mf-native-stats:has(> .mf-native-collection-member:only-child)', css)
        self.assertIn('.mf-home-stats:has(> .mf-home-member-collection:only-child)', css)
        self.assertIn('width:max-content;', css)
        self.assertIn('min-width:0;', css)
        self.assertIn('padding:3px 4px;', css)
        self.assertIn('align-self:auto;', css)
        self.assertIn('padding:2px 3px;', css)

    def test_multiple_stats_and_metadata_are_unchanged(self):
        css = CSS[CSS.index('/* v0.4.94: the box is the ONLY badge'):]
        self.assertNotIn('!important', css)
        self.assertNotIn('display:none', css)
        self.assertIn(':only-child', css)
        # The same single outer frame and separate number+box icon are retained.
        self.assertIn('border:1px solid rgba(255,224,240,.5)', CSS)
        self.assertIn('border:1px solid rgba(255,255,255,.4)', CSS)
        self.assertIn("makeEl('span','mf-native-box-icon','📦')", (WEB/'client.js').read_text(encoding='utf-8'))
        self.assertIn("own('span','mf-home-box-icon','📦')", (WEB/'home.js').read_text(encoding='utf-8'))
        self.assertIn('grid-template-columns:minmax(1ch,max-content) 13px;', CSS)

    def test_version_matches_metadata_without_hardcoding(self):
        meta = json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))
        self.assertEqual(meta['version'], CURRENT_RELEASE)
        self.assertEqual(meta['targetAbi'], '12.4.0.0')

if __name__ == '__main__':
    unittest.main()
