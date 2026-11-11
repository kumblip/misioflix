"""v0.4.19 source contracts, independent from Jellyfin server/SDK availability."""
import json
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[2]
P=ROOT/'src/Jellyfin.Plugin.MisioFlix'
JS=(P/'Web/home.js').read_text(encoding='utf8')
SVC=(P/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf8')
CTRL=(P/'Controllers/MisioFlixController.cs').read_text(encoding='utf8')
PLUGIN=(P/'Plugin.cs').read_text(encoding='utf8')
INJECT=(P/'Services/ScriptInjection.cs').read_text(encoding='utf8')

class Navigation0419(unittest.TestCase):
    def test_play_exact_resume_id_with_native_shortcuts(self):
        self.assertIn('async function playResume(entry)',JS)
        self.assertIn("'data-id':compactId(entry.resumeId)",JS)
        self.assertIn("button.setAttribute('data-action','resume')",JS)
        self.assertIn('data-positionticks',JS)
        self.assertIn("if(click.defaultPrevented)return",JS)
        self.assertIn('position_ticks = (long)Number(Get(data, "PlaybackPositionTicks"))',SVC)
        self.assertIn('entry.next_up, entry.position_ticks, entry.resume_type',SVC)
    def test_info_targets_root_not_resume_episode(self):
        self.assertIn('const details=nativeDetails(item.id,item.serverId)',JS)
        self.assertIn("own('a','mf-home-resume-info','i')",JS)
        self.assertIn("void playResume(entry)",JS)
    def test_hide_remains_reversible_and_delete_is_separate(self):
        self.assertIn("`/resume/${hidden?'restore':'hide'}`",JS)
        self.assertIn("if(hidden){",JS)
        self.assertIn("mf-home-resume-permanent-remove",JS)
        self.assertIn("await request('/resume/remove','POST'",JS)
        self.assertIn('[HttpPost("api/resume/remove")]',CTRL)
        self.assertIn('await _catalog.RemoveResumeForAuthenticatedUserAsync',CTRL)
    def test_remove_is_safe_and_user_scoped(self):
        self.assertIn('AuthenticatedUserAsync(caller, cancel)',SVC)
        self.assertIn('realId != resumeId',SVC)
        self.assertIn('catalogId == resumeId',SVC)
        self.assertIn('validParent',SVC)
        self.assertIn('"PlaybackPositionTicks"] = 0L',SVC)
        self.assertIn('"PlayCount"] =',SVC)
        self.assertIn('removed-resume.json',SVC)
        self.assertIn('removedAtUtc',SVC)
        self.assertNotIn('File.Delete(local.Path)',SVC)
    def test_admin_menu_page(self):
        self.assertIn('IHasWebPages',PLUGIN)
        self.assertIn('EnableInMainMenu = true',PLUGIN)
        self.assertIn('DisplayName = "MisioFlix"',PLUGIN)
        self.assertIn('Web.configPage.html',PLUGIN)
        self.assertIn('97d15b37-b868-492b-83da-eb67b16a0d44',PLUGIN)
    def test_evergreen_workflows_and_single_version_source(self):
        meta=json.loads((ROOT/'meta.json').read_text(encoding='utf8'))
        self.assertRegex(meta['version'],r'^\d+\.\d+\.\d+\.\d+$')
        version_tool=(ROOT/'tools/sync_version.py').read_text(encoding='utf8')
        self.assertIn("meta['version']",version_tool)
        self.assertIn('Assembly.GetName().Version',INJECT)
        self.assertNotIn('0.4.19',INJECT)
        for w in ('build','release'):
            workflow=(ROOT/f'.github/workflows/{w}.yml').read_text(encoding='utf8')
            self.assertIn('python3 tools/sync_version.py',workflow)
            self.assertIn("python3 tools/run_tests.py",workflow)
            self.assertIn("tools/run_tests.py",workflow)
            self.assertIn('steps.pack.outputs.archive',workflow)
            self.assertNotIn('test_layout_0419.py',workflow)
        self.assertIn('"tests" / "current"', (ROOT/'tools/run_tests.py').read_text(encoding='utf8'))

if __name__=='__main__':unittest.main()
