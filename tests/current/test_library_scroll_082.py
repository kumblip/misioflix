"""Native library-only infinite scroll must not touch MisioFlix search or React owned card roots."""
from pathlib import Path
import json, unittest
R=Path(__file__).resolve().parents[2]
SRC=R/'src/Jellyfin.Plugin.MisioFlix'
WEB=SRC/'Web'
class LibraryScroll082(unittest.TestCase):
  def test_library_only(self):
    code=(WEB/'library-scroll.js').read_text()
    self.assertIn("new Set(['mixed', 'movies', 'tv', 'music'])",code)
    self.assertIn('topParentId',code)
    self.assertIn("'Users/'+encodeURIComponent(user)+'/Items'",code)
    self.assertIn('pageParams(s.query,s.next,PAGE_SIZE)',code)
    self.assertIn('result.Limit=String(size)',code)
    self.assertIn('queryIdentity(r)',code)
    self.assertIn('s.itemIds.has(iid)',code)
    self.assertIn('container.insertAdjacentElement(\'afterend\',pane)',code)
    self.assertNotIn('container.appendChild(node)',code)
    self.assertNotIn('homeRoute()',code)
    self.assertNotIn('searchModal',code)
  def test_assets_and_misioflix_overlays(self):
    injection=(SRC/'Services/ScriptInjection.cs').read_text()
    controller=(SRC/'Controllers/MisioFlixController.cs').read_text()
    client=(WEB/'client.js').read_text()
    self.assertIn('data-misioflix=\\"library-scroll\\"',injection)
    self.assertIn('"library-scroll.js" => ("Web.library-scroll.js"',controller)
    self.assertIn("document.querySelector('.mf-library-extra-deck')",client)
    self.assertIn("if(modernMixedRoute())",client)
    self.assertIn('mf-library-extra-deck', (WEB/'theme.css').read_text())
  def test_versions(self):
    self.assertEqual(json.loads((R/'meta.json').read_text())['version'],'0.4.83.0')
    self.assertIn('<AssemblyVersion>0.4.83.0</AssemblyVersion>',(SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text())
if __name__=='__main__':unittest.main()
