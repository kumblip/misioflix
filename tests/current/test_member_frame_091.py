"""v0.4.91 regression: one dark frame; no nested collection counter framing."""
from version_contract import CURRENT_RELEASE
import json, subprocess, unittest
from pathlib import Path
R=Path(__file__).resolve().parents[2]
CSS=(R/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf-8')
HOME=(R/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf-8')
NATIVE=(R/'src/Jellyfin.Plugin.MisioFlix/Web/client.js').read_text(encoding='utf-8')
SIMKL=(R/'src/Jellyfin.Plugin.MisioFlix/Web/simkl.js').read_text(encoding='utf-8')
class SharedFrame091(unittest.TestCase):
 def test_single_frame_css(self):
  block=CSS[CSS.index('html.misioflix-skin .mf-home-stats > .mf-home-stat.mf-home-member-collection,'):]
  assert '.mf-home-stats > .mf-home-stat.mf-home-member-collection' in block
  assert '.mf-native-stats > .mf-native-collection-member' in block
  assert 'border:0' in block and 'background:transparent' in block and 'box-shadow:none' in block
  assert '.mf-home-stats{' in CSS and '.mf-native-stats {' in CSS
  assert 'border:1px solid rgba(255,255,255,.4)' in CSS
  assert 'border:1px solid rgba(255,224,240,.5)' in CSS
  assert 'v0.4.90: a real collection' not in CSS
 def test_membership_inside_stack_and_paws_before(self):
  self.assertIn("const mark=own('span','mf-home-stat mf-home-member-collection'",HOME)
  self.assertIn('count.appendChild(mark)',HOME)
  self.assertIn("mf-native-collection-member",NATIVE)
  self.assertIn('stack.appendChild(mark)',NATIVE)
  self.assertIn("makeEl('span','mf-native-box-icon','📦')",NATIVE)
  self.assertIn("if(member)container.insertBefore(badge,member);",SIMKL)
  self.assertIn('container.insertBefore(old,member)',SIMKL)
 def test_boxsets_unchanged_and_jellyfin_css_outside(self):
  self.assertIn("collectionSize+' 🎬'",HOME)
  self.assertIn('content:"🎬"',CSS)
  self.assertTrue((R/'Jellyfin_Wlasny_CSS.txt').is_file())
  self.assertTrue((R/'zrobionepozamisioflixem.txt').is_file())
 def test_real_js_logic(self):
  result=subprocess.run(['node',str(R/'tests/current/member_frame_091.cjs')],capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr)
 def test_version(self):
  self.assertEqual(json.loads((R/'meta.json').read_text())['version'],CURRENT_RELEASE)
if __name__=='__main__':unittest.main()
