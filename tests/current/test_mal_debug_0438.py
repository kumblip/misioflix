"""On-demand MAL diagnostic is scoped, non-mutating and cannot expose credentials."""
from pathlib import Path
import json, unittest, subprocess
ROOT=Path(__file__).resolve().parents[2]
SERVICE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixMalService.cs').read_text()
CTRL=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs').read_text()
JS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/mal.js').read_text()

class MalDiagnostics0438(unittest.TestCase):
    def test_version(self):
        self.assertGreaterEqual(tuple(map(int,json.loads((ROOT/'meta.json').read_text())['version'].split('.'))),(0,4,38,0))
    def test_authenticated_and_nfo_bound(self):
        text=CTRL.split('[HttpGet("api/mal/diagnostics")]')[1].split('[HttpGet("api/mal/connect")]')[0]
        self.assertIn('[Authorize]',text)
        self.assertIn('AuthorizedMalIdAsync(Request, catalogId, seasonId',text)
        self.assertIn('GetAuthenticatedUserIdAsync(Request',text)
        self.assertIn('DiagnoseItemAsync(user, malId',text)
        self.assertIn('"private, no-store"',text)
        self.assertNotIn('ReadAllAsync',text)
    def test_manual_and_no_writes(self):
        body=SERVICE.split('public async Task<object> DiagnoseItemAsync(')[1].split('public async Task<MalEntry> UpdateAsync(',1)[0]
        self.assertIn('SendJsonAsync(HttpMethod.Get',body)
        self.assertNotIn('HttpMethod.Patch',body)
        self.assertNotIn('WriteAllText',body)
        self.assertNotIn('ReadAllAsync',body)
        self.assertIn('AddSeconds(45)',body)
        self.assertIn('ListLock(user)',body)
    def test_missing_is_not_zero(self):
        body=SERVICE.split('private async Task<object> ProbeItemStatusAsync(')[1].split('public async Task<MalEntry> UpdateAsync(',1)[0]
        self.assertIn('rewatchesFieldPresent',body)
        self.assertIn('num_times_rewatched',body)
        self.assertIn('ReadEntry(malId, value)',body)
        self.assertIn('rewatches = (int?)null',body)
    def test_never_echo_secret_material(self):
        body=SERVICE.split('public async Task<object> DiagnoseItemAsync(')[1].split('public async Task<MalEntry> UpdateAsync(',1)[0]
        self.assertNotIn('accessToken =',body)
        self.assertNotIn('token = access',body)
        self.assertNotIn('rawJson',body)
        self.assertNotIn('request.Headers',body)
        self.assertIn('allowed = new HashSet<string>',body)
    def test_explicit_user_button_only(self):
        self.assertIn("el('summary','','Diagnostyka MAL')",JS)
        self.assertIn("diagRun.addEventListener('click',async()=>",JS)
        self.assertIn("request(`/diagnostics?catalogId=${ctx.catalogId}",JS)
        self.assertIn("'NIE ZWRÓCONO'",JS)
        self.assertIn("diagReport.select()",JS)
    def test_mixed_cards_share_original_0429_badges(self):
        ui=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/client.js').read_text()
        part=ui.split('function attachOverlay(card){',1)[1].split('function attachDescription',1)[0]
        self.assertIn('appendChild(paw(s.color))',part)
        self.assertIn("'mf-native-year'",part)
        self.assertIn("'mf-native-genres'",part)

    def test_javascript_syntax(self):
        subprocess.run(['node','--check',str(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/mal.js')],check=True)
if __name__=='__main__':unittest.main()
