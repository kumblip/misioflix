"""Separate MAL and Simkl rating placement without playback/backup changes."""
from version_contract import CURRENT_RELEASE
from pathlib import Path
import json,unittest
ROOT=Path(__file__).resolve().parents[2]
W=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
MAL=(W/'mal.js').read_text();SIM=(W/'simkl.js').read_text()
MC=(W/'mal-frames.css').read_text();SC=(W/'simkl.css').read_text()
class RatingBeforeDate064(unittest.TestCase):
 def test_version(self):
  self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'],CURRENT_RELEASE)
 def test_mal_only_meta_row(self):
  src=MAL.split('  function showDetailMalRating(',1)[1].split('  function showMalSaveToast(',1)[0]
  self.assertIn(".detailRibbon .infoWrapper .itemMiscInfo-primary",src)
  self.assertIn('row.prepend(label)',src)
  self.assertNotIn('anchor?.appendChild(label)',src)
  self.assertIn('★ Bez oceny · MAL',src)
  self.assertIn('.detailRibbon .mf-detail-mal-badge',MC)
 def test_simkl_only_meta_row(self):
  src=SIM.split('  function decorateDetailFrame(session){',1)[1].split('  function updateAllFrames(){',1)[0]
  self.assertIn(".detailRibbon .infoWrapper .itemMiscInfo-primary",src)
  self.assertIn('row.prepend(badge)',src)
  self.assertNotIn('actions.prepend(badge)',src)
  self.assertNotIn("querySelector('.mainDetailButtons')",src)
  self.assertIn("type==='Season'||!data.connected",src)
  self.assertIn('Bez oceny',src)
  self.assertIn('.detailRibbon .mf-simkl-detail-score',SC)
  self.assertNotIn('.mf-detail-mal-badge',SC)
 def test_no_interop(self):
  self.assertNotIn('mf-simkl-detail-score',MAL)
  self.assertNotIn('mf-detail-mal-badge',SIM)
if __name__=='__main__':unittest.main()
