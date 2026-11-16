using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Entities;
using User = Jellyfin.Database.Implementations.Entities.User;
using MediaBrowser.Controller.Entities.TV;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// Confirmed playback of the immediate next episode -> the previous episode
/// is marked watched in JELLYFIN, and its resume position is cleared.
/// Includes user NEXT and direct start of the next episode shortly after the
/// previous playback on the same device. Ordinary stop/seek alone never marks
/// watched. Jellyfin's normal 90% threshold is unchanged. No NFO/MAL writes.
/// </summary>
public sealed class MisioFlixNextEpisodeWatchService : IHostedService
{
    private sealed record ActiveEpisode(Episode Item, User User, DateTimeOffset SeenUtc)
    {
        public Guid ItemId => Item.Id;
        public Guid SeriesId => Item.SeriesId;
        public int Season => Item.ParentIndexNumber ?? -1;
        public int Number => Item.IndexNumber ?? -1;
    }

    private sealed class DeviceState
    {
        public string DeviceId = "";
        public ActiveEpisode? Current;
        public ActiveEpisode? Previous;
        public DateTimeOffset ChangedUtc;
        public DateTimeOffset LastEventUtc;
        public Guid ArmedEpisodeId;
        public DateTimeOffset ArmedUntil;
        public Guid LastMarkedEpisodeId;
    }

    private readonly ISessionManager _sessions;
    private readonly IUserDataManager _userData;
    private readonly ILogger<MisioFlixNextEpisodeWatchService> _log;
    private readonly object _gate = new();
    private readonly Dictionary<string, DeviceState> _states = new(StringComparer.OrdinalIgnoreCase);

    public MisioFlixNextEpisodeWatchService(ISessionManager sessions, IUserDataManager userData,
        ILogger<MisioFlixNextEpisodeWatchService> log)
    { _sessions = sessions; _userData = userData; _log = log; }

    private static string Key(Guid userId, string deviceId) =>
        userId.ToString("N") + ":" + deviceId.Trim().ToLowerInvariant();

    private static string Device(PlaybackProgressEventArgs e) =>
        !string.IsNullOrWhiteSpace(e.DeviceId) ? e.DeviceId : e.Session?.Id ?? "unknown";

    private static bool NextInSequence(ActiveEpisode old, ActiveEpisode next) =>
        old.ItemId != next.ItemId && old.SeriesId != Guid.Empty && old.SeriesId == next.SeriesId &&
        ((next.Season == old.Season && next.Number == old.Number + 1) ||
         (next.Season == old.Season + 1 && next.Number == 1));

    private void QueueMark(ActiveEpisode previous)
    {
        // Schedule only after the player's transition is confirmed. Never delay the
        // Jellyfin playback event handler, and never alter PlaybackPositionTicks for
        // the episode the user has just started watching.
        _ = Task.Run(async () =>
        {
            try
            {
                // Jellyfin may report Stopped for the previous episode AFTER
                // PlaybackStart for the next one. Let that native save complete
                // before setting the final watched flag (~one second).
                await Task.Delay(850).ConfigureAwait(false);
                var data = _userData.GetUserData(previous.User, previous.Item);
                // A watched episode must never retain a resume point. If Jellyfin
                // already marked it watched, clear any remaining resume position
                // without incrementing its PlayCount or overwriting LastPlayedDate.
                if (data is null || !data.Played || data.PlaybackPositionTicks != 0)
                {
                    DateTime? playedDate = data?.Played == true ? null : DateTime.UtcNow;
                    previous.Item.MarkPlayed(previous.User, playedDate, resetPosition: true);
                    _log.LogInformation("MisioFlix: marked previous episode {Id} watched and cleared resume position for user {User}",
                        previous.ItemId, previous.User.Id);
                }
            }
            catch (Exception ex) { _log.LogWarning(ex, "MisioFlix: native Jellyfin next-episode watch mark failed"); }
        });
    }

    /// <summary>
    /// Called only on a genuine NEXT button/key press from the web player.
    /// Device identity is an optional hint; user identity comes solely from
    /// Jellyfin's validated authorization token on the HTTP endpoint.
    /// </summary>
    public bool Arm(Guid userId, string? deviceHint)
    {
        var now = DateTimeOffset.UtcNow;
        ActiveEpisode? mark = null;
        lock (_gate)
        {
            var candidates = _states.Where(p => p.Key.StartsWith(userId.ToString("N") + ":", StringComparison.OrdinalIgnoreCase) &&
                p.Value.Current is not null && p.Value.LastEventUtc >= now.AddMinutes(-2))
                .Select(p => p.Value).ToArray();
            if (candidates.Length == 0) return false;
            DeviceState? state = null;
            if (!string.IsNullOrWhiteSpace(deviceHint))
                state = candidates.FirstOrDefault(s => s.DeviceId.Equals(deviceHint, StringComparison.OrdinalIgnoreCase));
            // Fallback is safe only when this user has exactly one active playback device.
            if (state is null && candidates.Length == 1) state = candidates[0];
            if (state?.Current is null) return false;

            // The click's HTTP request can arrive slightly AFTER PlaybackStart
            // for the new episode. Confirm a very recent consecutive transition.
            if (state.Previous is not null &&
                state.ChangedUtc >= now.AddSeconds(-8) &&
                NextInSequence(state.Previous, state.Current) &&
                state.LastMarkedEpisodeId != state.Previous.ItemId)
            {
                mark = state.Previous;
                state.LastMarkedEpisodeId = mark.ItemId;
                state.ArmedEpisodeId = Guid.Empty;
            }
            else
            {
                // Otherwise wait for the matching new episode to actually start;
                // a failed click or a navigation away will not mark anything.
                state.ArmedEpisodeId = state.Current.ItemId;
                state.ArmedUntil = now.AddSeconds(15);
            }
        }
        if (mark is not null) QueueMark(mark);
        return true;
    }

    /// <summary>
    /// Read-only playback navigation lookup. Uses the same authenticated Jellyfin
    /// user and optional browser device identifier as the NEXT tracking service.
    /// Never changes watched status, resume position or any playback event.
    /// Returns nothing for ambiguous or stale device sessions.
    /// </summary>
    public Guid? CurrentEpisodeId(Guid userId, string? deviceHint)
    {
        var now = DateTimeOffset.UtcNow;
        lock (_gate)
        {
            var candidates = _states.Where(p =>
                p.Key.StartsWith(userId.ToString("N") + ":", StringComparison.OrdinalIgnoreCase) &&
                p.Value.Current is not null &&
                p.Value.LastEventUtc >= now.AddMinutes(-15))
                .Select(p => p.Value).ToArray();
            if (candidates.Length == 0) return null;
            if (!string.IsNullOrWhiteSpace(deviceHint))
            {
                var matched = candidates.Where(s => s.DeviceId.Equals(deviceHint, StringComparison.OrdinalIgnoreCase)).ToArray();
                if (matched.Length == 1) return matched[0].Current!.ItemId;
                // No cross-device fallback when multiple sessions are active.
                if (matched.Length > 1 || candidates.Length > 1) return null;
            }
            return candidates.Length == 1 ? candidates[0].Current!.ItemId : null;
        }
    }

    private void Record(PlaybackProgressEventArgs e, bool isStart, bool isStop)
    {
        if (e.Item is not Episode episode || e.Users is null || e.Users.Count == 0 ||
            episode.Id == Guid.Empty || episode.SeriesId == Guid.Empty) return;
        if (!episode.ParentIndexNumber.HasValue || !episode.IndexNumber.HasValue) return;
        var now = DateTimeOffset.UtcNow;
        foreach (var user in e.Users)
        {
            if (user.Id == Guid.Empty) continue;
            ActiveEpisode? mark = null;
            lock (_gate)
            {
                var device = Device(e);
                var key = Key(user.Id, device);
                if (!_states.TryGetValue(key, out var state))
                    _states[key] = state = new DeviceState { DeviceId = device };
                if (isStop && state.Current?.ItemId != episode.Id) continue;
                if (!isStart && !isStop && state.Current?.ItemId != episode.Id && state.Current is not null)
                    continue; // Late progress from previous episode cannot revert the active item.

                if (isStart && state.Current?.ItemId != episode.Id)
                {
                    var previous = state.Current;
                    var current = new ActiveEpisode(episode, user, now);
                    state.Previous = previous;
                    state.Current = current;
                    state.ChangedUtc = now;
                    // User may click NEXT in the player or open the immediate next
                    // episode directly. A recent playback/stop on this same device,
                    // for the same Jellyfin user and series, qualifies; old sessions,
                    // skips over episodes and unrelated navigation do not.
                    var explicitNext = state.ArmedEpisodeId == previous?.ItemId && state.ArmedUntil >= now;
                    var recentNext = state.LastEventUtc >= now.AddSeconds(-45);
                    if (previous is not null &&
                        (explicitNext || recentNext) && NextInSequence(previous, current) &&
                        state.LastMarkedEpisodeId != previous.ItemId)
                    {
                        mark = previous;
                        state.LastMarkedEpisodeId = previous.ItemId;
                    }
                    state.ArmedEpisodeId = Guid.Empty;
                }
                else if (state.Current is null)
                {
                    state.Current = new ActiveEpisode(episode, user, now);
                }
                state.LastEventUtc = now;
                if (_states.Count > 400)
                    foreach (var stale in _states.Where(p => p.Value.LastEventUtc < now.AddHours(-2))
                        .Select(p => p.Key).ToArray()) _states.Remove(stale);
            }
            if (mark is not null) QueueMark(mark);
        }
    }

    private void OnStart(object? sender, PlaybackProgressEventArgs e) => SafeRecord(e, true, false);
    private void OnProgress(object? sender, PlaybackProgressEventArgs e) => SafeRecord(e, false, false);
    private void OnStop(object? sender, PlaybackStopEventArgs e) => SafeRecord(e, false, true);
    private void SafeRecord(PlaybackProgressEventArgs e, bool start, bool stop)
    {
        try { Record(e, start, stop); }
        catch (Exception ex) { _log.LogWarning(ex, "MisioFlix: next episode tracker failed"); }
    }

    public Task StartAsync(CancellationToken token)
    {
        _sessions.PlaybackStart += OnStart;
        _sessions.PlaybackProgress += OnProgress;
        _sessions.PlaybackStopped += OnStop;
        return Task.CompletedTask;
    }
    public Task StopAsync(CancellationToken token)
    {
        _sessions.PlaybackStart -= OnStart;
        _sessions.PlaybackProgress -= OnProgress;
        _sessions.PlaybackStopped -= OnStop;
        lock (_gate) _states.Clear();
        return Task.CompletedTask;
    }
}
