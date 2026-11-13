"""v0.4.51: Simkl ratings and mobile cards; no network or .NET runtime needed."""
import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
HOME=(SRC/'Web/home.js').read_text()
CLIENT=(SRC/'Web/client.js').read_text()
SIMKL=(SRC/'Web/simkl.js').read_text()
STYLE=(SRC/'Web/simkl.css').read_text()
CAT=(SRC/'Services/MisioFlixCatalogService.cs').read_text()
CONTROLLER=(SRC/'Controllers/MisioFlixSimklController.cs').read_text()
MAL=(SRC/'Web/mal.js').read_text()

class SimklPosters051(unittest.TestCase):
    def test_version_consistency(self):
        version=json.loads((ROOT/'meta.json').read_text())['version']
        self.assertEqual(version,'0.4.53.0')
        self.assertIn(f'<AssemblyVersion>{version}</AssemblyVersion>',(SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text())

    def test_uses_personal_nas_backup_never_jellyfin_user_rating(self):
        self.assertIn('AuthorizedSimklCardTargetsAsync',CAT)
        self.assertIn('[HttpGet("card-scores")]',CONTROLLER)
        self.assertIn('_local.ReadAsync(user,cancel)',CONTROLLER)
        self.assertIn('found.Score is > 0 and <= 10',CONTROLLER)
        self.assertNotIn('addStat(item.userRating',HOME)
        self.assertIn("if(kind==='anime'&&rating)",CLIENT)
        self.assertIn("request('/card-scores?ids='+encodeURIComponent(batch.join(',')))",SIMKL)

    def test_jellyfin_authorizes_and_anime_skipped(self):
        self.assertIn('AuthenticatedUserAsync(caller,cancel)',CAT)
        self.assertIn('IncludeItemTypes=Movie,Series',CAT)
        self.assertIn('MakeSimklTarget',CAT)
        self.assertIn('if(target.Relevant&&target.Ids.Count>0)',CAT)
        self.assertIn('return new SimklMediaTarget(false',CAT)
        self.assertIn("card.dataset.mfAnime==='1'",SIMKL)
        self.assertNotIn('mf-simkl-native-score',MAL)

    def test_per_user_cache_and_no_external_card_queries(self):
        self.assertIn('const selectedUser=currentUser;',SIMKL)
        self.assertIn('if(currentUser!==selectedUser)return;',SIMKL)
        self.assertIn('cardScores.clear();cardStates.clear();pendingScoreIds.clear()',SIMKL)
        self.assertIn('slice(0,36)',SIMKL)
        self.assertNotIn('await _simkl.ReadItemAsync',CONTROLLER.split('CardScores(',1)[1].split('[HttpGet("connection")]',1)[0])

    def test_unique_simkl_paws_and_card_classes(self):
        for token in ['mf-simkl-native-score','mf-simkl-home-score','mf-simkl-score-paw','mf-simkl-media-search','mf-simkl-media-grid','mf-simkl-media-card','mf-simkl-media-title','mf-simkl-native-media']:
            self.assertIn(token,HOME+SIMKL+STYLE)
        self.assertNotRegex(STYLE,r'\.mf-mal-[A-Za-z0-9-]+')
        self.assertIn("'mf-home-poster'+(nonAnimeMedia?' mf-simkl-media-poster':'')",HOME)

    def test_movie_rating_only_and_serial_episode_paws_intact(self):
        self.assertIn("if(item.type!=='Movie')",HOME)
        self.assertIn("addStat(item.seasons,'Sezony'",HOME)
        self.assertIn("addStat(item.episodes,'Odcinki'",HOME)
        self.assertIn("if(kind==='anime'||kind==='serial')",CLIENT)
        self.assertIn("const badge=el('span',cls)",SIMKL)

    def test_three_column_media_search_android_ios(self):
        self.assertIn('repeat(3,minmax(0,1fr))!important',STYLE)
        self.assertIn('.mf-simkl-media-search .mf-simkl-media-grid',STYLE)
        self.assertIn('.mf-simkl-media-title {',STYLE)
        self.assertIn('text-overflow:ellipsis',STYLE)
        self.assertIn('@media(max-width:680px)',STYLE)

    def test_collection_count_movie_clapper_not_word(self):
        self.assertIn("count+' 🎬'",HOME)
        self.assertNotIn("badge(left,count+' filmów'",HOME)
        self.assertIn("aria-label',count+' filmów w kolekcji'",HOME)

    def test_javascript_syntax(self):
        for name in ('home.js','client.js','simkl.js'):
            with self.subTest(name=name):
                subprocess.run(['node','--check',str(SRC/'Web'/name)],check=True,capture_output=True)

if __name__=='__main__':unittest.main()
