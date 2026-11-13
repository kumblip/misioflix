"""Simkl 0.4.46 contract and stable-v0.4.45 non-regression boundary tests.

These inspect the integration sources; they do NOT imply remote API calls or a .NET compile.
"""
import re
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
CATALOG=(SRC/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf8')
SERVICE=(SRC/'Services/MisioFlixSimklService.cs').read_text(encoding='utf8')
ROUTES=(SRC/'Controllers/MisioFlixSimklController.cs').read_text(encoding='utf8')
REG=(SRC/'Services/ScriptInjection.cs').read_text(encoding='utf8')
WEB=(SRC/'Web/simkl.js').read_text(encoding='utf8')
STYLE=(SRC/'Web/simkl.css').read_text(encoding='utf8')
CONFIG=(SRC/'Web/configPage.html').read_text(encoding='utf8')

class SimklIsolated046(unittest.TestCase):
    def test_dedicated_backend(self):
        self.assertIn('class MisioFlixSimklService',SERVICE)
        self.assertIn('class MisioFlixSimklController',ROUTES)
        self.assertIn('[Route("MisioFlix/api/simkl")]',ROUTES)
        self.assertNotIn('MisioFlixMalService',SERVICE)
        self.assertNotIn('MisioFlixMalController',ROUTES)

    def test_api_v2_and_pkce(self):
        for phrase in ['/oauth2/device','/oauth2/token','"code_challenge"','"code_challenge_method","S256"','"code_verifier"', 'media:read media:write','refresh_token']:
            with self.subTest(phrase=phrase):self.assertIn(phrase,SERVICE)
        self.assertIn('SHA256.HashData',SERVICE)
        self.assertIn('RandomNumberGenerator.GetBytes',SERVICE)
        self.assertNotIn('/oauth/pin',SERVICE)

    def test_scopes_and_app_identifiers(self):
        self.assertIn('"client_id="+Uri.EscapeDataString(credential.ClientId)',SERVICE)
        self.assertIn('app-name=misioflix&app-version=0.4.50',SERVICE)
        self.assertIn('media:write',SERVICE)
        self.assertIn('ClientId()',SERVICE)

    def test_per_user_token_server_only(self):
        for phrase in ['Guid.TryParse(user','PathFor(user)','_authLocks','_syncLocks','File.SetUnixFileMode','File.Delete(PathFor(user))']:
            with self.subTest(phrase=phrase):self.assertIn(phrase,SERVICE)
        self.assertNotIn('access_token',WEB)
        self.assertNotIn('refresh_token',WEB)
        self.assertNotIn('localStorage',WEB)

    def test_root_anime_excluded_server_side(self):
        self.assertIn('AuthorizedSimklTargetAsync',CATALOG)
        self.assertIn('Configuration.AnimeRoot',CATALOG)
        self.assertIn('IsBelowRoot(local.Path',CATALOG)
        self.assertIn('return new SimklMediaTarget(false',CATALOG)
        self.assertIn('!target.Relevant',SERVICE)
        self.assertIn('if(!target.Relevant)return Ok(new{relevant=false})',ROUTES)
        self.assertIn('if(!result.relevant)return;',WEB)

    def test_user_permissions_seasons(self):
        self.assertIn('Items?UserId=',CATALOG)
        self.assertIn('SeriesId',CATALOG)
        self.assertIn('Sezon nie należy do podanego serialu',CATALOG)
        self.assertIn('Sezon',WEB)
        self.assertIn('target.SeasonNumber',ROUTES)

    def test_external_id_matching_no_title_guess(self):
        for phrase in ['"tmdb"','"imdb"','"tvdb"','MakeSimklTarget','Match(snapshot,target)']:
            self.assertIn(phrase,CATALOG+SERVICE)
        self.assertIn('if(selected is not null&&selected.Id!=entry.Id)',SERVICE)
        self.assertNotIn('search?query=',SERVICE)

    def test_only_manual_update_writes(self):
        self.assertIn('[HttpPost("update")]',ROUTES)
        self.assertIn("await request('/update','POST'",WEB)
        self.assertIn('form.addEventListener(\'submit\'',WEB)
        self.assertIn('window.confirm(',WEB)
        before,after=SERVICE.split('public async Task<SimklEntry?> UpdateAsync',1)
        before=re.sub(r'//[^\n]*','',before)
        self.assertNotIn('ApiAsync(user,HttpMethod.Post,"/sync/add-to-list"',before)
        self.assertNotIn('ApiAsync(user,HttpMethod.Post,"/sync/ratings"',before)
        self.assertIn('/sync/add-to-list',after)
        self.assertIn('/sync/ratings',after)
        self.assertNotIn('scrobble/',SERVICE)
        self.assertIn('[HttpPost("season-history")]',ROUTES)
        self.assertIn("request('/season-history','POST'",WEB)
        self.assertIn('if(input.SeasonId.HasValue)return BadRequest',ROUTES)

    def test_rating_first_status_last(self):
        edit=SERVICE.split('public async Task<SimklEntry?> UpdateAsync',1)[1]
        self.assertLess(edit.index('if(edit.ChangeScore)'),edit.index('if(edit.ChangeStatus)'))
        self.assertIn('target.Kind',edit)
        self.assertIn('EnsureWriteAcknowledged(response.RootElement,target.Kind,removal:edit.Score==0)',edit)

    def test_write_ack_has_array_and_counts(self):
        self.assertIn('confirmed.ValueKind==JsonValueKind.Array?confirmed.GetArrayLength()',SERVICE)
        self.assertIn('Count(acknowledged,kind)',SERVICE)
        self.assertIn('var key=removal?"deleted":"added";',SERVICE)
        self.assertIn('missing.TryGetProperty(kind',SERVICE)

    def test_no_bogus_episodes_write(self):
        self.assertIn('WatchedEpisodes',SERVICE)
        self.assertIn('Pojedyncze odcinki',WEB)
        edit=SERVICE.split('public async Task<SimklEntry?> UpdateAsync',1)[1]
        self.assertNotIn('watched_episodes_count',edit)
        self.assertNotIn('watchedEpisodes',edit)

    def test_independent_styles(self):
        self.assertIn('mf-simkl-detail-panel',STYLE)
        self.assertIn('mf-simkl-modal-overlay',STYLE)
        self.assertIn('mf-simkl-mobile-toggle',STYLE)
        self.assertNotIn('.mf-mal-',re.sub(r'/\*.*?\*/','',STYLE,flags=re.S))
        self.assertIn('mf-detail-poster-rail',WEB)
        self.assertNotIn('mf-mal-',WEB)
        self.assertIn('.mf-simkl-',WEB)

    def test_login_and_admin_settings(self):
        self.assertIn('SimklClientId',CONFIG)
        self.assertIn('Simkl AUTH V2 Client ID',CONFIG)
        self.assertIn('mf-simkl-config-form',CONFIG)
        self.assertIn('mf-home-simkl-button',WEB)
        self.assertIn('simkl.com/pin',WEB)
        self.assertIn('mf-simkl-modal',WEB)

    def test_assets_isolated(self):
        self.assertIn('simkl.js',REG)
        self.assertIn('simkl.css',REG)
        self.assertIn('AddSingleton<MisioFlixSimklService>',REG)
        self.assertIn('AddHttpClient("MisioFlixSimkl"',REG)
        self.assertNotIn('AddHttpClient<MisioFlixSimklService>',REG)
        self.assertIn('Web.simkl.js',(SRC/'Controllers/MisioFlixController.cs').read_text())
        self.assertIn('Web.simkl.css',(SRC/'Controllers/MisioFlixController.cs').read_text())

    def test_old_stable_logic_untouched(self):
        old=(SRC/'Web/home.js').read_text()
        theme=(SRC/'Web/theme.css').read_text()
        mal=(SRC/'Web/mal.js').read_text()
        self.assertIn('addScrollEventListener',old)
        self.assertIn('mf-native-stats',theme)
        self.assertIn('/MisioFlix/api/mal',mal)
        self.assertNotIn("request('/simkl",old)
        self.assertNotIn('mf-simkl-native-score',theme)
        self.assertNotIn('mf-simkl-native-score',mal)

    def test_version_beta(self):
        self.assertIn('0.4.53.0',(ROOT/'meta.json').read_text())
        self.assertIn('<AssemblyVersion>0.4.53.0</AssemblyVersion>',(SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text())

if __name__=='__main__':unittest.main()
