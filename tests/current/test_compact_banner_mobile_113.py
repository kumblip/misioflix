"""v0.4.113: compact Home banner and mobile search-sized shelf cards."""
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HOME=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf-8')
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf-8')

class CompactBannerMobile113(unittest.TestCase):
    def test_alphabetic_library_order_and_stable_controls(self):
        method=HOME.split('  function paintFolderButtons(){',1)[1].split('  function createCollectionsPage(){',1)[0]
        self.assertIn("libraryLinks.sort((a,b)=>a.name.localeCompare(b.name,'pl'",method)
        self.assertIn("libraryLinks.push({name:'Kolekcje',link:collectionButton})",method)
        self.assertIn("for(const [kind,name] of [['anime','Wyszukiwarka anime'],['media','Wyszukiwarka filmów i seriali']]",method)
        self.assertIn('.mf-home-mal-button{order:2}',CSS)
        self.assertIn('.mf-home-simkl-button{order:3}',CSS)
        self.assertIn('.mf-home-search-launch{order:1}',CSS)
    def test_logo_and_shortcuts_same_container_without_copy(self):
        fn=HOME.split('  function hero(shortcuts){',1)[1].split('  function resumeShelf(){',1)[0]
        self.assertIn('intro.appendChild(logo)',fn)
        self.assertIn('append(hero,intro,shortcuts)',fn)
        self.assertNotIn('Twój świat filmów i anime',fn)
        self.assertNotIn('Własna biblioteka. Oryginalny odtwarzacz Jellyfin.',fn)
        self.assertIn('.mf-home-hero{\n  display:flex;align-items:center;flex-direction:row',CSS)
        self.assertIn('padding:6px 14px;min-height:36px;',CSS)
    def test_mobile_shelf_posters_same_three_across_as_anime_search(self):
        block=CSS.split('/* v0.4.113: same compact three-across density',1)[1].split('/* v0.4.94:',1)[0]
        self.assertIn('@media(max-width:680px)',block)
        self.assertIn('.mf-home-0412 .mf-home-shelf-scroll > .mf-home-card',block)
        self.assertIn('flex:0 0 calc((100% - 16px)/3)',block)
        self.assertIn('.mf-home-card-desc{display:none}',block)
        self.assertIn('.mf-home-card-info-button',block)
        self.assertIn('.mf-home-paw',block)
        self.assertIn('.mf-home-year',block)
        self.assertIn('.mf-home-genres',block)
        # The same card component supports the full description in the info modal.
        self.assertIn('openCardInfo(item,info)',HOME)
        self.assertIn("item.description.trim()",HOME)
        self.assertIn('mf-home-search-dialog',CSS)
    def test_versions_and_original_release_jobs(self):
        meta=json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))
        self.assertEqual(meta['version'],'0.4.113.0')
        project=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf-8')
        self.assertIn('<AssemblyVersion>0.4.113.0</AssemblyVersion>',project)
        for workflow in ('build.yml','release.yml'):
            self.assertTrue((ROOT/'.github/workflows'/workflow).is_file())

if __name__=='__main__':unittest.main()
