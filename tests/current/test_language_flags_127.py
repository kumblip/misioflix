"""Visual placement, single-track inference, persistent manual-refresh index regression guards."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/'src/Jellyfin.Plugin.MisioFlix'
CS=(ROOT/'Services/MisioFlixCatalogService.cs').read_text()
CTRL=(ROOT/'Controllers/MisioFlixController.cs').read_text()
CFG=(ROOT/'Web/configPage.html').read_text()
CSS=(ROOT/'Web/language-flags.css').read_text()
JS=(ROOT/'Web/language-flags.js').read_text()

class LanguageFlags127(unittest.TestCase):
 def test_flags_are_smaller_and_always_left_below_year(self):
  self.assertIn('left:6px!important;right:auto!important;top:61px!important',CSS)
  self.assertIn('flex-direction:column',CSS)
  self.assertIn('width:16px;height:16px',CSS)
  self.assertIn('width:14px;height:14px',CSS)
  self.assertIn('bottom:auto!important',CSS)
  self.assertIn('pointer-events:none',CSS)
 def test_only_one_audio_track_can_use_library_suffix(self):
  self.assertIn('audioTracks.Length==1',CS)
  self.assertIn('GetCollectionFolders(item)',CS)
  self.assertIn('EndsWith("PL",StringComparison.OrdinalIgnoreCase)',CS)
  self.assertIn('EndsWith("ENG",StringComparison.OrdinalIgnoreCase)',CS)
  self.assertIn('hints.Length==1',CS)
  self.assertIn('LanguageOf(stream)',CS)
  self.assertIn('audio && subs ? "both"',CS)
 def test_persistent_server_cache_without_ttl(self):
  self.assertIn('language-flags-index.json',CS)
  self.assertIn('JsonSerializer.SerializeAsync',CS)
  self.assertIn('JsonSerializer.DeserializeAsync',CS)
  self.assertIn('File.Move(temporary, _languageFlagsPath, overwrite:true)',CS)
  self.assertNotIn('AddMinutes(10)',CS)
  self.assertIn('LanguageFlagsCache.TryGetValue',CS)
  self.assertIn('verified.RootElement',CS)
 def test_refresh_is_admin_only_manual(self):
  self.assertIn('[HttpPost("api/language-flags/refresh")]',CTRL)
  self.assertIn('[Authorize(Policy = Policies.RequiresElevation)]',CTRL)
  self.assertIn('RefreshLanguageFlagsIndexAsync(Request,cancel)',CTRL)
  self.assertIn('mf-language-index-refresh',CFG)
  self.assertIn("query('POST','refresh')",CFG)
  self.assertIn("view.addEventListener('pageshow'",CFG)
 def test_no_reload_or_playback_mutation(self):
  self.assertIn('IntersectionObserver',JS)
  self.assertIn('document.querySelectorAll(selector)',JS)
  self.assertNotIn('.click()',JS)
  self.assertNotIn('location.reload',JS)

if __name__=='__main__':unittest.main()
