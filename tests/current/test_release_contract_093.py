"""Tests that continue to work as release versions change."""
import json
import re
import unittest
from pathlib import Path
from version_contract import CURRENT_RELEASE, PROJECT_ROOT

class ReleaseContract093(unittest.TestCase):
    def test_release_metadata_matches_dotnet_project(self):
        meta=json.loads((PROJECT_ROOT/'meta.json').read_text(encoding='utf8'))
        csproj=(PROJECT_ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf8')
        self.assertEqual(meta['version'], CURRENT_RELEASE)
        self.assertRegex(CURRENT_RELEASE, r'^\d+\.\d+\.\d+\.\d+$')
        self.assertGreaterEqual(tuple(map(int,CURRENT_RELEASE.split('.'))),(0,4,93,0))
        self.assertIn(f'<AssemblyVersion>{CURRENT_RELEASE}</AssemblyVersion>',csproj)
        self.assertIn(f'<FileVersion>{CURRENT_RELEASE}</FileVersion>',csproj)
        self.assertEqual(meta['targetAbi'],'12.4.0.0')

    def test_current_active_tests_have_no_stale_version_literal(self):
        tests=PROJECT_ROOT/'tests/current'
        for file in tests.glob('test_*.py'):
            if file.name==self.__module__+'.py': continue
            text=file.read_text(encoding='utf8')
            self.assertNotIn('0.4.'+'92.0',text,file.name)

    def test_member_count_aligned_with_paws_in_single_frame(self):
        src=PROJECT_ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
        css=(src/'theme.css').read_text(encoding='utf8')
        home=(src/'home.js').read_text(encoding='utf8')
        client=(src/'client.js').read_text(encoding='utf8')
        self.assertIn("own('span','mf-home-box-icon','📦')",home)
        self.assertIn("makeEl('span','mf-native-box-icon','📦')",client)
        self.assertIn('grid-template-columns:minmax(1ch,max-content) 13px;column-gap:3px',css)
        self.assertIn('grid-template-columns:minmax(1ch,max-content) 13px;column-gap:4px',css)
        self.assertIn('border:0;border-radius:0;box-shadow:none;background:transparent',css)
        self.assertIn("const mark=own('span','mf-home-stat mf-home-member-collection')",home)
        self.assertIn('stack.appendChild(mark)',client)

if __name__=='__main__':unittest.main()
