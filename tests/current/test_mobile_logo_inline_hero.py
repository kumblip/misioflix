"""Mobile MisioFlix banner: no dedicated logo row or column."""
import unittest
from pathlib import Path
CSS = (Path(__file__).resolve().parents[2] / 'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf-8')

class MobileLogoInlineHero(unittest.TestCase):
    def test_mobile_logo_participates_in_shortcut_wrap(self):
        mobile = CSS.split('/* On Android the logo is the FIRST inline tile', 1)[1].split('/* v0.4.113: same compact three-across', 1)[0]
        self.assertIn('.mf-home-hero .mf-home-intro{display:none}', mobile)
        self.assertIn('.mf-home-hero .mf-home-folder-buttons::before', mobile)
        self.assertIn("background:url('/MisioFlix/assets/logo.png')", mobile)
        self.assertIn('order:-1', mobile)
        self.assertIn('flex-wrap:wrap;gap:6px;', mobile)
        self.assertNotIn('flex-direction:column', mobile)
    def test_desktop_logo_is_retained(self):
        self.assertIn('.mf-home-hero .mf-home-intro{\n  flex:0 0 auto;',CSS)
        self.assertIn('.mf-home-hero .mf-home-logo{\n  max-width:84px;',CSS)

if __name__=='__main__': unittest.main()
