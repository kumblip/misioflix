"""Guards the reported attachedCallback regression in Jellyfin 12.4."""
import hashlib, json, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
DETAILS=(WEB/'details.js').read_text()
CSS=(WEB/'theme.css').read_text()

class NativeDOMSafety067(unittest.TestCase):
    def test_native_nodes_are_never_reparented(self):
        self.assertNotIn('relocate(',DETAILS)
        self.assertNotIn('savedLocations',DETAILS)
        self.assertNotIn('marker.replaceWith',DETAILS)
        self.assertNotIn('insertBefore(marker',DETAILS)
        self.assertIn("const image=container.querySelector(':scope > .detailImageContainer')",DETAILS)
        self.assertIn("const ribbon=container.querySelector(':scope > .detailRibbon')",DETAILS)
        self.assertIn("const main=container.querySelector(':scope > .detailPagePrimaryContent')",DETAILS)
        self.assertIn("secondary.classList.add('mf-detail-series-sections')",DETAILS)
        self.assertIn('container.append(rail)',DETAILS)
        self.assertNotIn('destination.appendChild(element)',DETAILS)
    def test_css_grid_keeps_jellyfin_dom_and_mobile_layout(self):
        self.assertIn('.detailPageWrapperContainer.mf-detail-grid',CSS)
        self.assertIn('display:contents!important',CSS)
        self.assertIn('grid-template-columns:var(--mf-detail-poster)',CSS)
        self.assertIn('grid-row:6',CSS)
        self.assertIn('mf-detail-cast-expanded',CSS)
    def test_native_editor_cannot_trigger_restore_and_reparent(self):
        section=DETAILS.split('  function recoverNativeMetadataEdit(event) {',1)[1].split('  function schedule() {',1)[0]
        self.assertNotIn('restoreLayout(',section)
        self.assertNotIn('ensureLayout(',section)
        self.assertNotIn('window.location.hash=',section)
        self.assertNotIn('appendChild(',section)
        self.assertIn('nativeEditObserver.observe(document.body',section)
        self.assertIn('nativeMetadataDialogVisible()',section)
    def test_unmoved_poster_has_both_readonly_frame_types(self):
        self.assertIn('.detailPagePrimaryContainer > .detailImageContainer', (WEB/'mal-frames.css').read_text())
        self.assertIn('.detailPagePrimaryContainer > .detailImageContainer', (WEB/'simkl.css').read_text())
        self.assertIn('var(--mf-mal-mixed-frame)', (WEB/'mal-frames.css').read_text())
        self.assertIn('var(--mf-simkl-frame)', (WEB/'simkl.css').read_text())
    def test_plugin_version(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'],'0.4.84.0')
        self.assertIn('<AssemblyVersion>0.4.84.0</AssemblyVersion>',(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text())
    def test_mal_simkl_backends_and_home_recovery_not_modified(self):
        # home.js intentionally changes for v0.4.72 search; retain specific
        # startup crash-recovery guarantees, not a frozen whole-file digest.
        home=(WEB/'home.js').read_text()
        self.assertIn("!bodyText.includes('e.addScrollEventListener is not a function')",home)
        self.assertIn('window.location.reload(); // one retry',home)
        fixed={
            'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixSimklService.cs':'ab31152c93a6ca697c96ac229fca913136011a2805bf6b42beaed56343442d75',
            'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixMalService.cs':'99bf11defee628df411df4d0428c23697b96da6ec5f9814d458ee86a8e9ef193',
        }
        for file,old_digest in fixed.items():
            with self.subTest(file=file):self.assertEqual(hashlib.sha256((ROOT/file).read_bytes()).hexdigest(),old_digest)
if __name__=='__main__':unittest.main()
