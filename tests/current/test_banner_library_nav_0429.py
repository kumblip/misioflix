"""Regression for v0.4.29: opening banner shortcuts must not unmount their own anchor.

The home discovery shortcuts live inside <nav> in the MisioFlix-owned DOM.
A document-level pointerdown capture listener must not remove that DOM before
click/default hash navigation. Native Jellyfin header links remain outside it.
"""
import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
HOME=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf-8')

class BannerLibraryNavigation0429(unittest.TestCase):
    def test_version(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'],'0.4.29.0')
        project=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text()
        self.assertIn('<AssemblyVersion>0.4.29.0</AssemblyVersion>',project)

    def test_prevent_early_removal_of_banner_links(self):
        self.assertIn("document.addEventListener('pointerdown'",HOME)
        self.assertRegex(HOME,r'if\(!link\s*\|\|\s*homeRoot\.contains\(link\)\)return;')
        self.assertRegex(HOME,r'if\(!homeRouteFor\(link\.getAttribute\(\'href\'\)\|\|\'\'\)\)unmountHome\(\)')
        self.assertIn("window.addEventListener('hashchange'",HOME)
        self.assertIn("if(!homeRoute())unmountHome()",HOME)

    def test_other_routes_kept(self):
        self.assertIn("const collectionButton=set(own('a','mf-home-folder-button','Kolekcje'),'href',COLLECTIONS_URL)",HOME)
        self.assertIn("const link=set(own('a','mf-home-folder-button',lib.name),'href',safeLibraryHref(lib.href,lib.id))",HOME)
        self.assertIn("const COLLECTIONS_URL = '#/home?mfCollections=1'",HOME)
        self.assertIn("if(!LIBRARY_ROUTE.test(href||''))return href",HOME)

    def test_node_syntax(self):
        result=subprocess.run(['node','--check',str(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js')],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)

if __name__=='__main__':unittest.main()
