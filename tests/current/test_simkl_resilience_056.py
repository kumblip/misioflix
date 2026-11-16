"""v0.4.57 guardrails: Simkl movie/show-only versioned archive and offline queue.
Static contract tests complement, but do not replace, compiling C# and API tests.
"""
from pathlib import Path
import re
import unittest
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
STORE=(SRC/'Services/MisioFlixSimklLocalStore.cs').read_text('utf-8')
SVC=(SRC/'Services/MisioFlixSimklService.cs').read_text('utf-8')
API=(SRC/'Controllers/MisioFlixSimklController.cs').read_text('utf-8')
UI=(SRC/'Web/simkl.js').read_text('utf-8')
CSS=(SRC/'Web/simkl.css').read_text('utf-8')
class Resilience056(unittest.TestCase):
 def test_full_list_not_only_jellyfin(self):
  for term in ['"/sync/all-items/shows?extended=full&include_all_episodes=yes"','"/sync/all-items/movies"']:
   self.assertIn(term,SVC)
  self.assertIn('foreach(var kind in new[]{"shows","movies"})',SVC)
  self.assertNotIn('"/sync/all-items/anime"',SVC)
  self.assertIn('snapshot.Items.Where(kv=>kv.Value.Kind is "movies" or "shows")',STORE)
  self.assertIn('Kopia Simkl może obejmować tylko filmy i seriale — bez anime',STORE)
 def test_backups_are_per_user_versioned(self):
  for token in ['Guid.TryParse(user','_versionsPath','"daily"','"monthly"','MaxDailyBackups = 30','MaxMonthlyBackups = 12','SaveHistoryUnsafe(user,cancel)','RetainMostRecent']:
   self.assertIn(token,STORE)
  self.assertIn('File.Move(tmp,path,true)',STORE)
  self.assertIn('"restore"',STORE)
  self.assertIn('File.Copy(current,file,false)',STORE)
 def test_offline_manual_changes_commit_first(self):
  update=SVC.split('public async Task<SimklEntry?> UpdateAsync',1)[1].split('private async Task SendManualEditAsync',1)[0]
  self.assertIn('QueueManualEditAsync',update)
  self.assertLess(update.index('QueueManualEditAsync'),update.index('TryFlushPendingAsync'))
  season=SVC.split('public async Task UpdateSeasonAsync',1)[1].split('public async Task<SimklEntry?> UpdateAsync',1)[0]
  self.assertLess(season.index('ApplyManualHistoryAsync'),season.index('TryFlushPendingAsync'))
  self.assertIn('archive.PendingWatches.Add(update)',STORE)
  self.assertIn('archive.PendingEdits.Add(operation)',STORE)
 def test_queue_operation_ids_and_ambiguous_retry(self):
  for token in ['OperationId','Attempts','LastAttemptAt','LastError','PendingEdits','PendingWatches','CompleteWatchAsync(string user,string operationKey,string operationId','x.OperationId==operationId','IsManual']:
   self.assertIn(token,STORE)
  self.assertIn('SimklRateLimitException',SVC)
  self.assertIn('response.Headers.RetryAfter',SVC)
  self.assertIn('Math.Pow(2',SVC)
  self.assertIn('new PendingOperation(',SVC)
  self.assertIn('observed=Match(remote,new SimklMediaTarget',SVC)
  self.assertIn('if(edit.Attempts>0)',SVC)
  self.assertIn('wholeSeason:chosen is null',SVC)
 def test_backup_restore_is_only_user_archive(self):
  for token in ['[HttpGet("backup-status")]','[HttpPost("import")]','[HttpGet("export")]','await CurrentUser(cancel)','_local.ImportAsync(user,stream,cancel)','_simkl.DropSnapshotCache(user)']:
   self.assertIn(token,API)
  self.assertNotIn('SaveCredential(',STORE)
  self.assertIn('var recovered=await JsonSerializer.DeserializeAsync<Archive>',STORE)
 def test_ui_new_module_has_no_mal_modification(self):
  for token in ['mf-simkl-backup-status','backupSection()','request(\'/backup-status\')','form.append(\'file\'','fetch(API+\'/import\'','Zapisano lokalnie — oczekuje na Simkl']:
   self.assertIn(token,UI+CSS)
  self.assertNotIn('mf-mal-',UI)
  self.assertNotIn('.mf-mal-',re.sub(r'/\*.*?\*/','',CSS,flags=re.S))
 def test_versions(self):
  self.assertIn('"version": "0.4.89.0"',(ROOT/'meta.json').read_text('utf-8'))
  self.assertIn('<AssemblyVersion>0.4.89.0</AssemblyVersion>',(SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text('utf-8'))
if __name__=='__main__':unittest.main()
