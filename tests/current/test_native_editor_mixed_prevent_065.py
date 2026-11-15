import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web'

class Preventative065(unittest.TestCase):
    def test_editor_releases_native_dom_before_jellyfin_action(self):
        code = (WEB / 'details.js').read_text()
        handler = code[code.index('  function recoverNativeMetadataEdit('):code.index('  function schedule() {', code.index('  function recoverNativeMetadataEdit('))]
        self.assertIn('nativeEditSuspended=true', handler)
        self.assertIn("},0);", handler)
        self.assertIn('restoreLayout(page);', handler)
        self.assertIn(".editItemMetadataForm", code)
        self.assertNotIn("window.location.hash=", handler)
        self.assertIn('nativeEditObserver.observe(document.body', handler)
        self.assertIn('if(nativeEditSuspended) return;', code)
        self.assertIn('if(nativeEditDialogSeen && !nativeMetadataDialogExists())finishNativeMetadataEdit();', handler)
        self.assertNotIn('edititemmetadata.html', code)
    def test_mixed_waits_for_a_mounted_visible_card_without_reloading(self):
        code = (WEB / 'client.js').read_text()
        self.assertIn('if(!mixedDecorationsAllowed())return;', code)
        self.assertIn('first.getAttribute(\'data-id\')===initialId', code)
        self.assertIn('const scope=modernMixedRoute()?mixedActiveList:document.body;', code)
        self.assertIn('mixedActiveList?.contains(card)', code)
        self.assertNotIn('window.location.reload(', code)
    def test_mal_simkl_sources_untouched(self):
        # Test packaging compares content hashes to v0.4.64; this test guards
        # against accidentally wiring any MAL/Simkl changes into the RC fixes.
        details = (WEB / 'details.js').read_text()
        client = (WEB / 'client.js').read_text()
        self.assertNotIn('MisioFlixSimklService', details)
        self.assertNotIn('/api/mal/*', client)

if __name__ == '__main__': unittest.main()
