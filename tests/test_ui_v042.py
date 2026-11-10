import unittest
import subprocess
from pathlib import Path
P=Path(__file__).resolve().parents[1]
SRC=P/'src'/'Jellyfin.Plugin.MisioFlix'
JS=(SRC/'Web/client.js').read_text()
CSS=(SRC/'Web/theme.css').read_text()
SERVICE=(SRC/'Services/MisioFlixCatalogService.cs').read_text()
CONTROLLER=(SRC/'Controllers/MisioFlixController.cs').read_text()

class V042Tests(unittest.TestCase):
 def test_visual_css_and_js(self):
  for s in ['mf-status-unwatched','mf-status-started','mf-status-watched','mf-stats-panel','mf-year-format','mf-poster-genres','mf-poster-progress']:
   self.assertIn(s,CSS)
  for s in ['mf-stats-panel','mf-year-format','mf-poster-genres','mf-poster-progress','mf-status-${status}']:
   self.assertIn(s,JS)
  self.assertIn('background:rgba(21,16,24,.80)',CSS)
  for s in ['#f3a8cf','#e5a340','#42b875']:
   self.assertIn(s,CSS)
  self.assertIn('line-clamp:4',CSS)
  self.assertIn('aria-label="Oglądaj dalej"',JS)
 def test_nfo_anime_rating_and_play_status(self):
  self.assertIn('rating = local?.Rating',SERVICE)
  self.assertIn('ParseNfoRating',SERVICE)
  self.assertIn('rating = PositiveRating(Get(json, "CommunityRating"))',SERVICE)
  self.assertIn('UnplayedItemCount',SERVICE)
  self.assertIn('RecursiveItemCount',SERVICE)
 def test_resumes_are_per_user_and_dont_write_jellyfin_history(self):
  self.assertIn('HiddenGate',SERVICE)
  self.assertIn('hidden-resume.json',SERVICE)
  self.assertIn('Users/Me',SERVICE)
  self.assertIn('UserItems/Resume',SERVICE)
  self.assertIn('Shows/NextUp',SERVICE)
  self.assertNotIn('POST /Users/',SERVICE)
  self.assertIn('api/resume/hide',CONTROLLER)
  self.assertIn('api/resume/restore',CONTROLLER)
 def test_js_behavior(self):
  p=subprocess.run(['node',str(P/'tests/ui_behavior_v042.cjs')],capture_output=True,text=True)
  self.assertEqual(p.returncode,0,p.stdout+p.stderr)

if __name__=='__main__':unittest.main()
