"""Regressions reported by a real Jellyfin 12.4 user after v0.4.22."""
from pathlib import Path
import json
import unittest
ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
H=(WEB/'home.js').read_text(encoding='utf-8')
D=(WEB/'details.js').read_text(encoding='utf-8')
class Hotfix0423(unittest.TestCase):
    def test_version(self):
        self.assertRegex(json.loads((ROOT/'meta.json').read_text())['version'],r'^0\.4\.\d+\.0$')
    def test_library_routes_use_original_legacy_jellyfin_view(self):
        self.assertIn("'#/list?parentId='",H)
        self.assertIn('safeLibraryHref(lib.href,lib.id)',H)
        self.assertIn('LIBRARY_ROUTE.test(href)',H)
        self.assertIn("document.addEventListener('click',interceptLibraryNavigation,true)",H)
        self.assertIn('normalizeLibraryRoute()',H)
    def test_direct_resume_never_claims_success_on_unhandled_event(self):
        self.assertIn('async function tryNativeResume(entry, serial)',H)
        self.assertIn('if(!click.defaultPrevented)return false;',H)
        self.assertIn('if(playingLocally())return true;',H)
        self.assertIn('await window.MisioFlixPlayItem(entry.resumeId)',H)
        self.assertIn('await playViaItemDetails(entry,serial)',H)
        self.assertIn('data-positionticks',H)
    def test_details_restore_when_leaving(self):
        self.assertIn('restoreLayout(lastPage)',D)
        self.assertIn("savedLocations.delete(page)",D)
        self.assertIn('lastPage=null;lastItem=',D)
    def test_non_destructive(self):
        self.assertNotIn('DeleteItems',H+D)
        self.assertNotIn('DELETE /Items',H+D)
if __name__=='__main__':unittest.main()
