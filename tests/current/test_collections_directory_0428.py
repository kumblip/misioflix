"""Contracts for v0.4.28: collections directory, native library back placement.
This test does not require Playwright on the CI runner.
"""
import json
import re
import subprocess
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HOME=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text()
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text()
CLIENT=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/client.js').read_text()
CS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text()

class CollectionsDirectory0428(unittest.TestCase):
    def test_version(self):
        # The collections-directory feature is required from 0.4.28 onward.
        # Compare the compiled assembly to the authoritative version in meta.json,
        # rather than pinning the build to an old release number.
        version = json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))['version']
        self.assertRegex(version, r'^\d+\.\d+\.\d+\.\d+$')
        self.assertGreaterEqual(tuple(map(int, version.split('.'))), (0, 4, 28, 0))
        project = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf-8')
        self.assertIn(f'<AssemblyVersion>{version}</AssemblyVersion>', project)
        self.assertIn(f'<FileVersion>{version}</FileVersion>', project)

    def test_both_collection_links_open_full_directory(self):
        self.assertIn("const COLLECTIONS_URL = '#/home?mfCollections=1'", HOME)
        self.assertIn("lib.category==='collections'?COLLECTIONS_URL:safeLibraryHref(lib.href,lib.id)", HOME)
        self.assertIn("'href',COLLECTIONS_URL", HOME)
        self.assertIn("setAttribute('aria-label','Otwórz listę wszystkich kolekcji')", HOME)
        self.assertNotIn("[data-mf-library=\"collections\"]')?.scrollIntoView", HOME)

    def test_directory_is_a_distinct_paged_grid(self):
        self.assertIn('function createCollectionsPage()', HOME)
        self.assertIn('function loadCollectionsPage(reset=false)', HOME)
        self.assertIn("'/home/collections?mode=latest&startIndex='+start+'&limit=24'", HOME)
        self.assertIn("data.items.filter(item=>item.type==='BoxSet')", HOME)
        self.assertIn("collectionsPage.grid.appendChild(makeCard(item))", HOME)
        self.assertIn("const back=set(own('a','mf-collections-page-back','← Strona główna'),'href','#/home')", HOME)
        self.assertIn('mf-collections-page-grid', CSS)
        self.assertIn('mf-collections-page-active', CSS)
        self.assertIn("collectionsLoad.hasMore=Boolean(data.hasMore)&&items.length>0", HOME)

    def test_favorites_anime_unchanged(self):
        self.assertIn("return tab===null || tab==='0'",HOME)
        self.assertIn("if(!homeRoute())unmountHome()",HOME)
        self.assertIn("if(!LIBRARY_ROUTE.test(href||''))return href",HOME)
        self.assertIn("const ordered=[...animeViews,collectionsShelf,...otherViews]",HOME)

    def test_global_grouping_stays_off(self):
        self.assertIn('&CollapseBoxSetItems=false',CS)
        self.assertIn('IncludeItemTypes=BoxSet',CS)
        self.assertNotIn('EnableGroupingMoviesIntoCollections',CS)

    def test_back_button_does_not_cover_library_title(self):
        self.assertIn("document.body.insertAdjacentElement('beforeend',button)",CLIENT)
        self.assertRegex(CSS,r'#mf-library-back-home\s*\{top:auto!important;bottom:')
        self.assertIn('window.location.hash=\'#/home\'',CLIENT)

    def test_js_and_css_syntax(self):
        for name in ['home.js','client.js']:
            subprocess.run(['node','--check',str(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'/name)],check=True)
        r=subprocess.run(['node','-e','const p=require("postcss");p.parse(require("fs").readFileSync(0,"utf8"))'],input=CSS,text=True,capture_output=True)
        self.assertEqual(r.returncode,0,r.stderr)

if __name__=='__main__':unittest.main()
