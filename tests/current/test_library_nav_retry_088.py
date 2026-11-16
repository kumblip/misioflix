"""v0.4.88: library paging must recover from a transient React remount after playback."""
import unittest
from pathlib import Path
S=(Path(__file__).resolve().parents[2]/'src/Jellyfin.Plugin.MisioFlix/Web/library-scroll.js').read_text()
class LibraryNavRetry088(unittest.TestCase):
    def test_retry_during_react_mount(self):
        self.assertIn('s.verifyAttempts++', S)
        self.assertIn('if(s.verifyAttempts>=20)', S)
        self.assertIn('Oczekiwanie na stabilną siatkę React', S)
        self.assertIn('fallbackQueryParams(r)', S)
        self.assertIn("window.addEventListener('hashchange',()=>{reset();schedule();})", S)
    def test_no_search_change_and_dedupe(self):
        self.assertIn('data-mf-library-infinite-card', S)
        self.assertIn('pageParams(s.query,s.next,PAGE_SIZE)', S)
        self.assertIn('s.itemIds.has(id(item))', S)
        self.assertNotIn('searchModal', S)
