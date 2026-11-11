"""Static contract tests for original Jellyfin 12.4 integration.
Build and real Jellyfin NAS runtime are NOT covered by these tests.
"""
import json
import re
import subprocess
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
JS=(WEB/'client.js').read_text()
CSS=(WEB/'theme.css').read_text()
CTRL=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs').read_text()
SVC=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text()
INJ=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/ScriptInjection.cs').read_text()

class MisioNative0411(unittest.TestCase):
  def test_versions(self):
    meta=json.loads((ROOT/'meta.json').read_text())
    self.assertRegex(meta['version'],r'^\d+\.\d+\.\d+\.\d+$')
    self.assertEqual(meta['targetAbi'],'12.4.0.0')
    self.assertIn('<Version>'+meta['version'].removesuffix('.0')+'</Version>',(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text())
    self.assertIn('data-misioflix=\\\"skin',INJ)
    self.assertIn('Assembly.GetName().Version',INJ)
  def test_native_not_second_page(self):
    for banned in ['buildHome(', 'document.body.appendChild(',"fetch('/MisioFlix/api/catalog",'window.history.pushState','window.location.href=', 'document.body.innerHTML=']:
      self.assertNotIn(banned,JS)
    self.assertIn('.cardScalable',JS)
    self.assertIn('.cardImageContainer',CSS)
    self.assertIn('pointer-events:none',CSS)
  def test_personal_watch_and_rating(self):
    self.assertIn('emby-playstatebutton',JS)
    self.assertIn('data-mf-user-rating',JS)
    self.assertNotIn('data.CommunityRating',JS)
    self.assertIn('data-mf-watch="watched"',CSS)
    self.assertIn('data-mf-watch="started"',CSS)
    self.assertIn('data-mf-watch="unwatched"',CSS)
  def test_per_item_api_scope(self):
    self.assertIn('[HttpGet("api/overlays")]',CTRL)
    self.assertIn('[Authorize]',CTRL)
    self.assertIn('ReadOverlaysForAuthenticatedUserAsync',SVC)
    method=SVC.split('ReadOverlaysForAuthenticatedUserAsync',1)[1].split('    /// <summary>\n    /// Playback items',1)[0]
    self.assertIn('Take(18)',method)
    self.assertIn('allowedIds.Contains(id)',method)
    self.assertIn('AuthenticatedUserAsync(caller, cancel)',method)
    self.assertIn('GetJsonAsync(origin, query, auth',method)
    self.assertIn('ReadNfo(libItem.Path, type)',method)
    self.assertNotIn('ReadForAuthenticatedUserAsync(',method)
  def test_anime_source_no_fallback(self):
    self.assertIn('var genres = anime ? (nfo?.Genres ?? new List<string>()) : Strings(Get(item,"Genres"))',SVC)
    self.assertIn('rating',SVC)
    self.assertIn('userRating = PersonalRating(item)',SVC)
    self.assertNotIn('NfoRating',SVC.split('ReadOverlaysForAuthenticatedUserAsync',1)[1].split('ReadResumeForAuthenticatedUserAsync',1)[0])
  def test_css_parses(self):
    cmd=['node','-e',"const css=require('postcss');css.parse(require('fs').readFileSync(process.argv[1],'utf8'))",str(WEB/'theme.css')]
    out=subprocess.run(cmd,capture_output=True,text=True)
    self.assertEqual(out.returncode,0,out.stderr)
  def test_js_syntax(self):
    r=subprocess.run(['node','--check',str(WEB/'client.js')],capture_output=True,text=True)
    self.assertEqual(r.returncode,0,r.stderr)
  def test_native_portrait_and_summary(self):
    self.assertIn('data-mf-anime-poster',JS)
    self.assertIn('cardPadder',CSS)
    self.assertIn('padding:0 0 148%',CSS)
    self.assertIn('mf-native-description',CSS)
    self.assertIn('attachDescription(card,data.description)',JS)
    self.assertIn('description = (anime ? (nfo?.Plot ?? string.Empty) : Text(Get(item,"Overview")))',SVC)
    self.assertNotIn('document.body.appendChild(',JS)
  def test_resume_uses_native_shelf(self):
    self.assertIn('Twój świat filmów i anime',CSS)
    self.assertNotIn("fetch('/MisioFlix/api/catalog'",JS)
  def test_all_clients_same_skin(self):
    self.assertIn('@media (max-width:680px)',CSS)
    self.assertIn('.mf-section[data-mf-section="libraries"] {display:none!important}',CSS)
  def test_client_side_navigation_poster_recovery(self):
    self.assertIn('function syncPrimaryPoster(card,data)', JS)
    self.assertIn('data-mf-primary-image', JS)
    self.assertIn("attributeFilter:['data-played','aria-valuenow','data-id','style']", JS)
    self.assertIn('resetCardIfReused(card)', JS)
    self.assertIn('metadataCache.get(id)', JS)
    self.assertIn('background-size:cover!important', CSS)
  def test_no_netflin_source_copied(self):
    self.assertNotIn('--nf-',CSS)
    self.assertNotIn('cdn.jsdelivr',CSS+JS)
    self.assertNotIn('Netflin.min.css',CSS+JS)
if __name__=='__main__':unittest.main()
