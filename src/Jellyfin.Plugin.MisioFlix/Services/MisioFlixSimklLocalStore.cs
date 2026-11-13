using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Configuration;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// Per-Jellyfin-user offline Simkl archive. Lives independently of credentials.
/// The archive is never deleted by disconnect and is safe to export as JSON.
/// Atomic file replacement and a per-user lock protect simultaneous playback events.
/// </summary>
public sealed class MisioFlixSimklLocalStore
{
    public sealed class SnapshotData
    {
        public string Activity { get; set; } = "";
        public DateTimeOffset CheckedAt { get; set; }
        public bool HasEpisodeDetails { get; set; }
        public Dictionary<string, MisioFlixSimklService.SimklEntry> Items { get; set; } = new(StringComparer.Ordinal);
    }
    public sealed class PendingWatch
    {
        public string Key { get; set; } = "";
        public string Kind { get; set; } = "";
        public Dictionary<string,string> Ids { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public int? Season { get; set; }
        public int? Episode { get; set; }
        public bool Watched { get; set; } = true;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
    public sealed class Archive
    {
        public int FormatVersion { get; set; } = 1;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
        public SnapshotData? Snapshot { get; set; }
        public Dictionary<string,int> Rewatches { get; set; } = new(StringComparer.Ordinal);
        public List<PendingWatch> PendingWatches { get; set; } = new();
    }
    private readonly string _path;
    private readonly ConcurrentDictionary<string,SemaphoreSlim> _locks = new();
    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true };

    public MisioFlixSimklLocalStore(IApplicationPaths paths)
    {
        _path=Path.Combine(paths.DataPath,"misioflix","simkl","local-backup");
        Directory.CreateDirectory(_path);
    }
    private string FileName(string user)
    {
        if(!Guid.TryParse(user,out var id))throw new UnauthorizedAccessException("Nieznany użytkownik Jellyfin");
        return Path.Combine(_path,id.ToString("N")+".json");
    }
    private SemaphoreSlim Lock(string user)=>_locks.GetOrAdd(user,_=>new SemaphoreSlim(1,1));
    private async Task<Archive> ReadUnsafe(string user,CancellationToken cancel)
    {
        var path=FileName(user);
        if(!File.Exists(path))return new Archive();
        try
        {
            var json=await File.ReadAllTextAsync(path,cancel).ConfigureAwait(false);
            return JsonSerializer.Deserialize<Archive>(json)??new Archive();
        }
        catch(JsonException ex){throw new InvalidOperationException("Lokalny backup Simkl jest uszkodzony — zachowano go bez nadpisania.",ex);}
    }
    private async Task WriteUnsafe(string user,Archive value,CancellationToken cancel)
    {
        value.UpdatedAt=DateTimeOffset.UtcNow;
        var path=FileName(user);var tmp=path+"."+Guid.NewGuid().ToString("N")+".tmp";
        try
        {
            await File.WriteAllTextAsync(tmp,JsonSerializer.Serialize(value,Json),cancel).ConfigureAwait(false);
            if(OperatingSystem.IsLinux()||OperatingSystem.IsMacOS())
            {
                try{File.SetUnixFileMode(tmp,UnixFileMode.UserRead|UnixFileMode.UserWrite);}catch(UnauthorizedAccessException){}
            }
            File.Move(tmp,path,true);
        }
        finally{if(File.Exists(tmp))File.Delete(tmp);}
    }
    public async Task<Archive> ReadAsync(string user,CancellationToken cancel)
    {
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try{return await ReadUnsafe(user,cancel).ConfigureAwait(false);}
        finally{Lock(user).Release();}
    }
    public async Task SaveSnapshotAsync(string user,SnapshotData snapshot,CancellationToken cancel)
    {
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var archive=await ReadUnsafe(user,cancel).ConfigureAwait(false);
            archive.Snapshot=snapshot;
            // Do not discard unconfirmed offline playback events if remote data was stale.
            foreach(var pending in archive.PendingWatches)ApplyToSnapshot(archive.Snapshot,pending);
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
    }
    private static void ApplyToSnapshot(SnapshotData? snapshot,PendingWatch update)
    {
        if(snapshot is null)return;
        var entry=snapshot.Items.Values.FirstOrDefault(item=>item.Kind==update.Kind&&
            update.Ids.Any(pair=>item.Ids.TryGetValue(pair.Key,out var id)&&
                string.Equals(id,pair.Value,StringComparison.OrdinalIgnoreCase)));
        if(entry is null)return;
        if(update.Kind=="movies")
        {
            // A confirmed local playback threshold is a completed movie, even when
            // Simkl is temporarily offline and the network outbox has not drained.
            if(update.Watched)
                foreach(var key in snapshot.Items.Where(p=>ReferenceEquals(p.Value,entry)).Select(p=>p.Key).ToArray())
                    snapshot.Items[key]=entry with {Status="completed"};
            return;
        }
        if(update.Kind!="shows"||!update.Season.HasValue||!update.Episode.HasValue)return;
        var map=entry.WatchedSeasons is null
            ? new Dictionary<int,List<int>>() : entry.WatchedSeasons.ToDictionary(x=>x.Key,x=>x.Value.ToList());
        if(!map.TryGetValue(update.Season.Value,out var watched))map[update.Season.Value]=watched=new List<int>();
        if(update.Watched && !watched.Contains(update.Episode.Value))watched.Add(update.Episode.Value);
        if(!update.Watched)watched.Remove(update.Episode.Value);
        var count=map.Values.Sum(x=>x.Count);
        foreach(var key in snapshot.Items.Where(p=>ReferenceEquals(p.Value,entry)).Select(p=>p.Key).ToArray())
            snapshot.Items[key]=entry with {WatchedSeasons=map,WatchedEpisodes=count};
    }
    public static string RewatchKey(Guid catalogId,Guid? seasonId)=>
        (catalogId.ToString("N")+(seasonId.HasValue?":s"+seasonId.Value.ToString("N"):""));
    public async Task<int> GetRewatchAsync(string user,Guid catalogId,Guid? seasonId,CancellationToken cancel)
    {
        var archive=await ReadAsync(user,cancel).ConfigureAwait(false);
        return archive.Rewatches.TryGetValue(RewatchKey(catalogId,seasonId),out var count)?count:0;
    }
    public async Task<int> SetRewatchAsync(string user,Guid catalogId,Guid? seasonId,int count,CancellationToken cancel)
    {
        if(count<0||count>100000)throw new ArgumentException("Ponowne obejrzenia: wybierz liczbę od 0 do 100000.");
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var archive=await ReadUnsafe(user,cancel).ConfigureAwait(false);
            archive.Rewatches[RewatchKey(catalogId,seasonId)]=count;
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
            return count;
        }
        finally{Lock(user).Release();}
    }
    public async Task QueueWatchAsync(string user,PendingWatch operation,CancellationToken cancel)
    {
        if(operation.Ids.Count==0)throw new ArgumentException("Brak identyfikatora Simkl");
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var archive=await ReadUnsafe(user,cancel).ConfigureAwait(false);
            // The most recent intent wins. Repeated progress notifications do not grow the queue.
            archive.PendingWatches.RemoveAll(item=>item.Key==operation.Key);
            archive.PendingWatches.Add(operation);
            ApplyToSnapshot(archive.Snapshot,operation);
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
    }
    public async Task CompleteWatchAsync(string user,string operationKey,CancellationToken cancel)
    {
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var archive=await ReadUnsafe(user,cancel).ConfigureAwait(false);
            archive.PendingWatches.RemoveAll(x=>x.Key==operationKey);
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
    }
    public async Task ApplyManualHistoryAsync(string user,SimklMediaTarget target,
        IEnumerable<int> episodeNumbers,bool watched,CancellationToken cancel)
    {
        if(!target.SeasonNumber.HasValue)return;
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var archive=await ReadUnsafe(user,cancel).ConfigureAwait(false);
            var selected=episodeNumbers.ToHashSet();
            // A manual decision wins over earlier automatic watches queued during
            // a Simkl outage. Otherwise a delayed retry could undo "Nie obejrzany".
            archive.PendingWatches.RemoveAll(p=>p.Kind=="shows"&&
                p.Season==target.SeasonNumber&&p.Episode.HasValue&&selected.Contains(p.Episode.Value)&&
                p.Ids.Any(kv=>target.Ids.TryGetValue(kv.Key,out var id)&&
                    string.Equals(id,kv.Value,StringComparison.OrdinalIgnoreCase)));
            foreach(var episode in selected)
                ApplyToSnapshot(archive.Snapshot,new PendingWatch{
                    Kind=target.Kind,Ids=target.Ids,Season=target.SeasonNumber,Episode=episode,Watched=watched
                });
            if(archive.Snapshot is not null)archive.Snapshot.CheckedAt=DateTimeOffset.MinValue;
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
    }
    public async Task DiscardPendingForTitleAsync(string user,SimklMediaTarget target,CancellationToken cancel)
    {
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var archive=await ReadUnsafe(user,cancel).ConfigureAwait(false);
            archive.PendingWatches.RemoveAll(p=>p.Kind==target.Kind&&
                p.Ids.Any(kv=>target.Ids.TryGetValue(kv.Key,out var id)&&
                    string.Equals(id,kv.Value,StringComparison.OrdinalIgnoreCase)));
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
    }
    public async Task MarkForRefreshAsync(string user,CancellationToken cancel)
    {
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var archive=await ReadUnsafe(user,cancel).ConfigureAwait(false);
            if(archive.Snapshot is not null)archive.Snapshot.CheckedAt=DateTimeOffset.MinValue;
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
    }
    public async Task<byte[]> ExportAsync(string user,CancellationToken cancel)
    {
        var archive=await ReadAsync(user,cancel).ConfigureAwait(false);
        return System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(archive,Json));
    }
}
