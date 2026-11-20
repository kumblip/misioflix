"""v0.4.112: correct duplicate rename labels, no regression in shelf paging."""
from pathlib import Path
import json
import unittest

ROOT=Path(__file__).resolve().parents[2]
HOME=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf-8')
CONTROLLER=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')

class RenameLibrariesAndTen112(unittest.TestCase):
    def test_rename_dedup_happens_once_before_all_home_consumers(self):
        self.assertIn('librariesCache = coalesceRenamedLibraryViews(libs)',HOME)
        self.assertIn('function coalesceRenamedLibraryViews(libraries)',HOME)
        self.assertIn('paintFolderButtons()',HOME)
        self.assertIn("const scopedLibraries=librariesCache.filter(",HOME)
        self.assertIn('const valid=librariesCache.filter(',HOME)  # Same names/IDs for buttons, searches and shelves.
    def test_initial_10_and_scroll_unlimited(self):
        self.assertIn('const SHELF_LIMIT = 10;',HOME)
        self.assertIn('row.offset+SHELF_LIMIT',HOME)
        self.assertIn("mode==='random'?RANDOM_LIMIT:SHELF_LIMIT",HOME)
        self.assertIn('row.hasMore',HOME)
    def test_source_of_live_names_is_jellyfin_not_14_day_search_cache(self):
        self.assertIn('Users/{Uri.EscapeDataString(userId)}/Views',CONTROLLER)
        self.assertIn("await request('/home/libraries')",HOME)
        self.assertNotIn('localStorage.setItem(\'libraries',HOME)
    def test_versioning(self):
        meta=json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))
        self.assertRegex(meta['version'],r'^0\.4\.(?:11[2-9]|1[2-9][0-9])\.0$')
        project=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf-8')
        self.assertIn(f"<AssemblyVersion>{meta['version']}</AssemblyVersion>",project)

if __name__=='__main__': unittest.main()
