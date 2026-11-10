"""v0.4.5 static safety/contracts and browser behavior (not a compiled .NET/live MAL test)."""
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
MAL=(SRC/'Services/MisioFlixMalService.cs').read_text()
CTRL=(SRC/'Controllers/MisioFlixController.cs').read_text()
HOST=(SRC/'Services/MisioFlixMalRefreshHostedService.cs').read_text()
DI=(SRC/'Services/ScriptInjection.cs').read_text()
UI=(SRC/'Web/client.js').read_text()
SETTINGS=(SRC/'Web/configPage.html').read_text()

class ManualMalOAuthTests(unittest.TestCase):
    def test_pkce_state_and_user_binding(self):
        for val in ('code_challenge_method', '"plain"','Pending[state] = new AuthPending',
                    'expectedUser is not null && pending.UserId != expectedUser',
                    'ManualRedirect(pending.Redirect) != manual','Pending.TryRemove(state',
                    'QueryHelpers.ParseQuery(pasted.Query)', 'codes.Count != 1', 'states.Count != 1'):
            self.assertIn(val,MAL)
    def test_manual_callback_is_protected(self):
        self.assertIn('HttpPost("api/mal/complete")',CTRL)
        self.assertIn('await _catalog.GetAuthenticatedUserIdAsync(Request, cancel)',CTRL)
        self.assertIn('_mal.FinishManualAsync(user, input.RedirectUrl',CTRL)
        self.assertIn('HttpGet("api/mal/callback")',CTRL)
        self.assertIn('"http"',MAL)
        self.assertIn('"https"',MAL)
    def test_background_refresh_is_not_tied_to_browser(self):
        for val in ('RefreshInactiveAccountsAsync','DateTimeOffset.UtcNow.AddDays(7)',
                    'TokenLock(user)', '"refresh_token"','File.Move(temp, filename, true)',
                    'catch (Exception e) when'):
            self.assertIn(val,MAL)
        self.assertIn('BackgroundService',HOST)
        self.assertIn('TimeSpan.FromHours(12)',HOST)
        self.assertIn('AddHostedService<MisioFlixMalRefreshHostedService>()',DI)
    def test_user_token_isolation_maintained(self):
        self.assertIn('TokenPath(string userId)',MAL)
        self.assertIn('UserId(userId) + ".json"',MAL)
        self.assertIn('EnsureAccountNotLinkedElsewhereAsync',MAL)
        self.assertIn('File.SetUnixFileMode',MAL)
    def test_user_interface_and_settings(self):
        self.assertIn('finishManualMal',UI)
        self.assertIn("post('mal/complete',{redirectUrl})",UI)
        self.assertIn("field.value='';",UI)
        self.assertIn('http://localhost:8765/callback',SETTINGS)
        self.assertIn('data-mf-mal-complete',UI)
    def test_live_behavior_simulation(self):
        r=subprocess.run(['node',str(ROOT/'tests/ui_behavior_v045.cjs')],capture_output=True,text=True)
        self.assertEqual(r.returncode,0,r.stdout+r.stderr)

if __name__=='__main__': unittest.main()
