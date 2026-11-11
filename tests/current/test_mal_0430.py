"""MisioFlix MAL v0.4.30: lightweight source regression tests, no secrets or Internet."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'src' / 'Jellyfin.Plugin.MisioFlix'
CTRL = (SRC/'Controllers/MisioFlixController.cs').read_text(encoding='utf8')
WEB = (SRC/'Web/mal.js').read_text(encoding='utf8')
INJECT = (SRC/'Services/ScriptInjection.cs').read_text(encoding='utf8')


class MAL0430(unittest.TestCase):
    def test_version(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text(encoding='utf8'))['version'], '0.4.30.0')

    def test_connection_is_lightweight(self):
        section = CTRL.split('MalConnection(CancellationToken cancel)',1)[1].split('MalItem(',1)[0]
        self.assertIn('GetConnectionAsync',section)
        self.assertNotIn('ReadAllAsync',section)

    def test_id_from_authorized_nfo(self):
        section = CTRL.split('MalItem(',1)[1].split('[HttpGet("api/mal/connect")]',1)[0]
        self.assertIn('AuthorizedMalIdAsync',section)
        self.assertIn('GetAuthenticatedUserIdAsync',section)
        self.assertIn('refresh',section)
        self.assertIn('ReadAllAsync',section)

    def test_plugin_serves_module(self):
        self.assertIn('"mal.js" => ("Web.mal.js"',CTRL)
        self.assertIn('assets/mal.js?v=',INJECT)

    def test_home_only_checks_connection(self):
        home=WEB.split('function mountHomeButton()',1)[1].split('function closeDialog()',1)[0]
        self.assertIn('connectionStatus()',home)
        self.assertNotIn("request('/item",home)
        self.assertNotIn('ReadAll',home)

    def test_login_per_user(self):
        self.assertIn('getCurrentUserId',WEB)
        self.assertIn('misioflix-mal-v1:',WEB)
        self.assertIn('onUserSwitch()',WEB)

    def test_manual_pkce_callback(self):
        self.assertIn("window.open(result.url", WEB)
        self.assertIn("'/complete','POST'",WEB)
        self.assertIn("'/callback'",WEB)
        self.assertNotIn('client_secret',WEB)

    def test_season_uses_own_mal_id(self):
        self.assertIn('Number(season?.mal_id)',WEB)
        self.assertIn('Number(catalog.item.mal_id)',WEB)
        self.assertIn('seasonId:ctx.seasonId||null',WEB)

    def test_explicit_write_refresh_only(self):
        self.assertIn("'/update','POST'",WEB)
        self.assertIn('&refresh=true',WEB)
        self.assertIn('&refresh=false',WEB)
        self.assertIn('cacheTime=60*60*1000',WEB)

    def test_no_rewrite_of_nfo_or_player(self):
        self.assertNotIn('File.WriteAllText',CTRL)
        self.assertNotIn('playback/set',WEB)
        self.assertNotIn('markPlayed',WEB)


if __name__ == '__main__':
    unittest.main()
