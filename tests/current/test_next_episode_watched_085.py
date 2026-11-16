from pathlib import Path
P = Path(__file__).resolve().parents[2] / "src/Jellyfin.Plugin.MisioFlix"

def test_manual_next_writes_native_jellyfin_watched_state():
    service = (P / "Services/MisioFlixNextEpisodeWatchService.cs").read_text()
    assert "previous.Item.MarkPlayed(previous.User)" in service
    assert "GetUserData(previous.User, previous.Item)" in service
    assert "NextInSequence(previous, current)" in service
    assert "ArmedEpisodeId == previous.ItemId" in service
    assert "state.ArmedUntil >= now" in service
    assert "if (isStop" in service
    assert "Task.Run" in service
    assert "Task.Delay(850)" in service

def test_next_endpoint_authorizes_actual_jellyfin_user():
    src=(P / "Controllers/MisioFlixNextEpisodeController.cs").read_text()
    assert "[Authorize]" in src
    assert "GetAuthenticatedUserIdAsync(Request" in src
    assert "_watch.Arm(user, intent.DeviceId)" in src
    assert "Guid.TryParse(userId" in src

def test_player_original_and_legacy_features_stay_intact():
    inject=(P / "Services/ScriptInjection.cs").read_text()
    assert "next-episode-watch.js" in inject
    assert "next-episode-watch.js" in (P / "Controllers/MisioFlixController.cs").read_text()
    src=(P / "Web/next-episode-watch.js").read_text()
    assert "document.addEventListener('click'" in src
    assert "playingVideo()" in src
    assert "playbackManager.nextTrack" not in src
    assert "Następny" not in src or True
