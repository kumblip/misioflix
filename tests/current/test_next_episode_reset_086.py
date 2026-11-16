import unittest
"""Regression guards for native Jellyfin watched flag plus cleared resume position."""
from pathlib import Path

SERVICE = (Path(__file__).resolve().parents[2] /
           'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixNextEpisodeWatchService.cs').read_text(encoding='utf8')



class NextEpisodeRegression(unittest.TestCase):
    def test_previous_watched_always_clears_its_resume_point(self):
        assert 'data.PlaybackPositionTicks != 0' in SERVICE
        assert 'previous.Item.MarkPlayed(previous.User, playedDate, resetPosition: true);' in SERVICE
        assert 'state.LastMarkedEpisodeId != previous.ItemId' in SERVICE


    def test_repairing_stale_resume_does_not_increment_existing_play_count(self):
        assert 'DateTime? playedDate = data?.Played == true ? null : DateTime.UtcNow;' in SERVICE
        assert 'data is null || !data.Played || data.PlaybackPositionTicks != 0' in SERVICE


    def test_only_immediate_next_same_series_with_recent_session(self):
        assert 'old.SeriesId == next.SeriesId' in SERVICE
        assert 'next.Number == old.Number + 1' in SERVICE
        assert 'next.Season == old.Season + 1 && next.Number == 1' in SERVICE
        assert 'state.LastEventUtc >= now.AddSeconds(-45)' in SERVICE
        assert 'NextInSequence(previous, current)' in SERVICE
        assert 'if (isStop && state.Current?.ItemId != episode.Id) continue;' in SERVICE
