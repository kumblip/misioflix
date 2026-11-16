"""Source-contract tests for Jellyfin 12.4's real package-manager refresh."""
from version_contract import CURRENT_RELEASE
import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'src/Jellyfin.Plugin.MisioFlix'
UI = (BASE/'Web/configPage.html').read_text(encoding='utf-8')
SERVER = (BASE/'Services/MisioFlixNativeCatalogRefreshService.cs').read_text(encoding='utf-8')
API = (BASE/'Controllers/MisioFlixUpdateController.cs').read_text(encoding='utf-8')
REG = (BASE/'Services/ScriptInjection.cs').read_text(encoding='utf-8')

class NativeCatalog092(unittest.TestCase):
    def test_only_admin_can_force_persist_jellyfin_repository(self):
        self.assertIn('[Authorize(Policy = Policies.RequiresElevation)]', API)
        self.assertIn('[HttpPost("native-catalog/refresh")]', API)
        self.assertIn('IServerConfigurationManager', SERVER)
        self.assertIn('_server.SaveConfiguration()', SERVER)
        self.assertIn('services.AddSingleton<MisioFlixNativeCatalogRefreshService>()', REG)
        self.assertNotIn('File.Write', SERVER)

    def test_native_package_manager_is_actual_source_of_verified_information(self):
        self.assertIn('IInstallationManager', SERVER)
        self.assertIn('_install.GetPackages("MisioFlix", url, true, cancel)', SERVER)
        self.assertIn('versions[0].VersionNumber', SERVER)
        self.assertIn('versions[0].TargetAbi', SERVER)
        self.assertIn('12.4.0.0', SERVER)
        self.assertIn('installed', SERVER)

    def test_immutable_commit_url_and_no_arbitrary_repositories(self):
        self.assertIn('api.github.com/repos/kumblip/misioflix/commits/main', SERVER)
        self.assertIn('raw.githubusercontent.com/kumblip/misioflix/', SERVER)
        self.assertIn('ShaPattern.IsMatch', SERVER)
        self.assertIn('matching.Length != 1', SERVER)
        self.assertIn('replacement[index].Url = pinnedUrl;', SERVER)
        self.assertIn('Name = r.Name, Url = r.Url, Enabled = r.Enabled', SERVER)
        self.assertIn('original', SERVER)
        self.assertNotIn('File.Delete', SERVER)
        self.assertNotIn('Dll', SERVER)

    def test_frontend_does_not_rewrite_configuration_directly(self):
        self.assertIn("query('MisioFlix/api/updates/native-catalog/refresh','POST')", UI)
        self.assertIn("query('Packages')", UI)
        self.assertIn("query('Repositories')", UI)
        self.assertNotIn("query('Repositories','POST'", UI)
        self.assertIn('pinnedRevision', UI)
        self.assertIn('isCommitted', UI)
        self.assertIn("query('Packages/Installed/MisioFlix?'+params.toString(),'POST')", UI)

    def test_version_and_javascript_syntax(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'], CURRENT_RELEASE)
        self.assertIn(f'<AssemblyVersion>{CURRENT_RELEASE}</AssemblyVersion>', (BASE/'Jellyfin.Plugin.MisioFlix.csproj').read_text())
        body=UI.split('<script>',1)[1].split('</script>',1)[0]
        result=subprocess.run(['node','--check','-'],input=body,text=True,capture_output=True)
        self.assertEqual(result.returncode,0,result.stderr)

if __name__=='__main__': unittest.main()
