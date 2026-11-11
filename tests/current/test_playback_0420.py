"""v0.4.20 regression contracts: click-to-play never navigates by default."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
JS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf8')
CSS=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf8')

class Playback0420(unittest.TestCase):
    def test_playables_are_not_details_links(self):
        self.assertIn("const link=own('button','mf-home-resume-poster')",JS)
        self.assertIn("own('span','mf-home-resume-title'",JS)
        self.assertNotIn("own('a','mf-home-resume-poster')",JS)
        self.assertNotIn("own('a','mf-home-resume-title'",JS)
    def test_info_still_opens_root(self):
        self.assertIn('const details=nativeDetails(item.id,item.serverId)',JS)
        self.assertIn("own('a','mf-home-resume-info','i')",JS)
        self.assertIn("if(event.target.closest('.mf-home-resume-info,.mf-home-resume-card-actions'))return;",JS)
    def test_exact_id_and_native_player(self):
        self.assertIn('async function playResume(entry)',JS)
        self.assertIn('async function playViaItemDetails(entry,serial)',JS)
        self.assertIn('const route=nativeDetails(targetId,entry.item.serverId)',JS)
        self.assertIn('button.click(); // Jellyfin',JS)
        self.assertNotIn('window.location.hash=nativeDetails(entry.resumeId,item.serverId)',JS)
    def test_no_shortcut_false_positive(self):
        self.assertIn('await pause(950);',JS)
        self.assertIn('if(serial!==resumePlaySerial || playingLocally())return;',JS)
        self.assertIn('await playViaItemDetails(entry,serial)',JS)
        self.assertNotIn('if(click.defaultPrevented)return',JS)
    def test_do_not_touch_video_isolation(self):
        self.assertIn('mf-home-resume-poster:focus-visible',CSS)
        self.assertIn('mf-home-play-warning',CSS)
        self.assertIn('misioflix-skin',CSS)

if __name__=='__main__':unittest.main()
