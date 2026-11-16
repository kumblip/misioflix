import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'src' / 'Jellyfin.Plugin.MisioFlix'
MAL = (SRC/'Web/mal.js').read_text('utf8')
CSS = (SRC/'Web/mal-frames.css').read_text('utf8')
CLIENT = (SRC/'Web/client.js').read_text('utf8')
CATALOG = (SRC/'Services/MisioFlixCatalogService.cs').read_text('utf8')
STARTUP = (SRC/'Services/ScriptInjection.cs').read_text('utf8')
ROUTES = (SRC/'Controllers/MisioFlixController.cs').read_text('utf8')
SIMKL = (SRC/'Web/simkl.js').read_bytes()

class MALGoldGreenFrame061(unittest.TestCase):
    def test_version_and_new_css_asset(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'], '0.4.77.0')
        self.assertIn('AssemblyVersion>0.4.77.0', (SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text())
        self.assertIn('assets/mal-frames.css?v=',STARTUP)
        self.assertIn('"mal-frames.css" => ("Web.mal-frames.css"', ROUTES)
        self.assertIn('<EmbeddedResource Include="Web/**/*" />',(SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text())
    def test_mixed_only_when_mal_completed_and_resume(self):
        self.assertIn("state==='watched'&&malCardResume(card,mediaId)",MAL)
        self.assertIn("statusState(entry)==='watched'",MAL)
        self.assertIn('malHasActiveResume(ctx.catalogId,ctx.seasonId?ctx.seasonNumber:null)',MAL)
        self.assertIn("row?.next_up===true||!(Number(row?.position_ticks)>0)",MAL)
        self.assertNotIn('misioflix-simkl',MAL)
    def test_season_binding_is_separate_and_numeric(self):
        self.assertIn("'data-mf-mal-series'",CLIENT)
        self.assertIn("'data-mf-mal-season'",CLIENT)
        self.assertIn('malSeriesId = anime && seasonParentId != Guid.Empty',CATALOG)
        self.assertIn('malSeasonNumber = anime ? simklIndex : null',CATALOG)
        self.assertIn('simklSeriesId = !anime && seasonParentId',CATALOG)
        self.assertIn('malResumeSeasons.get(catalog)?.has(number)',MAL)
    def test_read_only_resume_with_authenticated_user_and_safe_failure(self):
        self.assertIn("fetch('/MisioFlix/api/resume'",MAL)
        self.assertIn('headers:headers()',MAL)
        self.assertIn('if(uid!==currentUser)return',MAL)
        self.assertIn('malResumeReadAt=Date.now()-30000',MAL)
        self.assertIn('malResumeCatalogs=new Set();malResumeSeasons=new Map()',MAL)
        self.assertNotIn("request('/update'",MAL[MAL.index('async function refreshMalResume'):MAL.index('const clearCache=')])
    def test_css_scoped_to_mal_only_and_poster_only(self):
        self.assertIn('[data-mf-mal-frame="mixed"]',CSS)
        self.assertIn('linear-gradient(90deg,#e6a23c 0 50%,#45b879 50% 100%)',CSS)
        self.assertIn('.mf-home-poster[data-mf-mal-id]',CSS)
        self.assertIn('.card[data-mf-anime="1"]',CSS)
        self.assertIn('.mf-detail-poster-rail > .detailImageContainer::after',CSS)
        self.assertIn('position:relative!important',CSS)
        self.assertNotIn('data-mf-simkl-watch',CSS)
        self.assertNotIn('mf-simkl-',CSS)
    def test_no_auto_update_mal_after_resuming(self):
        resume=MAL[MAL.index('async function refreshMalResume()'):MAL.index('const clearCache=')]
        self.assertNotIn("request('/update'",resume)
        self.assertNotIn("method:'POST'",resume)
        self.assertNotIn('episodesWatched:',resume)
    def test_simkl_stays_at_approved_visual_delta_064(self):
        import hashlib
        self.assertEqual(hashlib.sha256(SIMKL).hexdigest(),
            'da2b0a322fce9bdfe58d75084eb4296d2ab1dcd3b30471f77482f858873c245d')

if __name__=='__main__':unittest.main()
