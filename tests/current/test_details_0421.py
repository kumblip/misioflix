"""v0.4.21: native Jellyfin details layout and safe resume interactions."""
import re
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
DETAILS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/details.js').read_text(encoding='utf-8')
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf-8')
INJECT=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/ScriptInjection.cs').read_text(encoding='utf-8')
CONTROLLER=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs').read_text(encoding='utf-8')

class DetailPage0421(unittest.TestCase):
    def test_embedded_and_injected(self):
        self.assertIn('Web.details.js', CONTROLLER)
        self.assertIn('assets/details.js?v=', INJECT)
        self.assertIn('Web/**/*', (ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text())
    def test_does_not_touch_jellyfin_player(self):
        self.assertNotIn('video.play()',DETAILS)
        self.assertNotIn('HTMLVideoElement',DETAILS)
        self.assertIn('button.click()',DETAILS)
        self.assertIn("window.location.hash = detailsRoute(target)",DETAILS)
    def test_reuses_native_structure(self):
        for name in ['detailImageContainer','detailRibbon','detailPagePrimaryContent','childrenCollapsible','listChildrenCollapsible','specialsCollapsible','castCollapsible']:
            self.assertIn(name,DETAILS)
    def test_removes_banner_only_on_details(self):
        self.assertIn('#itemDetailPage.mf-detail-compact > #itemBackdrop',CSS)
        self.assertIn('#itemDetailPage.mf-detail-compact > .detailLogo',CSS)
        self.assertNotIn('html.misioflix-skin .itemBackdrop{display:none',CSS)
    def test_continue_cross_season(self):
        self.assertIn('recentEpisode(seriesId,seasonNo)', DETAILS)
        self.assertIn("const seasonNo=type==='Season'?item?.IndexNumber:null",DETAILS)
        self.assertIn('firstEpisode(seriesId',DETAILS)
        self.assertIn('catalog_id',DETAILS)
        self.assertIn('position_ticks',DETAILS)
    def test_cast_is_collapsible_below_metadata(self):
        self.assertIn("meta.after(castButton,castPanel)",DETAILS)
        self.assertIn("castPanel.hidden=true",DETAILS)
        self.assertIn("castButton.setAttribute('aria-expanded'",DETAILS)
    def test_more_like_this_limited(self):
        self.assertIn('index>=5',DETAILS)
        self.assertIn('similarContent > :nth-child(n+6)',CSS)
    def test_version_unchanged_workflows(self):
        import json
        meta=json.loads((ROOT/'meta.json').read_text(encoding='utf8'))
        self.assertEqual(meta['version'],'0.4.21.0')
        for name in ['build.yml','release.yml']:
            self.assertNotIn('0.4.21', (ROOT/'.github/workflows'/name).read_text(encoding='utf8'))

if __name__=='__main__':unittest.main()
