using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net.Http;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// Read-only, independently persisted MAL archive. This service never calls an
/// MAL write endpoint, and there is deliberately NO archive import endpoint.
/// Only the existing explicit /api/mal/update editor may change MAL.
/// </summary>
public sealed class MisioFlixMalArchiveService
{
    private static readonly TimeSpan DueInterval = TimeSpan.FromHours(72);
    private static readonly TimeSpan RetryInterval = TimeSpan.FromMinutes(15);
    private readonly string _root;
    private readonly MisioFlixMalService _mal;
    private readonly ILogger<MisioFlixMalArchiveService> _logger;
    private readonly ConcurrentDictionary<string, byte> _running = new();
    private readonly ConcurrentDictionary<string, byte> _rerun = new();
    private readonly ConcurrentDictionary<string, DateTimeOffset> _attempts = new();
    private readonly ConcurrentDictionary<string, string> _errors = new();
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> FileGates = new();

    private sealed record ArchiveState(DateTimeOffset LastSuccessUtc, int Count, int MalUserId, string MalUsername);
    public sealed record ArchiveFile(string Kind, string Key, string Filename);
    public sealed record ArchiveInfo(bool Connected, string? LastSuccessUtc, int Items,
        int DailyCopies, int MonthlyCopies, string? LastError, ArchiveFile[] Files);

    public MisioFlixMalArchiveService(IApplicationPaths paths, MisioFlixMalService mal,
        ILogger<MisioFlixMalArchiveService> logger)
    {
        _root = Path.Combine(paths.DataPath, "misioflix", "mal", "archive");
        _mal = mal;
        _logger = logger;
    }

    private static string Normalize(string value) => Guid.TryParse(value, out var id)
        ? id.ToString("N") : throw new UnauthorizedAccessException("Nieprawidłowy użytkownik Jellyfin");
    // A newly connected MAL identity never sees the previous account's archive.
    private string Folder(string user) => FolderForAccount(user, _mal.LinkedMalAccountId(user));
    private string FolderForAccount(string user, int malAccountId) => Path.Combine(_root, Normalize(user),
        malAccountId.ToString(CultureInfo.InvariantCulture));
    private string Current(string user) => Path.Combine(Folder(user), "current.json");
    private string StatePath(string user) => Path.Combine(Folder(user), "state.json");
    private static SemaphoreSlim FileGate(string user) => FileGates.GetOrAdd(user, _ => new SemaphoreSlim(1, 1));

    private static void EnsurePrivateDirectory(string folder)
    {
        Directory.CreateDirectory(folder);
        if (OperatingSystem.IsLinux())
            new DirectoryInfo(folder).UnixFileMode =
                UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute;
    }

    private static async Task AtomicWriteAsync(string path, byte[] bytes, CancellationToken ct)
    {
        EnsurePrivateDirectory(Path.GetDirectoryName(path)!);
        var tmp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await File.WriteAllBytesAsync(tmp, bytes, ct).ConfigureAwait(false);
            if (OperatingSystem.IsLinux())
                File.SetUnixFileMode(tmp, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            File.Move(tmp, path, true);
        }
        finally { if (File.Exists(tmp)) File.Delete(tmp); }
    }

    private ArchiveState? ReadState(string user)
    {
        var path = StatePath(user);
        if (!File.Exists(path) || !File.Exists(Current(user))) return null;
        try { return JsonSerializer.Deserialize<ArchiveState>(File.ReadAllText(path)); }
        catch (JsonException) { return null; }
        catch (IOException) { return null; }
    }

    private static void CopyOnce(string source, string path)
    {
        if (File.Exists(path)) return;
        EnsurePrivateDirectory(Path.GetDirectoryName(path)!);
        try { File.Copy(source, path, overwrite: false); }
        catch (IOException) when (File.Exists(path)) { /* another request saved the same day */ }
    }

    private static void ReplaceDailySnapshot(string source, string path)
    {
        // A full successful refresh supersedes an earlier same-day copy of old data.
        // Update atomically; older daily/monthly versions are never overwritten.
        EnsurePrivateDirectory(Path.GetDirectoryName(path)!);
        var temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            File.Copy(source, temp, overwrite: false);
            if (OperatingSystem.IsLinux())
                File.SetUnixFileMode(temp, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            File.Move(temp, path, true);
        }
        finally { if (File.Exists(temp)) File.Delete(temp); }
    }

    private static void Prune(string path, int retain)
    {
        if (!Directory.Exists(path)) return;
        foreach (var entry in Directory.EnumerateFiles(path, "*.json")
            .OrderByDescending(Path.GetFileName, StringComparer.Ordinal).Skip(retain))
            File.Delete(entry);
    }

    private void MaintainCopies(string user, int? accountId = null, bool justRefreshed = false)
    {
        var dir = accountId.HasValue ? FolderForAccount(user, accountId.Value) : Folder(user);
        var source = Path.Combine(dir, "current.json");
        if (!File.Exists(source)) return;
        var now = DateTimeOffset.UtcNow;
        var daily = Path.Combine(dir, "daily", now.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) + ".json");
        var monthly = Path.Combine(dir, "monthly", now.ToString("yyyy-MM", CultureInfo.InvariantCulture) + ".json");
        if (justRefreshed)
        {
            ReplaceDailySnapshot(source, daily);
            ReplaceDailySnapshot(source, monthly);
        }
        else
        {
            CopyOnce(source, daily);
            CopyOnce(source, monthly);
        }
        Prune(Path.Combine(dir, "daily"), 30);
        Prune(Path.Combine(dir, "monthly"), 12);
    }

    /// <summary>Schedule a nonblocking refresh on first activity or when 72 hours passed.
    /// Only one sync per user; errors never delete the previous snapshot.</summary>
    public void CheckDue(string userId, bool force = false)
    {
        var user = Normalize(userId);
        if (!_mal.Connected(user)) return;
        var now = DateTimeOffset.UtcNow;
        // Make the daily copy even while MAL is temporarily unavailable.
        try { MaintainCopies(user); }
        catch (IOException) { /* retry on next activation */ }
        if (!force)
        {
            var old = ReadState(user);
            if (old is not null && now - old.LastSuccessUtc < DueInterval)
                return;
            if (_attempts.TryGetValue(user, out var last) && now - last < RetryInterval) return;
        }
        if (!_running.TryAdd(user, 0))
        {
            // A manual MAL edit committed during a full GET must be backed up AGAIN.
            if (force) _rerun[user] = 0;
            return;
        }
        _attempts[user] = now;
        _ = Task.Run(async () =>
        {
            try
            {
                do
                {
                    try { await RefreshAsync(user, CancellationToken.None).ConfigureAwait(false); }
                    catch (Exception ex)
                    {
                        _errors[user] = ex switch
                        {
                            UnauthorizedAccessException => "Konto MAL wymaga ponownego połączenia",
                            HttpRequestException => "MAL niedostępny — pozostawiono poprzednią kopię",
                            _ => "Nie udało się wykonać pełnego backupu MAL"
                        };
                        _logger.LogWarning("MisioFlix MAL archive refresh failed ({ErrorType})", ex.GetType().Name);
                    }
                }
                while (_rerun.TryRemove(user, out _));
            }
            finally
            {
                _running.TryRemove(user, out _);
                // Close the tiny completion race: a manual edit could have queued
                // another refresh after the loop ended but before we removed _running.
                if (_rerun.TryRemove(user, out _)) CheckDue(user, force:true);
            }
        });
    }

    public async Task RefreshAsync(string userId, CancellationToken cancel)
    {
        var user = Normalize(userId);
        if (!_mal.Connected(user)) return;
        // Migrate older token records to a confirmed MAL identity if necessary.
        var connection = await _mal.GetConnectionAsync(user, cancel, refreshProfile:false)
            .ConfigureAwait(false);
        if (!connection.Connected || connection.MalUserId is not > 0) return;
        // Complete pagination must finish BEFORE the current archive is replaced.
        var downloaded = await _mal.FetchFullArchiveAsync(user, cancel).ConfigureAwait(false);
        if (downloaded.MalUserId != connection.MalUserId ||
            _mal.LinkedMalAccountId(user) != downloaded.MalUserId)
            throw new InvalidOperationException("Zmieniono konto MAL podczas backupu; zachowano starą kopię");
        var now = DateTimeOffset.UtcNow;
        var snapshot = new
        {
            schemaVersion = 1,
            source = "MyAnimeList",
            readOnly = true,
            exportedAtUtc = now.ToString("O", CultureInfo.InvariantCulture),
            account = new { malUserId = downloaded.MalUserId, username = downloaded.Username },
            itemCount = downloaded.Entries.Count,
            entries = downloaded.Entries
        };
        var bytes = JsonSerializer.SerializeToUtf8Bytes(snapshot, new JsonSerializerOptions { WriteIndented = true });
        var gate = FileGate(user);
        await gate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            // Capture the MAL identity in the target path; even if the Jellyfin user
            // relinks mid-write, the old account's files cannot enter the new folder.
            var target = FolderForAccount(user, downloaded.MalUserId);
            await AtomicWriteAsync(Path.Combine(target, "current.json"), bytes, cancel).ConfigureAwait(false);
            var state = new ArchiveState(now, downloaded.Entries.Count, downloaded.MalUserId, downloaded.Username);
            await AtomicWriteAsync(Path.Combine(target, "state.json"),
                JsonSerializer.SerializeToUtf8Bytes(state), cancel).ConfigureAwait(false);
            MaintainCopies(user, downloaded.MalUserId, justRefreshed:true);
            _errors.TryRemove(user, out _);
        }
        finally { gate.Release(); }
    }

    public ArchiveInfo GetInfo(string userId)
    {
        var user = Normalize(userId);
        CheckDue(user);
        var dir = Folder(user);
        var state = ReadState(user);
        var files = new List<ArchiveFile>();
        if (state is not null) files.Add(new ArchiveFile("current", "current", "Bieżąca kopia MAL"));
        foreach (var kind in new[] { "daily", "monthly" })
        {
            var folder = Path.Combine(dir, kind);
            if (!Directory.Exists(folder)) continue;
            foreach (var path in Directory.EnumerateFiles(folder, "*.json")
                .OrderByDescending(Path.GetFileName, StringComparer.Ordinal))
            {
                var key = Path.GetFileNameWithoutExtension(path);
                if (ValidKey(kind, key)) files.Add(new ArchiveFile(kind, key,
                    (kind == "daily" ? "Dzienna " : "Miesięczna ") + key));
            }
        }
        return new ArchiveInfo(_mal.Connected(user),
            state?.LastSuccessUtc.ToString("O", CultureInfo.InvariantCulture), state?.Count ?? 0,
            files.Count(f => f.Kind == "daily"), files.Count(f => f.Kind == "monthly"),
            _errors.TryGetValue(user, out var error) ? error : null, files.ToArray());
    }

    private static bool ValidKey(string kind, string key) => kind switch
    {
        "current" => key == "current",
        "daily" => DateTime.TryParseExact(key, "yyyy-MM-dd", CultureInfo.InvariantCulture,
            DateTimeStyles.None, out _),
        "monthly" => DateTime.TryParseExact(key, "yyyy-MM", CultureInfo.InvariantCulture,
            DateTimeStyles.None, out _),
        _ => false
    };

    public async Task<(byte[] Content, string Name)?> DownloadAsync(string userId, string kind,
        string key, CancellationToken cancel)
    {
        var user = Normalize(userId);
        if (string.IsNullOrWhiteSpace(kind) || string.IsNullOrWhiteSpace(key) || !ValidKey(kind, key))
            return null;
        var path = kind == "current" ? Current(user) : Path.Combine(Folder(user), kind, key + ".json");
        if (!File.Exists(path)) return null;
        return (await File.ReadAllBytesAsync(path, cancel).ConfigureAwait(false),
            "misioflix-mal-" + kind + "-" + key + ".json");
    }
}
