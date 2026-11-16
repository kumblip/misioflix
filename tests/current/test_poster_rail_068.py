"""v0.4.68 — media-specific recommendations may not control poster rail position."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web'
DETAILS = (WEB / 'details.js').read_text(encoding='utf-8')
CSS = (WEB / 'theme.css').read_text(encoding='utf-8')


class PosterRailUnderNativePoster068(unittest.TestCase):
    def test_anchor_tracks_actual_native_image_bottom_not_right_column(self):
        segment = DETAILS.split('  function positionPosterRail(page) {', 1)[1].split('  function queueRailPosition(page) {', 1)[0]
        self.assertIn(".detailPagePrimaryContainer > .detailImageContainer", segment)
        self.assertIn(".detailPagePrimaryContainer > .mf-detail-poster-rail", segment)
        self.assertIn('const y=poster.bottom-frame.top+14', segment)
        self.assertIn('poster.width.toFixed(2)', segment)
        self.assertIn("wrapper.classList.add('mf-detail-rail-anchored')", segment)
        self.assertNotIn('similarCollapsible', segment)
        self.assertNotIn('childrenCollapsible', segment)
        self.assertNotIn("querySelector('#collections", segment)

    def test_anchor_moves_only_owned_rail_no_native_component_reparenting(self):
        self.assertNotIn('relocate(', DETAILS)
        self.assertNotIn('savedLocations', DETAILS)
        self.assertNotIn('appendChild(element)', DETAILS)
        self.assertNotIn('marker.replaceWith(element)', DETAILS)
        self.assertIn("container.append(rail)", DETAILS)
        self.assertIn('position:absolute!important', CSS)
        self.assertIn('.mf-detail-rail-anchored > .detailPagePrimaryContainer > .mf-detail-poster-rail', CSS)
        self.assertNotIn('position:absolute!important;\n    grid-column', DETAILS)

    def test_dynamic_mal_simkl_panels_cannot_overflow_short_movies(self):
        self.assertIn('railResizeObserver.observe(image)', DETAILS)
        self.assertIn('railResizeObserver.observe(rail)', DETAILS)
        self.assertIn('y+railHeight+24', DETAILS)
        self.assertIn("--mf-rail-min-height", CSS)
        self.assertIn('min-height:var(--mf-rail-min-height,0px)!important', CSS)

    def test_mobile_returns_to_original_single_column_flow(self):
        self.assertIn("window.matchMedia?.('(max-width:850px)').matches", DETAILS)
        self.assertIn("wrapper.classList.remove('mf-detail-rail-anchored')", DETAILS)
        self.assertIn('position:static!important;left:auto!important;top:auto!important', CSS)
        self.assertIn('grid-row:3!important', CSS)

    def test_leave_restores_owned_styles_only(self):
        self.assertIn('stopPosterRail(page);', DETAILS)
        self.assertIn('railResizeObserver?.disconnect()', DETAILS)
        self.assertIn('wrapper.style.removeProperty(name)', DETAILS)
        self.assertIn("document.addEventListener('click',recoverNativeMetadataEdit,true)", DETAILS)
        section = DETAILS.split('  function recoverNativeMetadataEdit(event) {', 1)[1].split('  function schedule() {', 1)[0]
        self.assertNotIn('restoreLayout(', section)
        self.assertNotIn('window.location.hash=', section)

    def test_mal_simkl_unchanged_and_reuse_existing_left_rail(self):
        mal=(WEB/'mal.js').read_text(encoding='utf-8')
        simkl=(WEB/'simkl.js').read_text(encoding='utf-8')
        self.assertIn("const rail=page.querySelector('.mf-detail-poster-rail')", mal)
        self.assertIn("const rail=page.querySelector('.mf-detail-poster-rail')", simkl)
        self.assertIn('if(rail)rail.append(panel)', mal)
        self.assertIn('if(rail)rail.append(section)', simkl)
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'],'0.4.75.0')
        self.assertIn('<AssemblyVersion>0.4.75.0</AssemblyVersion>', (ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text())

if __name__ == '__main__': unittest.main()
