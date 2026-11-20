"""Regression v0.4.114: explicit density, library info buttons and preview artwork."""
import json
import re
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf-8')
JS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf-8')

class CardDensityAndPoster114(unittest.TestCase):
    def test_desktop_search_does_not_stretch_to_tallest_description(self):
        block=CSS.split('/* v0.4.114: search grids',1)[1].split('/* The library rail has',1)[0]
        self.assertIn('@media(min-width:681px)',block)
        self.assertIn('.mf-home-search-grid',block)
        self.assertIn('align-items:start;',block)
        self.assertIn('.mf-home-search-grid > .mf-home-card',block)
        self.assertIn('align-self:start;height:auto;min-height:0;',block)
        self.assertIn('min-height:0!important;',block)
        self.assertNotIn('display:none',block)

    def test_library_on_desktop_shows_button(self):
        block=CSS.split('/* The library rail has',1)[1].split('/* Info preview:',1)[0]
        self.assertIn('.mf-home-rows:not(.mf-home-recommendations)',block)
        self.assertIn('mf-home-card-title-row',block)
        self.assertIn('mf-home-card-info-button',block)
        self.assertIn('display:inline-flex!important;visibility:visible!important;',block)
        self.assertIn("info.addEventListener('click',()=>openCardInfo(item,info));",JS)
        self.assertIn('list.forEach(item=>row.scroll.appendChild(makeCard(item)))',JS)

    def test_mobile_library_and_genre_full_grid_never_reserve_description(self):
        block=CSS.split('/* Mobile Jellyfin Android/iOS:',1)[1].split('/* v0.4.94:',1)[0]
        self.assertIn('@media(max-width:680px)',block)
        self.assertIn('.mf-home-rows > .mf-home-shelf > .mf-home-shelf-scroll',block)
        self.assertIn('height:auto!important;min-height:0!important;',block)
        self.assertIn('.mf-home-card-desc',block)
        self.assertIn('display:none!important;height:0!important;',block)
        self.assertIn('flex:0 0 calc((100% - 16px)/3)!important;',block)
        self.assertIn('.mf-home-recommendation-dialog .mf-home-recommendation-grid',block)
        self.assertIn('grid-template-columns:repeat(3,minmax(0,1fr))!important',block)
        self.assertIn('.mf-home-recommendation-grid .mf-home-card-info-button',block)
        self.assertIn('.mf-home-recommendation-grid .mf-home-paw',block)
        self.assertIn('.mf-home-recommendation-grid .mf-home-genres',block)

    def test_modal_uses_existing_poster_and_button_order(self):
        modal=JS.split('  function openCardInfo(item,opener){',1)[1].split('  function normalized(',1)[0]
        self.assertIn('const posterUrl=imageFor(item);',modal)
        self.assertIn("own('img','mf-home-card-info-poster')",modal)
        self.assertIn('const posterFallback=',modal)
        self.assertIn('append(actions,open,close)',modal)
        self.assertIn('append(dialog,header,layout,actions)',modal)
        self.assertIn('close.focus()',modal)
        self.assertIn('mf-home-card-info-poster-wrap',CSS)
        self.assertIn('mf-home-card-info-layout',CSS)

    def test_version_and_ci_are_pinned_to_one_source(self):
        version=json.loads((ROOT/'meta.json').read_text(encoding='utf8'))['version']
        self.assertEqual(version,'0.4.114.0')
        csproj=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf8')
        self.assertIn('<AssemblyVersion>'+version+'</AssemblyVersion>',csproj)
        self.assertTrue((ROOT/'.github/workflows/build.yml').is_file())
        self.assertTrue((ROOT/'.github/workflows/release.yml').is_file())

if __name__=='__main__':unittest.main()
