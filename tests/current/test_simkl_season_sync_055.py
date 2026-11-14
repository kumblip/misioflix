"""v0.4.55: isolated season-history frames, transition and 72h checks."""
from pathlib import Path
import re
import unittest
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
WEB=(SRC/'Web/simkl.js').read_text(encoding='utf8')
CTRL=(SRC/'Controllers/MisioFlixSimklController.cs').read_text(encoding='utf8')
PLAY=(SRC/'Services/MisioFlixSimklPlaybackHostedService.cs').read_text(encoding='utf8')
SERVICE=(SRC/'Services/MisioFlixSimklService.cs').read_text(encoding='utf8')
CAT=(SRC/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf8')
LOCAL=(SRC/'Services/MisioFlixSimklLocalStore.cs').read_text(encoding='utf8')

class Simkl055(unittest.TestCase):
 def test_authorized_batched_local_season_history(self):
  section=CTRL.split('[HttpGet("season-progress")]')[1].split('[HttpGet("connection")]')[0]
  self.assertIn('AuthorizedSimklCardTargetsAsync(Request,ids,cancel)',section)
  self.assertIn('_local.ReadAsync(user,cancel)',section)
  self.assertNotIn('ApiAsync(',section)
  self.assertIn('entry.WatchedSeasons',section)
  self.assertIn('snapshot?.HasEpisodeDetails==true',section)
  self.assertIn('if(target.Value.Kind!="shows")continue;',section)
  self.assertIn('MakeSimklTarget',CAT)
 def test_freshness_at_navigation(self):
  self.assertIn('maybeScheduledSync();',WEB)
  self.assertIn("const id=currentUser,route=location.hash",WEB)
  self.assertIn("request('/sync-check')",WEB)
  self.assertIn('data?.refreshed',WEB)
  self.assertIn('resetCardScores()',WEB)
  self.assertIn('session.phase=\'idle\';void read(session,true);',WEB)
  self.assertIn('DateTimeOffset.UtcNow-CacheLifetime',SERVICE)
  self.assertIn('TimeSpan.FromDays(3)',SERVICE)
  self.assertIn('SyncLock(user).WaitAsync',SERVICE)
  self.assertIn('!before.HasValue||after.Value>before.Value',CTRL)
 def test_no_mal_or_watchlist_overwrite(self):
  self.assertIn('pending',LOCAL.lower())
  self.assertIn('ApplyToSnapshot',LOCAL)
  self.assertIn('if(selected!==currentUser||stamp!==seasonProgressStamp)return;',WEB)
  self.assertNotIn('mf-mal-',WEB)
 def test_playback_next_with_seconds_and_75_percent(self):
  self.assertIn('Threshold=0.75',PLAY)
  self.assertIn('IsFollowingEpisode(state,next)',PLAY)
  self.assertIn('state.MaxTicks>0',PLAY)
  self.assertIn('!isStop',PLAY)
  self.assertIn('next.Episode==previous.Episode+1',PLAY)
  self.assertIn('next.Season==previous.Season+1&&next.Episode==1',PLAY)
  self.assertNotIn('state.MaxTicks>=TimeSpan.FromMinutes(1).Ticks',PLAY)
  self.assertNotIn('state.RuntimeTicks*0.05',PLAY)
 def test_locally_known_season_counts_override_jellyfin(self):
  chunk=WEB.split('function decorateSeasonFrames()')[1].split('function clearEpisodeFrames()')[0]
  self.assertIn('history?.known===true',chunk)
  self.assertIn("watched>=total",chunk)
  self.assertIn("resuming?'mixed':'watched'",chunk)
  self.assertIn("resuming||watched>0?'started':'unwatched'",chunk)
  self.assertIn('simklFrame(null,fallback,resuming)',chunk)

if __name__=='__main__': unittest.main()
