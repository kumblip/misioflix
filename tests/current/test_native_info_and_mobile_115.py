"""Regression: native library buttons and consistent 2-line mobile tile layout."""
import json,unittest
from pathlib import Path
R=Path(__file__).resolve().parents[2]
C=(R/'src/Jellyfin.Plugin.MisioFlix/Web/client.js').read_text(encoding='utf8')
H=(R/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf8')
S=(R/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf8')
B=(R/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text(encoding='utf8')
class Info115(unittest.TestCase):
 def test_native_button_uses_current_card_not_snapshot(self):
  p=C.split('function makeNativeLibraryInfo(card){',1)[1].split('  // v0.4.29 library presentation',1)[0]
  for s in ('if(!mfLibraryRoute()','box.appendChild(button)','metadataCache.get(id)',"card.getAttribute('data-id')",'window.MisioFlixOpenCardInfo(item,button)'):
   self.assertIn(s,p)
  self.assertIn("if(mfLibraryRoute())makeNativeLibraryInfo(card);",C)
  self.assertIn("window.MisioFlixOpenCardInfo = (item,opener) => openCardInfo(item,opener)",H)
 def test_native_and_generated_mobile_two_lines_no_native_descriptions(self):
  p=S.split('/* v0.4.115:',1)[1].split('/* v0.4.94:',1)[0]
  self.assertIn('mf-native-library-route',p)
  self.assertIn('.mf-native-description{display:none!important',p)
  self.assertIn('.mf-native-info-button',p)
  self.assertIn('.mf-home-shelf-scroll > .mf-home-card .mf-home-card-title',p)
  self.assertIn('.mf-home-recommendation-grid .mf-home-card-title',p)
  self.assertIn('.mf-home-search-grid .mf-home-card-title',p)
  self.assertEqual(p.count('-webkit-line-clamp:2!important'),2)
 def test_full_genres_preview_and_version(self):
  self.assertIn('genres = genres.ToList()',B)
  self.assertIn('item.genres.slice(0,3)',H)
  self.assertIn('const posterUrl=imageFor(item);',H)
  self.assertIn('append(actions,open,close)',H)
  v=json.loads((R/'meta.json').read_text(encoding='utf8'))['version']
  self.assertEqual(v,'0.4.115.0')
  self.assertIn('<AssemblyVersion>'+v+'</AssemblyVersion>',(R/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf8'))
if __name__=='__main__':unittest.main()
