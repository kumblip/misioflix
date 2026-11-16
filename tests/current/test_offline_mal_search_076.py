"""Regression checks: authenticated, read-only and account-specific offline MAL."""
import pathlib
import re
import json
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[2]
SRC=ROOT/'src'/'Jellyfin.Plugin.MisioFlix'
ARCHIVE=(SRC/'Services/MisioFlixMalArchiveService.cs').read_text('utf8')
CTL=(SRC/'Controllers/MisioFlixController.cs').read_text('utf8')
HOME=(SRC/'Web/home.js').read_text('utf8')
CSS=(SRC/'Web/theme.css').read_text('utf8')
class OfflineMalSearch076(unittest.TestCase):
 def test_version(self):
  self.assertEqual(json.loads((ROOT/'meta.json').read_text())['version'],'0.4.76.0')
 def test_read_only_endpoint_and_authenticated_user(self):
  self.assertRegex(CTL,r'\[HttpGet\("api/mal/archive/watch-status"\)\]\s*\[Authorize\]')
  method=CTL.split('public async Task<IActionResult> MalArchiveWatchStatus',1)[1].split('[HttpGet("api/mal/archive/download")]',1)[0]
  self.assertIn('GetAuthenticatedUserIdAsync(Request',method)
  self.assertIn('_malArchive.ReadWatchStatuses(user)',method)
  self.assertIn('CacheControl = "private, no-store"',method)
  self.assertNotRegex(method,r'HttpPost|HttpPut|HttpPatch|HttpDelete|UpdateAsync|Write')
 def test_archive_user_and_account_partition(self):
  section=ARCHIVE.split('public ArchivedWatchStatuses? ReadWatchStatuses',1)[1].split('private static bool ValidKey',1)[0]
  for required in ('Normalize(userId)','LinkedMalAccountId(user)','Path.Combine(_root, user)',
                   'ids.Length != 1','FolderForAccount(user, accountId)',
                   'state.MalUserId != accountId','savedId != accountId',
                   'currentLinked != linkedId','"list_status"','"status"','"itemCount"'):
   self.assertIn(required,section)
  self.assertNotRegex(section,r'HttpMethod|_mal\.Update|File\.Write|File\.Move')
 def test_search_numbers_and_title_wrap(self):
  self.assertIn('slice(0,18)',HOME)
  self.assertIn("'/mal/archive/watch-status'",HOME)
  self.assertIn("source:'archive'",HOME)
  self.assertIn('obejrzane wg lokalnej kopii MAL',HOME)
  self.assertIn('white-space:normal!important;',CSS)
  self.assertIn('overflow-wrap:anywhere!important;',CSS)
  self.assertIn('text-overflow:clip!important;',CSS)
if __name__=='__main__':unittest.main()
