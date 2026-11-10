"""MisioFlix 0.4.12 home shelf contract tests (not a .NET build test)."""
import json,re,subprocess,unittest
from pathlib import Path
import tinycss2
ROOT=Path(__file__).resolve().parents[1]
SERV=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text()
CTRL=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs').read_text()
INJ=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/ScriptInjection.cs').read_text()
WEB=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text()
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text()
class TestHome0412(unittest.TestCase):
  def test_version_and_assets(self):
    self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'],'0.4.12.0')
    self.assertIn('home.js?v=0.4.12.0',INJ)
    self.assertIn('"home.js" => ("Web.home.js"',CTRL)
  def test_exact_user_library_scope(self):
    method=SERV.split('public async Task<HomeShelfResponse> ReadHomeShelfAsync',1)[1].split('private HomeTile? MakeHomeTile',1)[0]
    self.assertIn('GetHomeLibrariesAsync',method)
    self.assertIn('if (view is null) throw new UnauthorizedAccessException',method)
    self.assertIn('ParentId={libraryId:N}',method)
    self.assertIn('Recursive=true&IncludeItemTypes={types}',method)
    self.assertIn('"Series,Movie"',method)
    self.assertIn('"Random"',method)
    self.assertIn('"DateCreated"',method)
    self.assertNotIn('ReadForAuthenticatedUserAsync',method)
  def test_anime_solely_from_nfo(self):
    method=SERV.split('private HomeTile? MakeHomeTile',1)[1].split('public async Task<HomeResumeResponse>',1)[0]
    for x in ['nfo?.OriginalTitle','nfo?.Plot','nfo?.Kind','nfo?.Genres','IsBelowRoot(local.Path, root)','type != "Series" && type != "Movie"']:
      self.assertIn(x,method)
    self.assertIn('userRating = PersonalRating(item)',method)
  def test_resume_private_no_catalog_scan(self):
    method=SERV.split('public async Task HideResumeForAuthenticatedUserAsync',1)[1].split('private async Task<HashSet<string>> ReadHiddenForUserAsync',1)[0]
    self.assertNotIn('ReadForAuthenticatedUserAsync(caller',method)
    self.assertIn('Items?UserId=',method)
    self.assertIn('catalogId:N',method)
    self.assertIn('HiddenGate',method)
    self.assertIn('ReadResumeForAuthenticatedUserAsync(caller',SERV)
  def test_not_new_portal(self):
    self.assertIn("document.querySelector('main')",WEB)
    self.assertIn("homeRoute()",WEB)
    self.assertNotIn('document.body.innerHTML',WEB)
    self.assertNotIn('/MisioFlix/api/catalog',WEB)
    self.assertNotIn('window.location.href=',WEB)
    self.assertIn('nativeDetails',WEB)
    self.assertIn('&serverId=',WEB)
    self.assertIn("#/details?id=",WEB)
  def test_js_check(self):
    for name in ('home.js','client.js'):
      proc=subprocess.run(['node','--check',str(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'/name)],capture_output=True,text=True)
      self.assertEqual(proc.returncode,0,proc.stderr)
  def test_css_check(self):
    rules=tinycss2.parse_stylesheet(CSS,skip_comments=True,skip_whitespace=True)
    errors=[r for r in rules if r.type=='error']
    self.assertFalse(errors,str(errors))
    self.assertIn('.mf-home-card',CSS)
    self.assertIn('aspect-ratio:2/3',CSS)
    self.assertIn('mf-home-resume',CSS)
  def test_per_user_independence(self):
    self.assertIn('owner=token',WEB)
    self.assertIn('owner!==token',WEB)
    self.assertIn('HideResumeForAuthenticatedUserAsync',SERV)
    self.assertIn('private, no-store',CTRL)
if __name__=='__main__':unittest.main()
