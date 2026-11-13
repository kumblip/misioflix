"""v0.4.45: use real episode totals in native season poster badges."""
import json
import re
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
CATALOG=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text(encoding='utf8')
CLIENT=(WEB/'client.js').read_text(encoding='utf8')
CSS=(WEB/'theme.css').read_text(encoding='utf8')
HOME=(WEB/'home.js').read_text(encoding='utf8')

class NativeSeasonPaw0445(unittest.TestCase):
    def test_version(self):
        version=json.loads((ROOT/'meta.json').read_text())['version']
        self.assertGreaterEqual(tuple(map(int,version.split('.'))),(0,4,45,0))
        self.assertIn(f'<AssemblyVersion>{version}</AssemblyVersion>',
            (ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text())
    def test_season_episode_total_is_distinct_from_native_unplayed_count(self):
        self.assertIn('type == "Season" ? PositiveInt(Get(item,"ChildCount"))',CATALOG)
        self.assertIn('?? PositiveInt(Get(item,"RecursiveItemCount"))',CATALOG)
        self.assertIn('seasons = type == "Series" ? PositiveInt(Get(item,"ChildCount")) : null',CATALOG)
        self.assertIn('set(\'data-mf-episodes\',data.episodes)',CLIENT)
        self.assertIn("if(eps)result.push({value:eps,label:'Odcinki'",CLIENT)
        self.assertIn("stat.appendChild(paw(s.color))",CLIENT)
        self.assertIn('html.misioflix-skin .card:has(.mf-native-stats) .countIndicator {display:none!important}',CSS)
    def test_native_cards_are_not_rebuilt_or_routed(self):
        self.assertIn("const surface=card.querySelector('.cardScalable,.MuiCardMedia-root')",CLIENT)
        self.assertIn('surface.appendChild(overlay)',CLIENT)
        self.assertNotIn('addScrollEventListener',CLIENT)
        self.assertNotIn('replaceWith(',CLIENT)
    def test_error_recovery_is_targeted_not_global(self):
        self.assertIn("const mixedRoute = () => /^#\\/mixed",HOME)
        self.assertIn("if(sessionStorage.getItem(MIXED_RECOVERY_KEY)==='1')return;",HOME)
        self.assertIn('window.location.reload(); // one retry',HOME)
        self.assertIn('if(!mixedRoute() || !document.body)return;',HOME)

if __name__=='__main__':unittest.main()
