"""Simkl JSON casing regression guard.

Jellyfin uses PascalCase serializer settings. This static test verifies all
record-based responses from the Simkl controller are explicitly projected into
the lower-case contract expected by simkl.js. No remote API is involved.
"""
import re
import unittest
from pathlib import Path

BASE=Path(__file__).resolve().parents[2]/'src/Jellyfin.Plugin.MisioFlix'
CONTROLLER=(BASE/'Controllers/MisioFlixSimklController.cs').read_text(encoding='utf8')
UI=(BASE/'Web/simkl.js').read_text(encoding='utf8')

class SimklPinContract047(unittest.TestCase):
    def test_connection_shape(self):
        self.assertRegex(CONTROLLER, r'connected\s*=\s*state\.Connected')
        self.assertRegex(CONTROLLER, r'canWrite\s*=\s*state\.CanWrite')
        self.assertNotIn('Ok(await _simkl.ConnectionAsync',CONTROLLER)

    def test_device_login_shape(self):
        for name,source in [('code','Code'),('uri','Uri'),('expiresIn','ExpiresIn'),('interval','Interval')]:
            with self.subTest(field=name):
                self.assertRegex(CONTROLLER, rf'\b{name}\s*=\s*pin\.{source}\b')
        self.assertNotIn('Ok(await _simkl.StartAsync',CONTROLLER)

    def test_poll_shape(self):
        for name,source in [('connected','Connected'),('pending','Pending'),('retryAfter','RetryAfter')]:
            with self.subTest(field=name):
                self.assertRegex(CONTROLLER, rf'\b{name}\s*=\s*result\.{source}\b')
        self.assertNotIn('Ok(await _simkl.PollAsync',CONTROLLER)

    def test_nested_item_contract(self):
        for name,source in [('status','Status'),('score','Score'),('watchedEpisodes','WatchedEpisodes'),('totalEpisodes','TotalEpisodes')]:
            with self.subTest(field=name):
                self.assertRegex(CONTROLLER,rf'\b{name}\s*=\s*entry\.Entry\.{source}\b')
        self.assertIn('entry=item',CONTROLLER)
        self.assertNotIn('entry=entry.Entry',CONTROLLER)

    def test_safe_pin_link_and_errors(self):
        self.assertIn("link.href='https://simkl.com/pin/'",UI)
        self.assertNotIn('link.href=result.uri',UI)
        self.assertIn("typeof result?.code!=='string'",UI)
        self.assertIn('Nie otrzymano poprawnego kodu PIN Simkl',UI)
        self.assertIn("request('/poll','POST')",UI)

if __name__=='__main__':unittest.main()
