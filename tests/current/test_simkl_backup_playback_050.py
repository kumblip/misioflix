"""Contract and regression checks for 0.4.50. These do not compile C# or call Simkl."""
from pathlib import Path
import re
import unittest
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
UI=(SRC/'Web/simkl.js').read_text('utf8')
CSS=(SRC/'Web/simkl.css').read_text('utf8')
SERVICE=(SRC/'Services/MisioFlixSimklService.cs').read_text('utf8')
LOCAL=(SRC/'Services/MisioFlixSimklLocalStore.cs').read_text('utf8')
MON=(SRC/'Services/MisioFlixSimklPlaybackHostedService.cs').read_text('utf8')
CTL=(SRC/'Controllers/MisioFlixSimklController.cs').read_text('utf8')
REG=(SRC/'Services/ScriptInjection.cs').read_text('utf8')
class Simkl050(unittest.TestCase):
 def test_episode_one_dropdown_no_other_fields(self):
  part=UI.split('if(isEpisode){',1)[1].split('const rows=[',1)[0]
  self.assertIn("[['false','Nie obejrzany'],['true','Obejrzany']]",part)
  self.assertIn("request('/episode-history','POST'",part)
  for forbidden in ('Moja ocena','Ponowne obejrzenia','/rewatch','/update','/season-history','refresh.addEventListener'):
   self.assertNotIn(forbidden,part)
  self.assertRegex(part,r'\breturn;\s*}')
  self.assertIn('status.addEventListener(\'change\'',part)
 def test_no_manual_remote_refresh_button(self):
  self.assertNotIn('Odśwież z Simkl',UI)
  self.assertIn('maybeScheduledSync',UI)
  self.assertIn("request('/sync-check')",UI)
 def test_simkl_auto_playback_from_server(self):
  for token in ('ISessionManager','PlaybackStart+=Start','PlaybackProgress+=Progress','PlaybackStopped+=Stop',
    'Threshold=0.75','state.Submitted=true','_active[key]=state','RecordPlaybackWatchedAsync'):
   self.assertIn(token,MON)
  self.assertIn('services.AddHostedService<MisioFlixSimklPlaybackHostedService>();',REG)
  self.assertNotIn('window.video',MON)
 def test_stop_does_not_lower_75_percent_threshold(self):
  self.assertNotIn('state.RuntimeTicks*0.5',MON)
  self.assertIn('state.MaxTicks>=(long)(Threshold*state.RuntimeTicks)',MON)
  self.assertIn('!ep.ParentIndexNumber.HasValue',MON)
 def test_autoplay_episode_follows_same_series_and_real_watch(self):
  self.assertIn('previous.SeriesId==next.SeriesId',MON)
  self.assertIn('IsFollowingEpisode(state,next)',MON)
  self.assertIn('next.Episode==previous.Episode+1',MON)
  self.assertIn('next.Season==previous.Season+1&&next.Episode==1',MON)
  self.assertIn('state.MaxTicks>0',MON)
  self.assertNotIn('state.RuntimeTicks*0.05',MON)
  self.assertNotIn('TimeSpan.FromMinutes(1).Ticks',MON)
 def test_anime_and_missing_identifiers_never_upload(self):
  self.assertIn('IsAnime(item,root)',MON)
  self.assertIn('AnimeRoot',MON)
  self.assertIn('if(ids.Count==0)return null;',MON)
 def test_durable_account_scoped_archive(self):
  for value in ('Guid.TryParse(user','simkl","local-backup','File.Move(tmp,path,true)','File.SetUnixFileMode','JsonSerializer.Serialize','ExportAsync'):
   self.assertIn(value,LOCAL)
  self.assertNotIn('AccessToken',LOCAL)
  self.assertNotIn('RefreshToken',LOCAL)
 def test_backup_not_deleted_on_disconnect(self):
  block=SERVICE.split('public async Task DisconnectAsync',1)[1].split('private async Task<JsonDocument> ApiAsync',1)[0]
  self.assertNotIn('_local.',block)
  self.assertIn('File.Delete(PathFor(user))',block)
 def test_three_day_sync_and_offline_fallback(self):
  self.assertIn('TimeSpan.FromDays(3)',SERVICE)
  self.assertIn('FromArchive(stored.Snapshot)',SERVICE)
  self.assertIn('cache.IsOffline=true',SERVICE)
  self.assertIn('SaveSnapshotAsync(user,ToArchive',SERVICE)
  self.assertIn('SyncIfDueAsync',SERVICE)
  self.assertIn('[HttpGet("sync-check")]',CTL)
 def test_pending_queue_write_before_network(self):
  block=SERVICE.split('public async Task RecordPlaybackWatchedAsync',1)[1].split('private readonly ConcurrentDictionary',1)[0]
  self.assertLess(block.index('QueueWatchAsync'),block.index('TryFlushPendingAsync'))
  self.assertIn('archive.PendingWatches.RemoveAll',LOCAL)
  self.assertIn('/sync/history',SERVICE)
  self.assertIn('CompleteWatchAsync',SERVICE)
 def test_offline_movie_and_manual_override_pending_watch(self):
  self.assertIn('if(update.Kind=="movies")',LOCAL)
  self.assertIn('entry with {Status="completed"}',LOCAL)
  self.assertIn('archive.PendingWatches.RemoveAll(p=>p.Kind=="shows"',LOCAL)
  self.assertIn('DiscardPendingForTitleAsync',SERVICE)
 def test_rewatch_is_local_per_series_and_season(self):
  self.assertIn('RewatchKey(Guid catalogId,Guid? seasonId)',LOCAL)
  self.assertIn('SetRewatchAsync',LOCAL)
  self.assertIn('[HttpPost("rewatch")]',CTL)
  self.assertIn('rewatchEditor(editor)',UI)
  self.assertNotIn('Simkl',LOCAL.split('SetRewatchAsync',1)[1].split('QueueWatchAsync',1)[0])
 def test_export_route_and_in_app_download(self):
  self.assertIn('[HttpGet("export")]',CTL)
  self.assertIn('MisioFlix_Simkl_Backup_',CTL)
  self.assertIn('Eksportuj lokalną kopię Simkl (JSON)',UI)
  self.assertIn("fetch(API+'/export'",UI)
 def test_isolation_of_mal_and_base_skin(self):
  for name in ('mal.js','details.js','home.js','client.js'):
   self.assertTrue((SRC/'Web'/name).exists())
  self.assertNotIn('.mf-mal-',re.sub(r'/\*.*?\*/','',CSS,flags=re.S))
  self.assertNotIn('MisioFlixMalService',SERVICE)
  self.assertNotIn('mal.js',MON)
 def test_version(self):
  self.assertIn('0.4.55.0',(ROOT/'meta.json').read_text('utf8'))
  self.assertIn('0.4.55.0',(SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text('utf8'))
if __name__=='__main__':unittest.main()
