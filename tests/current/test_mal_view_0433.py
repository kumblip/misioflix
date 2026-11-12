"""Read-only MAL details and user-scoped MAL watch frames (no credentials/network)."""
import json, subprocess, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
MAL=(SRC/'Web/mal.js').read_text()
HOME=(SRC/'Web/home.js').read_text()
CLIENT=(SRC/'Web/client.js').read_text()
CSS=(SRC/'Web/theme.css').read_text()
CAT=(SRC/'Services/MisioFlixCatalogService.cs').read_text()

class MalView0433(unittest.TestCase):
    def test_version_not_frozen(self):
        v=json.loads((ROOT/'meta.json').read_text())['version']
        self.assertGreaterEqual(tuple(map(int,v.split('.'))),(0,4,33,0))
        self.assertIn(f'<AssemblyVersion>{v}</AssemblyVersion>',(SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text())
    def test_read_only_status_visible_before_editor(self):
        self.assertIn("el('div','mf-mal-readonly')",MAL)
        self.assertIn("el('details','mf-mal-editor')",MAL)
        self.assertIn("'Edytuj MAL'",MAL)
        self.assertIn('editor.open=Boolean(editorOpen)',MAL)
        self.assertIn("['Pełne obejrzenia'",MAL)
    def test_personal_rating_replaces_community_only_on_anime(self):
        self.assertIn('mf-detail-mal-rating',MAL)
        self.assertIn('Osobista ocena zalogowanego użytkownika MyAnimeList',MAL)
        self.assertIn('.starRatingContainer',CSS)
        nfo_reader=CAT.split('private static LocalNfo? ReadNfo(',1)[1].split('private static double? ParseNfoRating(',1)[0]
        self.assertNotIn('WriteAllText',nfo_reader)
    def test_mal_status_authoritative_for_anime_only(self):
        self.assertIn("if(x.status==='completed')return 'watched'",MAL)
        self.assertIn("if(x.status==='watching'||x.status==='on_hold')return 'started'",MAL)
        self.assertIn("if(!entry)return 'unknown'",MAL)
        self.assertIn("item.anime?'unknown':state",HOME)
        self.assertIn("if(!item.anime)addStat(item.userRating",HOME)
        self.assertIn("if(data.anime)card.setAttribute('data-mf-watch','unknown')",CLIENT)
    def test_all_home_mal_values_from_nfo_and_local_snapshot(self):
        self.assertIn('malId = isAnime ?',CAT)
        self.assertIn('FirstSeasonMalId',CAT)
        self.assertIn('seasonnumber',CAT)
        self.assertIn('malId:item.malId??item.mal_id??null',HOME)
        self.assertRegex(MAL,r'misioflix-mal-index-v[0-9]+:')
        self.assertIn('loadIndex(uid)',MAL)
        self.assertIn('data-mf-mal-id',CLIENT)
    def test_no_mal_network_call_during_home_mount(self):
        home=MAL.split('function mountHomeButton()',1)[1].split('function closeDialog()',1)[0]
        self.assertNotIn("request('/status",home)
        self.assertNotIn("request('/item",home)
        decorator=MAL.split('function decorateMalCards()',1)[1].split('  const clearCache=',1)[0]
        self.assertNotIn('fetch(',decorator)
        self.assertNotIn('request(',decorator)
    def test_index_fetch_only_while_opening_anime(self):
        self.assertIn("request('/status?refresh=false')",MAL)
        self.assertIn('ensureIndexFromSelectedAnime(uid)',MAL)
        self.assertIn('indexState(uid).full',MAL)
    def test_save_and_refresh_update_local_frames(self):
        self.assertIn('saveIndexEntry(uid,malId,entry)',MAL)
        self.assertIn("new Event('misioflix-mal-cache-changed')",MAL)
        self.assertIn("'/update','POST'",MAL)
        self.assertIn('&refresh=true',MAL)
    def test_per_jellyfin_user_isolation(self):
        self.assertRegex(MAL,r'misioflix-mal-index-v[0-9]+:\$\{compact\(uid\)\}')
        self.assertIn('currentUser===ctx.userId',MAL)
        self.assertIn('onUserSwitch()',MAL)
    def test_not_connected_has_no_fake_jellyfin_score(self):
        self.assertIn("data?statusLabel(data.status):'Nie dodano do MAL'",MAL)
        self.assertIn("data?.score>0?",MAL)
    def test_no_player_or_nfo_changes(self):
        self.assertNotIn('playback/set',MAL)
        self.assertNotIn('markPlayed',MAL)
        self.assertNotIn('File.WriteAllText',MAL)
    def test_js_syntax(self):
        for f in ('mal.js','home.js','client.js'):
            subprocess.run(['node','--check',str(SRC/'Web'/f)],check=True,capture_output=True)

if __name__=='__main__': unittest.main()
