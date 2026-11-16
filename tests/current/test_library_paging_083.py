"""Regression: do not advance offsets on duplicate native API pages."""
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[2]
class TestLibraryPaging083(unittest.TestCase):
    def test_no_duplicate_paging_keys(self):
        source=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/library-scroll.js').read_text()
        self.assertIn('function pageParams(base, offset, size)',source)
        self.assertIn("if (normalized==='startindex' || normalized==='limit') continue",source)
        self.assertIn('const params=pageParams(s.query,s.next,PAGE_SIZE)',source)
        self.assertIn('const probe=pageParams(base.params',source)
        self.assertIn('if(repeated.length)',source)
        self.assertIn('s.complete=true;',source)
    def test_existing_search_is_untouched(self):
        self.assertTrue((ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').exists())
if __name__=='__main__': unittest.main()
