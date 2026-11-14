"""Guardrails for the deliberately read-only MAL archive (independent of Simkl)."""
import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'src' / 'Jellyfin.Plugin.MisioFlix'
ARCHIVE = (SRC / 'Services' / 'MisioFlixMalArchiveService.cs').read_text('utf-8')
MAL = (SRC / 'Services' / 'MisioFlixMalService.cs').read_text('utf-8')
CONTROLLER = (SRC / 'Controllers' / 'MisioFlixController.cs').read_text('utf-8')
CLIENT = (SRC / 'Web' / 'mal.js').read_text('utf-8')
REGISTRATOR = (SRC / 'Services' / 'ScriptInjection.cs').read_text('utf-8')

class ReadOnlyArchive060(unittest.TestCase):
    def test_version(self):
        self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'], '0.4.60.0')
    def test_complete_unfiltered_paginated_list(self):
        self.assertIn('FetchFullArchiveAsync', MAL)
        self.assertIn('users/@me/animelist?fields={fields}', MAL)
        self.assertIn('num_times_rewatched,is_rewatching', MAL)
        self.assertIn('nsfw=true', MAL)
        self.assertIn('paging', MAL)
        self.assertIn('entries.TryAdd(id, item.Clone())', MAL)
        self.assertIn('throw new JsonException', MAL)
        self.assertNotIn('status=completed', MAL)
    def test_archive_cannot_write_to_mal(self):
        self.assertNotIn('HttpMethod.Patch', ARCHIVE)
        self.assertNotIn('HttpMethod.Post', ARCHIVE)
        self.assertNotIn('HttpMethod.Delete', ARCHIVE)
        self.assertNotIn('HttpMethod.Put', ARCHIVE)
        self.assertNotRegex(CONTROLLER, r'api/mal/archive/(?:import|restore|update|patch)')
        self.assertIn('"api/mal/update"', CONTROLLER)
        self.assertIn('new MalUpdate(input.Status', CONTROLLER)
        self.assertIn('_malArchive.CheckDue(user, force:true)', CONTROLLER)
    def test_per_user_per_account_files_and_atomic_write(self):
        self.assertIn('Normalize(user)', ARCHIVE)
        self.assertIn('_mal.LinkedMalAccountId(user)', ARCHIVE)
        self.assertIn('File.Move(tmp, path, true)', ARCHIVE)
        self.assertIn('FileGate(user)', ARCHIVE)
        self.assertIn('downloaded.MalUserId != connection.MalUserId', ARCHIVE)
    def test_periodic_backups_and_failure_retention(self):
        for literal in ['TimeSpan.FromHours(72)', 'TimeSpan.FromMinutes(15)', '"daily"', '"monthly"', 'Prune(Path.Combine(dir, "daily"), 30)', 'Prune(Path.Combine(dir, "monthly"), 12)']:
            self.assertIn(literal, ARCHIVE)
        self.assertLess(ARCHIVE.index('FetchFullArchiveAsync'), ARCHIVE.index('AtomicWriteAsync(Path.Combine(target, "current.json"), bytes'))
        self.assertIn('_rerun.TryRemove', ARCHIVE)
    def test_auth_only_backup_download(self):
        self.assertRegex(CONTROLLER, r'\[HttpGet\("api/mal/archive/download"\)\]\s*\[Authorize\]')
        self.assertRegex(CONTROLLER, r'\[HttpGet\("api/mal/archive/status"\)\]\s*\[Authorize\]')
        self.assertIn('GetAuthenticatedUserIdAsync(Request', CONTROLLER)
        self.assertIn('ValidKey(kind, key)', ARCHIVE)
    def test_download_not_import(self):
        self.assertIn("Pobierz wybraną kopię", CLIENT)
        self.assertIn("/archive/download?kind=", CLIENT)
        self.assertNotIn('Importuj', CLIENT)
        self.assertNotIn('Przywróć z kopii', CLIENT)
        self.assertIn('mal-archive.css', REGISTRATOR)
        self.assertIn('mf-mal-archive', (SRC/'Web'/'mal-archive.css').read_text('utf8'))
    def test_separate_simkl_untouched(self):
        import zipfile
        with zipfile.ZipFile(ROOT.parent/'MisioFlix_Native_v0.4.59_METADATA_SAFE_GitHub_PELNE.zip') as z:
            for name in ['src/Jellyfin.Plugin.MisioFlix/Web/simkl.js',
                         'src/Jellyfin.Plugin.MisioFlix/Web/simkl.css',
                         'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixSimklService.cs',
                         'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixSimklLocalStore.cs']:
                self.assertEqual((ROOT/name).read_bytes(), z.read(name))

if __name__ == '__main__':
    unittest.main()
