"""Regression for Jellyfin Web 12.4 player toolbar navigation."""
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[2]
JS = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/player-back.js').read_text(encoding='utf-8')
SERVICE = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixNextEpisodeWatchService.cs').read_text(encoding='utf-8')
CONTROLLER = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixNextEpisodeController.cs').read_text(encoding='utf-8')
INJECTION = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/ScriptInjection.cs').read_text(encoding='utf-8')
ASSETS = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs').read_text(encoding='utf-8')
class PlayerBack087(unittest.TestCase):
    def test_injected_and_versioned(self):
        self.assertIn('player-back.js?v=', INJECTION)
        self.assertIn('"player-back.js" => ("Web.player-back.js"', ASSETS)
        self.assertIn('data-misioflix=\\"player-back\\"', INJECTION)
    def test_authentication_server_side(self):
        self.assertIn('[Authorize]',CONTROLLER)
        self.assertIn('HttpGet("current-episode")', CONTROLLER)
        self.assertIn('GetAuthenticatedUserIdAsync(Request',CONTROLLER)
        self.assertIn('CurrentEpisodeId(user, deviceId)',CONTROLLER)
        self.assertNotIn('itemId =',CONTROLLER.split('HttpGet("current-episode")')[1].split('HttpPost(')[0].split('var id =')[0])
    def test_no_browser_history_or_player_override(self):
        self.assertIn("window.location.hash = route;",JS)
        self.assertIn('window.location.reload()',JS)
        self.assertNotIn('history.back(',JS)
        self.assertNotIn('playbackManager.stop(',JS)
        self.assertNotIn('document.querySelectorAll(\'button\')',JS)
    def test_uses_active_episode_device_and_user(self):
        self.assertIn('CurrentEpisodeId(Guid userId, string? deviceHint)',SERVICE)
        self.assertIn('p.Key.StartsWith(userId.ToString("N")',SERVICE)
        self.assertIn('s.DeviceId.Equals(deviceHint',SERVICE)
        self.assertIn('candidates.Length == 1',SERVICE)
if __name__ == '__main__': unittest.main()
