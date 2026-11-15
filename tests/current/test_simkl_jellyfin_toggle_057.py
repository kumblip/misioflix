"""Regression checks for Jellyfin's native watched checkmark and 80% threshold."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'src/Jellyfin.Plugin.MisioFlix'
PLAY=(BASE/'Services/MisioFlixSimklPlaybackHostedService.cs').read_text(encoding='utf-8')
SVC=(BASE/'Services/MisioFlixSimklService.cs').read_text(encoding='utf-8')
STORE=(BASE/'Services/MisioFlixSimklLocalStore.cs').read_text(encoding='utf-8')
WEB=(BASE/'Web/simkl.js').read_text(encoding='utf-8')

class JellyfinNativeWatched057(unittest.TestCase):
    def test_native_event_handler_only_explicit_manual_toggle(self):
        self.assertIn('IUserDataManager userData',PLAY)
        self.assertIn('_userData.UserDataSaved+=OnUserDataSaved;',PLAY)
        self.assertIn('_userData.UserDataSaved-=OnUserDataSaved;',PLAY)
        handler=PLAY.split('private void OnUserDataSaved',1)[1].split('private async Task DrainManualChangesAsync',1)[0]
        self.assertIn('e.SaveReason!=UserDataSaveReason.TogglePlayed',handler)
        self.assertIn('e.UserData.Played',handler)
        self.assertIn('Prepare(e.Item,requireRuntime:false)',handler)
        self.assertNotIn('PlaybackProgress',handler)

    def test_native_changes_are_queued_durably_before_network(self):
        block=SVC.split('public async Task RecordJellyfinToggleAsync',1)[1].split('private sealed record PendingOperation',1)[0]
        self.assertLess(block.index('QueueWatchAsync'),block.index('TryFlushPendingAsync'))
        self.assertIn('Watched=watched,IsManual=true',block)
        self.assertIn('Season=target.SeasonNumber,Episode=episode',block)
        self.assertIn('target.Ids.Count==0',block)
        self.assertIn('if(!target.Relevant',block)
        self.assertIn('archive.Snapshot??=new SnapshotData',STORE)
        self.assertIn('!operation.IsManual',STORE)
        self.assertIn('watch.Watched?"/sync/history":"/sync/history/remove"',SVC)

    def test_no_threshold_on_manual_check_and_ordered_updates(self):
        self.assertIn('SingleReader=true',PLAY)
        self.assertIn('_manualQueue.Writer.TryWrite',PLAY)
        self.assertIn('ReadAllAsync()',PLAY)
        self.assertNotIn('DateTimeOffset.UtcNow-state.LastActivity<TimeSpan.FromMinutes(10)',
            PLAY.split('private void OnUserDataSaved')[1].split('private async Task DrainManualChangesAsync')[0])
        self.assertIn('private const double Threshold=0.80;',PLAY)
        self.assertIn('state.MaxTicks>=(long)(Threshold*state.RuntimeTicks)',PLAY)
        self.assertIn('IsFollowingEpisode(state,next)',PLAY)

    def test_non_anime_independent_movie_and_episode_targets(self):
        self.assertIn('if(IsAnime(item,root))return null;',PLAY)
        self.assertIn('if(ids.Count==0)return null;',PLAY)
        self.assertIn('else if(item is Movie)root=item;',PLAY)
        self.assertIn('item is Movie?"movies":"shows"',PLAY)
        self.assertIn('if(e.SaveReason!=UserDataSaveReason.TogglePlayed',PLAY)
        self.assertIn('po 80%',WEB)
        self.assertNotIn('po 75%',WEB)

    def test_version(self):
        self.assertIn('0.4.66.0',(ROOT/'meta.json').read_text())
        self.assertIn('<AssemblyVersion>0.4.66.0</AssemblyVersion>',(BASE/'Jellyfin.Plugin.MisioFlix.csproj').read_text())

if __name__=='__main__': unittest.main()
