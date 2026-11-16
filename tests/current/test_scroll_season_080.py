"""v0.4.80: DOM anchor, search label, and single global scroll control."""
import json
import unittest
from pathlib import Path
R=Path(__file__).resolve().parents[2]
WEB=R/'src/Jellyfin.Plugin.MisioFlix/Web'

class SeasonAndTop080(unittest.TestCase):
    def test_nested_jellyfin_episode_anchor(self):
        js=(WEB/'details.js').read_text('utf8')
        self.assertIn("page.querySelector('#listChildrenCollapsible')", js)
        self.assertIn('episodeAnchor.parentNode.insertBefore(nav,episodeAnchor)', js)
        self.assertNotIn('primary.append(nav)',js)
        self.assertIn("page.querySelector('#childrenContent')",js)
    def test_single_shared_scroll_button_and_modal_priority(self):
        js=(WEB/'client.js').read_text('utf8')
        self.assertEqual(js.count("control.id='mf-scroll-to-top'"),1)
        self.assertIn('const modalScroll=',js)
        self.assertIn("document.addEventListener('scroll',event=>{",js)
        self.assertIn('installScrollTopControl();',js)
        self.assertIn("window.addEventListener('misioflix-search-toggle',scheduleRefresh)",js)
        self.assertIn("if(modal && visible(modal))return [modal];",js)
    def test_search_label_and_css(self):
        home=(WEB/'home.js').read_text('utf8')
        self.assertIn('Pokaż osobno sezony/speciale/itd.',home)
        self.assertIn('misioflix-search-toggle',home)
        css=(WEB/'theme.css').read_text('utf8')
        self.assertIn('html.misioflix-skin #mf-scroll-to-top',css)
        self.assertIn('.detailPagePrimaryContent .mf-detail-season-nav',css)
    def test_version(self):
        self.assertEqual(json.loads((R/'meta.json').read_text('utf8'))['version'],'0.4.81.0')

if __name__=='__main__':unittest.main()
