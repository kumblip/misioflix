"""Contracts: real BoxSet shelf vs physical folders, independent of user grouping."""
from pathlib import Path
import json, re, subprocess, unittest
R=Path(__file__).resolve().parents[2]
C=(R/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text()
H=(R/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text()
J=(R/'src/Jellyfin.Plugin.MisioFlix/Web/client.js').read_text()
CSS=(R/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text()
class Collections0426(unittest.TestCase):
    def test_version(self):
        self.assertRegex(json.loads((R/'meta.json').read_text())['version'],r'^0\.4\.[0-9]+\.0$')
    def test_library_category_boxsets(self):
        self.assertIn('"boxsets" => "collections"',C)
        self.assertIn('"boxsets" => "boxsets"',C)
        self.assertIn('var collections = view.category == "collections";',C)
        self.assertIn('if (collection ? type != "BoxSet"',C)
        self.assertIn('collectionCount = collection',C)
        self.assertIn('public int? collectionCount { get; set; }',C)
    def test_never_force_jellyfin_grouping(self):
        self.assertIn('&CollapseBoxSetItems=false',C)
        self.assertIn('"movies" => "Movie"',C)
        self.assertIn('"series" => "Series"',C)
        self.assertNotIn('GroupMoviesIntoCollections',C)
        self.assertNotIn('GroupShowsIntoCollections',C)
    def test_collection_list_pure_boxsets(self):
        self.assertIn('collection ? type != "BoxSet"',C)
        self.assertIn('ParentId={libraryId:N}&Recursive=false',C)
        # BoxSet type not passed alongside ParentId, avoids a known Jellyfin bug.
        self.assertIn('var itemScope = collections',C)
        self.assertIn('ParentId={libraryId:N}&Recursive=false',C)
    def test_collection_row_right_after_anime(self):
        self.assertIn("const collectionsShelf={id:'collections'",H)
        self.assertIn("[...animeViews,collectionsShelf,...otherViews]",H)
        self.assertIn("if(lib.category==='collections')continue;",H)
        self.assertIn("['movies','series'].includes(lib.category)",H)
        self.assertIn("item.type==='BoxSet'?'KOLEKCJA'",H)
    def test_folder_never_mislabeled_collection(self):
        self.assertIn("type==='boxset'?'KOLEKCJA':'FOLDER'",J)
        self.assertIn("label.textContent='PUSTY FOLDER'",J)
        self.assertIn("children.length===0 && data.TotalRecordCount===0",J)
        self.assertNotIn('deleteItem',J)
    def test_syntax(self):
        for file in ['home.js','client.js']:
            subprocess.run(['node','--check',str(R/'src/Jellyfin.Plugin.MisioFlix/Web'/file)],check=True)
        proc=subprocess.run(['node','-e','const p=require("postcss");p.parse(require("fs").readFileSync(0,"utf8"))'],input=CSS,text=True,capture_output=True)
        self.assertEqual(proc.returncode,0,proc.stderr)
if __name__=='__main__':unittest.main()
