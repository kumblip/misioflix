"""Source contract tests: carousel relocation, per-user hiding, and five-title draws."""
import json
import re
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
HOME=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text()
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text()
SERVICE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text()
CTRL=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs').read_text()
CLIENT=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/client.js').read_text()

class Layout0418(unittest.TestCase):
    def test_version_and_existing_video_fix(self):
        self.assertRegex(json.loads((ROOT/'meta.json').read_text())['version'],r'^\d+\.\d+\.\d+\.\d+$')
        self.assertIn('function syncPlayerSkin()',CLIENT)
        self.assertIn("classList.toggle('misioflix-skin',!playerIsVisible())",CLIENT)
    def test_shortcuts_in_hero_not_below(self):
        self.assertIn('homeRoot.appendChild(hero(discoveryRefs.section))',HOME)
        self.assertIn('append(hero,intro,shortcuts)',HOME)
        self.assertNotIn('homeRoot.appendChild(discoveryRefs.section)',HOME)
        self.assertIn('.mf-home-hero .mf-home-discovery',CSS)
    def test_resume_full_width_and_scrolling(self):
        self.assertIn('homeRoot.appendChild(resumeShelf())',HOME)
        self.assertIn("own('section','mf-home-resume mf-home-resume-shelf')",HOME)
        self.assertIn("scroll.setAttribute('aria-label','Wszystkie pozycje Oglądaj dalej')",HOME)
        self.assertIn("enableShelfDrag(scroll,{busy:true,hasMore:false,mode:'resume'})",HOME)
        self.assertIn('resumeData.items.forEach(v=>area.appendChild(resumeTile(v)))',HOME)
        self.assertIn('resumeData.hidden.forEach(v=>area.appendChild(resumeTile(v,true)))',HOME)
        self.assertIn("'Przewiń Oglądaj dalej w prawo'",HOME)
    def test_hide_never_deletes_user_data(self):
        self.assertIn("/resume/${hidden?'restore':'hide'}",HOME)
        self.assertIn('Pokaż ukryte',HOME)
        self.assertIn('Ukryj ukryte',HOME)
        self.assertIn('controls.disabled=resumeData.hidden.length===0',HOME)
        self.assertIn('hidden-resume.json',SERVICE)
        self.assertIn('HiddenGate',SERVICE)
        self.assertIn('No modification of Jellyfin UserData',CTRL)
        self.assertNotIn('Users/{userId}/PlayedItems',SERVICE)
    def test_random_five_and_permanent_buttons(self):
        self.assertIn('const RANDOM_LIMIT = 5',HOME)
        self.assertIn("mode==='random'?RANDOM_LIMIT:SHELF_LIMIT",HOME)
        self.assertIn('const int randomCount = 5',SERVICE)
        self.assertIn('var resultLimit = random ? randomCount : limit',SERVICE)
        self.assertIn('if (list.Count >= resultLimit) break',SERVICE)
        self.assertNotRegex(HOME,r'row\.(?:shuffle|reset)\.hidden=')
        self.assertIn("row.shuffle.classList.toggle('mf-home-view-active',mode==='random')",HOME)
        self.assertIn("row.reset.classList.toggle('mf-home-view-active',mode==='latest')",HOME)

if __name__=='__main__': unittest.main()
