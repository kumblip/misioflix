"""MAL v0.4.31: regression guards for detail remount/request loops, no credentials/network."""
import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'src/Jellyfin.Plugin.MisioFlix'
WEB = (SRC / 'Web/mal.js').read_text(encoding='utf8')


class MALLoop0431(unittest.TestCase):
    def test_version_tracks_meta_not_frozen(self):
        version = json.loads((ROOT / 'meta.json').read_text(encoding='utf8'))['version']
        self.assertGreaterEqual(tuple(map(int, version.split('.'))), (0, 4, 31, 0))
        project = (SRC / 'Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf8')
        self.assertIn(f'<AssemblyVersion>{version}</AssemblyVersion>', project)
        self.assertIn(f'<FileVersion>{version}</FileVersion>', project)

    def test_parses_with_node(self):
        subprocess.run(['node', '--check', str(SRC / 'Web/mal.js')], check=True, capture_output=True)

    def test_requests_deduplicated_per_jellyfin_user_and_item(self):
        self.assertIn('const detailSessions=new Map()', WEB)
        self.assertIn('const key=`${uid}:${id}`', WEB)
        self.assertIn("if(session.phase==='loading')return session.promise", WEB)
        self.assertIn('session.promise=run', WEB)

    def test_failed_catalog_lookup_keeps_panel(self):
        block = WEB.split('function startDetailRead(', 1)[1].split('function mountDetails(', 1)[0]
        self.assertNotIn('panel.remove()', block)
        self.assertIn("updateSession(session,'error'", block)
        self.assertIn("updateSession(session,'missing'", block)
        self.assertIn("updateSession(session,'irrelevant'", block)

    def test_retry_is_user_initiated(self):
        view = WEB.split('function paintSession(', 1)[1].split('function updateSession(', 1)[0]
        self.assertIn("session.phase==='error'||session.phase==='missing'", view)
        self.assertIn("retry.addEventListener('click',()=>startDetailRead(session,true))", view)

    def test_panel_unmounted_does_not_clear_session(self):
        block = WEB.split('function syncDetails()',1)[1].split('function tick()',1)[0]
        self.assertIn('mountDetails(page,id)',block)
        self.assertNotIn('detailSessions.clear()',block)
        self.assertIn("detailPanel.closest('#itemDetailPage')===page",block)

    def test_home_does_not_fetch_anime_entries(self):
        block=WEB.split('function mountHomeButton()',1)[1].split('function closeDialog()',1)[0]
        self.assertNotIn("request('/item",block)
        self.assertIn('connectionStatus()',block)

    def test_selected_season_keeps_own_mal_id(self):
        self.assertIn('api/mal/resolve?catalogId=', WEB)
        self.assertIn('Number(target.malId)', WEB)
        self.assertIn("seasonId?'&seasonId='+seasonId:''",WEB)

    def test_timeout_and_local_caching(self):
        self.assertIn('controller.abort()',WEB)
        self.assertIn('const cacheTime=60*60*1000',WEB)
        self.assertIn('loadCache(uid,malId)',WEB)
        self.assertIn("&refresh=false`",WEB)
        self.assertIn("&refresh=true`",WEB)


if __name__=='__main__': unittest.main()
