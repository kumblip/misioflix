"""v0.4.21: regressions found in a real Jellyfin 12.4 one-season details DOM.

Structural assertions only: GitHub Actions does not require a browser or access to
an actual user's HTML snapshot, credentials, or Jellyfin server.
"""
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
SCRIPT=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/details.js').read_text(encoding='utf-8')
STYLE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf-8')

class ActualJellyfin124DOM(unittest.TestCase):
    def test_selects_matching_active_details_not_stale_spa_page(self):
        self.assertIn('function activeDetailsPage(id = itemRoute())',SCRIPT)
        self.assertIn("'.mainDetailButtons .btnPlaystate[data-id]'",SCRIPT)
        self.assertIn('knownId(page) === id',SCRIPT)
        self.assertIn('const page=id?activeDetailsPage(id):null;',SCRIPT)
        self.assertIn('restoreLayout(lastPage)',SCRIPT)
    def test_playback_uses_same_active_page(self):
        self.assertIn('const page = activeDetailsPage(target);', SCRIPT)
        self.assertIn('nativePlayButton(activeDetailsPage(itemRoute()),active)', SCRIPT)
        self.assertIn("'.btnPlay:not(.hide)'", SCRIPT)
    def test_real_one_season_hierarchy_supported(self):
        self.assertIn("container.querySelector(':scope > .detailImageContainer')",SCRIPT)
        self.assertIn("container.querySelector(':scope > .detailRibbon')",SCRIPT)
        self.assertIn("container.querySelector(':scope > .detailPagePrimaryContent')",SCRIPT)
        self.assertIn("'#childrenCollapsible','#listChildrenCollapsible','#specialsCollapsible'",SCRIPT)
    def test_empty_cast_not_exposed(self):
        self.assertIn('function syncCastButton(page)', SCRIPT)
        self.assertIn("!section.classList.contains('hide')", SCRIPT)
        self.assertIn('button.hidden = !available', SCRIPT)
        self.assertIn('syncCastButton(page);',SCRIPT)
        self.assertIn('.mf-detail-cast-button[hidden] {display:none!important}',STYLE)
    def test_stays_scoped_and_does_not_modify_player(self):
        self.assertIn('html.misioflix-skin #itemDetailPage.mf-detail-compact', STYLE)
        self.assertNotIn('video.play()', SCRIPT)
        self.assertNotIn('document.write(', SCRIPT)

if __name__=='__main__':unittest.main()
