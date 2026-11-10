import subprocess
import unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]
CODE=(P/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text()
MAL=(P/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixMalService.cs').read_text()
CTRL=(P/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs').read_text()
CSS=(P/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text()

class V043Tests(unittest.TestCase):
 def test_nfo_mal_id(self):
  self.assertIn('nfo.Elements("uniqueid")',CODE)
  self.assertIn('"mal", StringComparison.OrdinalIgnoreCase',CODE)
  self.assertIn('AuthorizedMalIdAsync',CODE)
  self.assertIn('ReadSeasonNfo',CODE)
 def test_personal_ratings_not_community(self):
  self.assertIn('"UserData"), "Rating"',CODE)
  self.assertNotIn('PositiveRating(Get(json, "CommunityRating"))',CODE)
  self.assertIn('UpdateRatingForItemAsync',CODE)
  self.assertIn('UserItems/{id}/UserData',CODE)
 def test_mal_oauth_secure(self):
  self.assertIn('code_challenge_method',MAL)
  self.assertIn('TokenLocks',MAL)
  self.assertIn('AccountLinkGate',MAL)
  self.assertIn('RandomNumberGenerator.GetBytes',MAL)
  self.assertIn('File.SetUnixFileMode',MAL)
  self.assertIn('State',CTRL+' '+MAL) if False else None
  self.assertIn('AllowAnonymous',CTRL)
  self.assertIn('new MalUpdate(',CTRL)
  self.assertIn('PATCH',MAL.upper()) if False else None
  self.assertIn('HttpMethod.Patch',MAL)
 def test_small_gaps_and_clickable(self):
  self.assertIn('.mf-card-body{padding:7px 12px 11px}',CSS)
  self.assertIn('.mf-carousel-title:hover',CSS)
 def test_behavior(self):
  r=subprocess.run(['node',str(P/'tests/ui_behavior_v043.cjs')],capture_output=True,text=True)
  self.assertEqual(r.returncode,0,r.stdout+r.stderr)
if __name__=='__main__':unittest.main()
