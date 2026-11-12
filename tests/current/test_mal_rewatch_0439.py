"""v0.4.39: unambiguous MAL detailed read and v0.4.29 AnimePL cards."""
from pathlib import Path
import json,unittest,subprocess
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'src/Jellyfin.Plugin.MisioFlix'
SERVICE=(BASE/'Services/MisioFlixMalService.cs').read_text()
WEB=BASE/'Web'
CLIENT=(WEB/'client.js').read_text()
MAL=(WEB/'mal.js').read_text()
CSS=(WEB/'theme.css').read_text()
class MALRewatch0439(unittest.TestCase):
 def test_version(self):
  v=json.loads((ROOT/'meta.json').read_text())['version'];self.assertEqual(v,'0.4.39.0')
  self.assertIn(f'<AssemblyVersion>{v}</AssemblyVersion>',(BASE/'Jellyfin.Plugin.MisioFlix.csproj').read_text())
 def test_detail_get_requests_exact_advanced_fields(self):
  reader=SERVICE.split('public async Task<MalEntry?> ReadItemAsync(',1)[1].split('public async Task<object> DiagnoseItemAsync',1)[0]
  self.assertIn('my_list_status{status,score,num_episodes_watched,num_times_rewatched,is_rewatching}',reader)
  self.assertIn('Uri.EscapeDataString(',reader)
  self.assertIn('$"anime/{malId}?fields={requested}"',reader)
  self.assertNotIn('$"anime/{malId}?fields=my_list_status"',reader)
  self.assertIn('ItemCache[key] = new CachedItem(DateTimeOffset.UtcNow.AddHours(1)',reader)
 def test_advanced_counter_is_nullable_but_value_is_literal(self):
  self.assertIn('OptionalCount(e, "num_times_rewatched")',SERVICE)
  self.assertIn('const rewatchCount=data?.timesRewatched ?? null;',MAL)
  self.assertIn("['Ponowne obejrzenia',rewatchCount===null?'Brak danych':String(rewatchCount)]",MAL)
  self.assertNotIn('1+data.timesRewatched',MAL)
  self.assertNotIn("['Obejrzane',watched?'Tak':'Nie']",MAL)
  self.assertIn('misioflix-mal-v3:',MAL)
 def test_0429_native_badges_in_mixed_and_scrolled_rows(self):
  for token in ("'mf-native-overlay'","'mf-native-year'","'mf-native-genres'","appendChild(paw(s.color))", "'mf-native-description'"):
   self.assertIn(token,CLIENT)
  self.assertIn('resetCardIfReused(card)',CLIENT)
  self.assertIn('seenCards.delete(card)',CLIENT)
  self.assertIn('surface.appendChild(overlay)',CLIENT)
  self.assertIn('if(modernMixedRoute() && (!card.closest(',CLIENT)
  self.assertIn('data-mf-watch="watched"',CSS)
  self.assertIn('data-mf-watch="started"',CSS)
  self.assertIn('data-mf-watch="unwatched"',CSS)
  self.assertIn('pointer-events:none',CSS)
 def test_no_extra_mal_requests_for_home_or_library(self):
  self.assertNotIn("ReadAllAsync(user, refresh, cancel)",SERVICE.split('ReadItemAsync(',1)[1].split('DiagnoseItemAsync(',1)[0])
  for name in ('client.js','mal.js','home.js'):
   subprocess.run(['node','--check',str(WEB/name)],check=True,capture_output=True)
if __name__=='__main__':unittest.main()
