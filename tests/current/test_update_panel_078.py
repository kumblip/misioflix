import json
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'src/Jellyfin.Plugin.MisioFlix'
DETAILS=(BASE/'Web/details.js').read_text(encoding='utf8')
UI=(BASE/'Web/configPage.html').read_text(encoding='utf8')
SERVICE=(BASE/'Services/MisioFlixUpdateService.cs').read_text(encoding='utf8')
CONTROLLER=(BASE/'Controllers/MisioFlixUpdateController.cs').read_text(encoding='utf8')
REG=(BASE/'Services/ScriptInjection.cs').read_text(encoding='utf8')

class UpdatePanel078(unittest.TestCase):
    def test_native_schedule_and_package_install_only(self):
        self.assertIn("query('Repositories','POST',updated)", UI)
        self.assertIn('forceLiveRepositoryRead()', UI)
        self.assertIn("query('Packages/Installed/MisioFlix?'+params.toString(),'POST')", UI)
        self.assertNotIn('File.WriteAllBytes',SERVICE)
        self.assertNotIn('Directory.CreateDirectory',SERVICE)
        self.assertNotIn('WebClient',SERVICE)
        self.assertIn('[Authorize]',CONTROLLER)

    def test_three_independent_update_sources(self):
        self.assertIn('api.github.com/repos/kumblip/misioflix/releases/latest', SERVICE)
        self.assertIn('raw.githubusercontent.com/kumblip/misioflix/main/manifest.json', SERVICE)
        self.assertIn("query('Packages')", UI)
        self.assertIn("query('Repositories')", UI)
        self.assertIn("releaseCompatible", UI)
        self.assertIn('!matchingCatalog',UI)
        self.assertIn("'12.4.0.0'",UI)
        self.assertIn('repoOK',UI)

    def test_background_every_15_minutes_but_no_auto_install(self):
        self.assertIn('TimeSpan.FromMinutes(15)', SERVICE)
        self.assertIn('AutoCheckUpdates != false',SERVICE)
        self.assertIn('AddHostedService<MisioFlixUpdateService>(provider => provider.GetRequiredService<MisioFlixUpdateService>())',REG)
        self.assertIn('public bool AutoCheckUpdates { get; set; } = true;',
                      (BASE/'Configuration/PluginConfiguration.cs').read_text())
        self.assertIn('bez automatycznego instalowania',UI)

    def test_no_arbitrary_download_url_or_repository_update(self):
        self.assertIn('AllowAutoRedirect=false',REG)
        self.assertIn('PluginGuid',SERVICE)
        self.assertIn('POST /Repositories',UI)
        self.assertIn("query('Repositories','POST',updated)",UI)
        self.assertNotIn('rm -rf',UI)

    def test_all_media_details_deterministic_back_and_tv_seasons(self):
        self.assertNotIn('window.history.back()',DETAILS)
        self.assertIn("if(type==='Episode' && valid(parentSeason))",DETAILS)
        self.assertIn("if((type==='Season'||type==='Episode') && valid(parentSeries))",DETAILS)
        self.assertIn("navigateTop('#/home')",DETAILS)
        self.assertIn("if(type==='Season' && valid(rawSeriesId)",DETAILS)
        self.assertIn("if(!anime || type!=='Season'",DETAILS)

    def test_config_embedded_js_syntax(self):
        script=UI.split('<script>',1)[1].split('</script>',1)[0]
        result=subprocess.run(['node','--check','-'], input=script, text=True, capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)

    def test_package_version_is_latest(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'],'0.4.86.0')
        self.assertIn('<AssemblyVersion>0.4.86.0</AssemblyVersion>',
                      (BASE/'Jellyfin.Plugin.MisioFlix.csproj').read_text())

if __name__=='__main__': unittest.main()
