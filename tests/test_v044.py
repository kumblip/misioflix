"""v0.4.4 source-contract checks; these do not replace a .NET build or live OAuth tests."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT/'src/Jellyfin.Plugin.MisioFlix'
MAL = (SRC/'Services/MisioFlixMalService.cs').read_text()
CTRL = (SRC/'Controllers/MisioFlixController.cs').read_text()
CLIENT = (SRC/'Web/client.js').read_text()
CONFIG = (SRC/'Web/configPage.html').read_text()

class MultiUserMalSourceTests(unittest.TestCase):
    def test_one_application_many_oauth_tokens(self):
        self.assertIn('Settings()', MAL)
        self.assertIn('TokenPath(string userId)', MAL)
        self.assertIn('UserId(userId) + ".json"', MAL)
        self.assertIn('TokenLocks.GetOrAdd(user', MAL)
        self.assertIn('ListLocks.GetOrAdd(user', MAL)
        self.assertNotIn('TokenGate', MAL)
        self.assertIn('AccountLinkGate', MAL)
        self.assertIn('EnsureAccountNotLinkedElsewhereAsync', MAL)
        self.assertIn('Pending[state] = new AuthPending(UserId(userId)', MAL)
    def test_identity_and_secure_storage(self):
        for phrase in ['users/@me', 'MalUserId', 'MalUsername', 'File.SetUnixFileMode',
                       'WriteTokenAsync', 'AccessAsync', 'File.Move(temp, filename, true)']:
            self.assertIn(phrase, MAL)
        self.assertIn('new MalConnection(true, identity.Id, identity.Username)', MAL)
        self.assertIn('code_challenge_method', MAL)
    def test_endpoint_authenticated_per_user(self):
        self.assertIn('_catalog.GetAuthenticatedUserIdAsync(Request,cancel)', CTRL)
        self.assertIn('GetConnectionAsync(user,cancel,refreshProfile:refresh)', CTRL)
        self.assertIn('username=connection.Username', CTRL)
        self.assertIn('malUserId=connection.MalUserId', CTRL)
        self.assertIn('AuthorizedMalIdAsync', CTRL)
        self.assertIn('HttpPost("api/mal/disconnect")', CTRL)
    def test_browser_isolation_and_account_ui(self):
        for phrase in ['Moje MAL', 'malAccountPage()', 'malUserId:data.malUserId',
                       'username:data.username', 'if(accountToken!==state.token)return',
                       'if (state.token && state.token !== t)', 'data-mf-mal-disconnect']:
            self.assertIn(phrase, CLIENT)
        self.assertIn('wspólny Client ID', CLIENT)
        self.assertIn('Wspólne Client ID', CONFIG)
        self.assertNotIn('state.mal.accessToken', CLIENT)
    def test_js_behavior(self):
        result=subprocess.run(['node',str(ROOT/'tests/ui_behavior_v044.cjs')],
                              capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

if __name__=='__main__': unittest.main()
