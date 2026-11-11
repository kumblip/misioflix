"""MisioFlix 0.4.24: Jellyfin 12 appRouter requires serverId on /list URLs."""
from pathlib import Path
import json, re, unittest
ROOT=Path(__file__).resolve().parents[2]
H=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf-8')
D=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/details.js').read_text(encoding='utf-8')

class LibraryRoutes0424(unittest.TestCase):
    def test_version(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))['version'],'0.4.24.0')
    def test_native_jellyfin_list_has_server_id(self):
        self.assertIn("return '#/list?parentId='+encodeURIComponent(compactId(id))+'&serverId='+encodeURIComponent(server);", H)
        self.assertIn('if(!validId(server))return', H)
        self.assertIn('const server=libraryServerId(href)', H)
    def test_uses_api_client_and_native_link_fallback(self):
        self.assertIn("typeof api?.serverId==='function'", H)
        self.assertIn("window.ConnectionManager?.getCurrentServer?.()", H)
        self.assertIn('a[href*="serverId="]', H)
    def test_anime_mixed_route_left_intact(self):
        self.assertIn('if(!LIBRARY_ROUTE.test(href||\'\'))return href', H)
        self.assertRegex(H, r'\(\?:movies\|tv\)')
        self.assertNotRegex(H, r'LIBRARY_ROUTE = .*movies\|tv\|mixed')
    def test_incomplete_old_deep_link_is_repaired_without_touching_generic_list(self):
        self.assertIn("else if(/^#\\/list\\?parentId=", H)
        self.assertIn("if(!target || target===route)return false", H)
        self.assertIn('window.location.replace(', H)
    def test_does_not_touch_player_or_detail_pages(self):
        self.assertIn('async function playEpisode(id)', D)
        self.assertIn('function activeDetailsPage', D)
        self.assertNotIn('DELETE /Items', H)

if __name__=='__main__': unittest.main()
