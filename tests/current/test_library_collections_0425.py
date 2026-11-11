"""Jellyfin 12.4 folder collection and home navigation regression contracts."""
import unittest, json, re, subprocess
from pathlib import Path
R=Path(__file__).resolve().parents[2]
C=(R/'src/Jellyfin.Plugin.MisioFlix/Web/client.js').read_text()
S=(R/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text()
H=(R/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text()
class Collections0425(unittest.TestCase):
    def test_version(self):
        self.assertEqual(json.loads((R/'meta.json').read_text())['version'],'0.4.25.0')
    def test_home_button_scoped_to_libraries(self):
        self.assertIn('function mfLibraryRoute()',C)
        self.assertIn('function mfBackButton()',C)
        self.assertIn("window.location.hash='#/home'",C)
        self.assertIn("document.body.insertAdjacentElement('beforeend',button)",C)
    def test_folder_navigation_by_true_type_and_id(self):
        self.assertIn("type==='boxset'",C)
        self.assertIn("type==='folder'||type==='collectionfolder'",C)
        self.assertIn("'#/list?parentId='",C)
        self.assertIn("'#/details?id='",C)
        self.assertIn('event.stopImmediatePropagation()',C)
        self.assertIn('event.button!==0',C)
    def test_mosaic_only_folder_and_existing_artwork_preserved(self):
        self.assertIn("card.classList.add('mf-collection-card')",C)
        self.assertIn("if(background && !/^(none|initial|unset|inherit)$/i.test(background))return",C)
        self.assertIn("ImageTags?.Primary",C)
        self.assertIn('mf-collection-preview',S)
        self.assertIn('pointer-events:none',S)
    def test_native_media_and_anime_routes_preserved(self):
        self.assertIn("Modern /mixed (AnimePL) is already working",C)
        self.assertIn("if(!LIBRARY_ROUTE.test(href||''))return href",H)
        self.assertNotIn("window.location.hash='#/movies'",C)
    def test_js_syntax(self):
        subprocess.run(['node','--check',str(R/'src/Jellyfin.Plugin.MisioFlix/Web/client.js')],check=True)
if __name__=='__main__':unittest.main()
