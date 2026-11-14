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
        public string OperationId { get; set; } = Guid.NewGuid().ToString("N");
        public int Attempts { get; set; }
        public DateTimeOffset? LastAttemptAt { get; set; }
        public string LastError { get; set; } = "";
        public bool IsManual { get; set; }
        public string Key { get; set; } = "";
        public string Kind { get; set; } = "";
        public Dictionary<string,string> Ids { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public int? Season { get; set; }
        public int? Episode { get; set; }
        public List<int>? PreviewEpisodes { get; set; }
        public bool Watched { get; set; } = true;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
    public sealed class PendingEdit
    {
        public string OperationId { get; set; } = Guid.NewGuid().ToString("N");
        public string Key { get; set; } = "";
        public string Kind { get; set; } = "";
        public Dictionary<string,string> Ids { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public string? Title { get; set; }
        public int? Year { get; set; }
        public string? Status { get; set; }
        public int? Score { get; set; }
        public bool ChangeStatus { get; set; }
        public bool ChangeScore { get; set; }
        public bool CreateIfMissing { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public int Attempts { get; set; }
        public DateTimeOffset? LastAttemptAt { get; set; }
        public string LastError { get; set; } = "";
    }
    public sealed class Archive
    {
        public int FormatVersion { get; set; } = 1;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? LastSuccessfulSyncAt { get; set; }
        public SnapshotData? Snapshot { get; set; }
        public Dictionary<string,int> Rewatches { get; set; } = new(StringComparer.Ordinal);
        public List<PendingWatch> PendingWatches { get; set; } = new();
        public List<PendingEdit> PendingEdits { get; set; } = new();
    }
    private readonly string _path;
    private readonly string _versionsPath;
    private const int MaxDailyBackups = 30;
    private const int MaxMonthlyBackups = 12;
    private readonly ConcurrentDictionary<string,SemaphoreSlim> _locks = new();
    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true };

    public MisioFlixSimklLocalStore(IApplicationPaths paths)
    {
        _path=Path.Combine(paths.DataPath,"misioflix","simkl","local-backup");
        Directory.CreateDirectory(_path);
        _versionsPath=Path.Combine(_path,"history");
        Directory.CreateDirectory(_versionsPath);
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
    private string HistoryFolder(string user,string frequency)
    {
        var id=Guid.Parse(user).ToString("N");
        return Path.Combine(_versionsPath,id,frequency);
    }
    private static void RetainMostRecent(string folder,int keep)
    {
        foreach(var outdated in Directory.GetFiles(folder,"*.json")
            .OrderByDescending(Path.GetFileName,StringComparer.Ordinal).Skip(keep))
            File.Delete(outdated);
    }
    private async Task SaveHistoryUnsafe(string user,CancellationToken cancel)
    {
        var source=FileName(user);
        if(!File.Exists(source))return;
        var day=DateTimeOffset.UtcNow.ToString("yyyy-MM-dd",System.Globalization.CultureInfo.InvariantCulture);
        var month=DateTimeOffset.UtcNow.ToString("yyyy-MM",System.Globalization.CultureInfo.InvariantCulture);
        foreach(var (frequency,stamp,keep) in new[]{("daily",day,MaxDailyBackups),("monthly",month,MaxMonthlyBackups)})
        {
            var folder=HistoryFolder(user,frequency);
            Directory.CreateDirectory(folder);
            var target=Path.Combine(folder,stamp+".json");
            if(File.Exists(target))continue;
            // The previous archive was successfully parsed by ReadUnsafe before any
            // mutation. A historical copy is immutable for that calendar interval.
            var tmp=target+"."+Guid.NewGuid().ToString("N")+".tmp";
            try
            {
                await using(var input=File.OpenRead(source))
                {
                    await using(var output=File.Create(tmp))
                        await input.CopyToAsync(output,cancel).ConfigureAwait(false);
                }
                File.Move(tmp,target,false);
            }
            catch(IOException) when(File.Exists(target)){}
            finally{if(File.Exists(tmp))File.Delete(tmp);}
            RetainMostRecent(folder,keep);
        }
    }
    private async Task WriteUnsafe(string user,Archive value,CancellationToken cancel,bool skipOldHistory=false)
    {
        value.UpdatedAt=DateTimeOffset.UtcNow;
        var path=FileName(user);var tmp=path+"."+Guid.NewGuid().ToString("N")+".tmp";
        var hadOriginal=File.Exists(path);
        try
        {
            await File.WriteAllTextAsync(tmp,JsonSerializer.Serialize(value,Json),cancel).ConfigureAwait(false);
            if(OperatingSystem.IsLinux()||OperatingSystem.IsMacOS())
            {
                try{File.SetUnixFileMode(tmp,UnixFileMode.UserRead|UnixFileMode.UserWrite);}catch(UnauthorizedAccessException){}
            }
            // Copy the previously validated archive BEFORE replacing it.
            if(!skipOldHistory)await SaveHistoryUnsafe(user,cancel).ConfigureAwait(false);
            File.Move(tmp,path,true);
            // The very first archive should also seed the historical timeline.
            if(!hadOriginal)await SaveHistoryUnsafe(user,cancel).ConfigureAwait(false);
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
            // Simkl owns movie/show lists only. Anime is exclusively managed by MAL.
            snapshot.Items=new Dictionary<string,MisioFlixSimklService.SimklEntry>(
                snapshot.Items.Where(kv=>kv.Value.Kind is "movies" or "shows"),StringComparer.Ordinal);
            archive.Snapshot=snapshot;
            if(snapshot.CheckedAt>DateTimeOffset.MinValue)
                archive.LastSuccessfulSyncAt=snapshot.CheckedAt;
            // Pending local decisions always take precedence over older remote state.
            foreach(var pending in archive.PendingWatches.OrderBy(x=>x.CreatedAt))ApplyToSnapshot(archive.Snapshot,pending);
            foreach(var pending in archive.PendingEdits.OrderBy(x=>x.CreatedAt))ApplyEditToSnapshot(archive.Snapshot,pending);
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
    }
    private static void ApplyToSnapshot(SnapshotData? snapshot,PendingWatch update)
    {
        if(snapshot is null)return;
        if(update.Kind=="shows"&&update.Episode is null&&update.PreviewEpisodes is { } previews)
        {
            foreach(var episode in previews)
                ApplyToSnapshot(snapshot,new PendingWatch{
                    Kind=update.Kind,Ids=update.Ids,Season=update.Season,Episode=episode,Watched=update.Watched
                });
            return;
        }
        var entry=snapshot.Items.Values.FirstOrDefault(item=>item.Kind==update.Kind&&
            update.Ids.Any(pair=>item.Ids.TryGetValue(pair.Key,out var id)&&
                string.Equals(id,pair.Value,StringComparison.OrdinalIgnoreCase)));
        if(entry is null&&update.Kind is "shows" or "movies")
        {
            var synthetic=new MisioFlixSimklService.SimklEntry(update.Kind,0,"",null,null,null,
                new Dictionary<string,string>(update.Ids,StringComparer.OrdinalIgnoreCase),null,null);
            snapshot.Items["local:"+ManualEditKey(update.Kind,update.Ids)]=synthetic;
            entry=synthetic;
        }
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
    private static bool SameIds(Dictionary<string,string> a,Dictionary<string,string> b)=>
        a.Any(pair=>b.TryGetValue(pair.Key,out var match)&&
            string.Equals(pair.Value,match,StringComparison.OrdinalIgnoreCase));
    private static void ApplyEditToSnapshot(SnapshotData? snapshot,PendingEdit update)
    {
        if(snapshot is null||update.Kind is not ("shows" or "movies"))return;
        var found=snapshot.Items.FirstOrDefault(pair=>pair.Value.Kind==update.Kind&&SameIds(pair.Value.Ids,update.Ids));
        var old=found.Value;
        var entry=old??new MisioFlixSimklService.SimklEntry(update.Kind,0,"",null,null,null,
            new Dictionary<string,string>(update.Ids,StringComparer.OrdinalIgnoreCase),update.Title,null);
        var newEntry=entry with {
            Status=update.ChangeStatus ? update.Status??entry.Status:entry.Status,
            Score=update.ChangeScore ? (update.Score is >0?update.Score:null):entry.Score
        };
        // Synthetic identifiers are stable across restarts while offline.
        var key=old is null ? "local:"+update.Key : found.Key;
        snapshot.Items[key]=newEntry;
    }
    public static string ManualEditKey(string kind,Dictionary<string,string> ids)=>
        kind+":"+string.Join(";",ids.OrderBy(p=>p.Key,StringComparer.OrdinalIgnoreCase)
            .Select(p=>p.Key+"="+p.Value));
    public async Task QueueManualEditAsync(string user,PendingEdit operation,CancellationToken cancel)
    {
        if(operation.Kind is not ("shows" or "movies")||operation.Ids.Count==0)
            throw new ArgumentException("Edycja Simkl wymaga filmu lub serialu z identyfikatorem.");
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var archive=await ReadUnsafe(user,cancel).ConfigureAwait(false);
            archive.Snapshot??=new SnapshotData {CheckedAt=DateTimeOffset.MinValue};
            var old=archive.PendingEdits.FirstOrDefault(x=>x.Key==operation.Key);
            if(old is not null)
            {
                // Merge fields: editing only a rating must not discard a pending status.
                if(!operation.ChangeStatus&&old.ChangeStatus)
                {operation.ChangeStatus=true;operation.Status=old.Status;}
                if(!operation.ChangeScore&&old.ChangeScore)
                {operation.ChangeScore=true;operation.Score=old.Score;}
                operation.CreateIfMissing|=old.CreateIfMissing;
            }
            archive.PendingEdits.RemoveAll(x=>x.Key==operation.Key);
            archive.PendingEdits.Add(operation);
            ApplyEditToSnapshot(archive.Snapshot,operation);
            archive.Snapshot.CheckedAt=DateTimeOffset.MinValue;
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
    }
    public async Task CompleteManualEditAsync(string user,string key,string operationId,CancellationToken cancel)
    {
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var archive=await ReadUnsafe(user,cancel).ConfigureAwait(false);
            archive.PendingEdits.RemoveAll(x=>x.Key==key&&x.OperationId==operationId);
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
    }
    public async Task NoteAttemptAsync(string user,string operationId,string reason,CancellationToken cancel)
    {
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var archive=await ReadUnsafe(user,cancel).ConfigureAwait(false);
            var edit=archive.PendingEdits.FirstOrDefault(x=>x.OperationId==operationId);
            if(edit is not null){edit.Attempts++;edit.LastAttemptAt=DateTimeOffset.UtcNow;edit.LastError=reason;}
            var watch=archive.PendingWatches.FirstOrDefault(x=>x.OperationId==operationId);
            if(watch is not null){watch.Attempts++;watch.LastAttemptAt=DateTimeOffset.UtcNow;watch.LastError=reason;}
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
    }
    public sealed record BackupStatus(DateTimeOffset? LastSync,int PendingChanges,int DailyCopies,
        int MonthlyCopies,DateTimeOffset LastLocalSave,int Movies,int Shows);
    public async Task<BackupStatus> StatusAsync(string user,CancellationToken cancel)
    {
        var data=await ReadAsync(user,cancel).ConfigureAwait(false);
        var daily=HistoryFolder(user,"daily");var monthly=HistoryFolder(user,"monthly");
        DateTimeOffset? last=data.LastSuccessfulSyncAt;
        if(!last.HasValue&&data.Snapshot is not null&&data.Snapshot.CheckedAt>DateTimeOffset.MinValue)
            last=data.Snapshot.CheckedAt;
        return new BackupStatus(last,
            data.PendingEdits.Count+data.PendingWatches.Count,
            Directory.Exists(daily)?Directory.GetFiles(daily,"*.json").Length:0,
            Directory.Exists(monthly)?Directory.GetFiles(monthly,"*.json").Length:0,
            data.UpdatedAt,
            data.Snapshot?.Items.Values.Count(x=>x.Kind=="movies")??0,
            data.Snapshot?.Items.Values.Count(x=>x.Kind=="shows")??0);
    }
    public async Task ImportAsync(string user,Stream stream,CancellationToken cancel)
    {
        const int maxBytes=32*1024*1024;
        using var buffer=new MemoryStream();
        var piece=new byte[81920];int n;
        while((n=await stream.ReadAsync(piece,cancel).ConfigureAwait(false))>0)
        {
            if(buffer.Length+n>maxBytes)throw new ArgumentException("Kopia przekracza 32 MB.");
            buffer.Write(piece,0,n);
        }
        buffer.Position=0;
        var recovered=await JsonSerializer.DeserializeAsync<Archive>(buffer,Json,cancel).ConfigureAwait(false)
            ??throw new ArgumentException("Nieprawidłowy plik kopii Simkl.");
        if(recovered.FormatVersion!=1||recovered.Snapshot is null||recovered.PendingWatches is null||
            recovered.PendingEdits is null||recovered.Rewatches is null||
            recovered.Snapshot.Items is null||recovered.Snapshot.Items.Values.Any(x=>x.Kind is not ("movies" or "shows")))
            throw new ArgumentException("Nieobsługiwany lub niepoprawny format kopii filmów i seriali Simkl.");
        if(recovered.PendingWatches.Any(x=>x.Kind is not ("movies" or "shows"))||
            recovered.PendingEdits.Any(x=>x.Kind is not ("movies" or "shows")))
            throw new ArgumentException("Kopia Simkl może obejmować tylko filmy i seriale — bez anime.");
        if(recovered.Snapshot.Items.Count>200000||recovered.PendingEdits.Count>10000||
            recovered.PendingWatches.Count>100000||recovered.Rewatches.Count>200000)
            throw new ArgumentException("Nieprawidłowa liczba rekordów kopii.");
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            // Keep a unique pre-restore rollback even when today's daily copy exists.
            // A damaged active JSON must not prevent recovery from a good export.
            var oldWasCorrupted=false;
            try{_=await ReadUnsafe(user,cancel).ConfigureAwait(false);}
            catch(InvalidOperationException){oldWasCorrupted=true;}
            var current=FileName(user);
            if(File.Exists(current))
            {
                var folder=HistoryFolder(user,"restore");Directory.CreateDirectory(folder);
                var file=Path.Combine(folder,DateTimeOffset.UtcNow.ToString("yyyyMMddHHmmssfff")+".json");
                File.Copy(current,file,false);RetainMostRecent(folder,10);
            }
            // Keep restored data usable immediately. Simkl remains the sync source
            // at the next normal 72-hour interval, not during this restore.
            recovered.Snapshot.CheckedAt=DateTimeOffset.UtcNow;
            await WriteUnsafe(user,recovered,cancel,skipOldHistory:oldWasCorrupted).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
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
            if(!operation.IsManual&&archive.PendingWatches.Any(item=>item.Key==operation.Key&&item.IsManual))return;
            archive.PendingWatches.RemoveAll(item=>item.Key==operation.Key);
            archive.PendingWatches.Add(operation);
            ApplyToSnapshot(archive.Snapshot,operation);
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
    }
    public async Task CompleteWatchAsync(string user,string operationKey,string operationId,CancellationToken cancel)
    {
        await Lock(user).WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var archive=await ReadUnsafe(user,cancel).ConfigureAwait(false);
            archive.PendingWatches.RemoveAll(x=>x.Key==operationKey&&x.OperationId==operationId);
            await WriteUnsafe(user,archive,cancel).ConfigureAwait(false);
        }
        finally{Lock(user).Release();}
    }
    public async Task ApplyManualHistoryAsync(string user,SimklMediaTarget target,
        IEnumerable<int> episodeNumbers,bool watched,CancellationToken cancel,bool wholeSeason=false)
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
            archive.Snapshot??=new SnapshotData {CheckedAt=DateTimeOffset.MinValue};
            if(wholeSeason)
            {
                // Preserve the original Simkl "whole season" semantics: its API
                // can mark episodes which are not present in Jellyfin locally.
                archive.PendingWatches.RemoveAll(p=>p.Kind=="shows"&&p.Season==target.SeasonNumber&&
                    SameIds(p.Ids,target.Ids));
                var bulk=new PendingWatch {
                    Key=ManualEditKey(target.Kind,target.Ids)+":"+target.SeasonNumber+":all",
                    Kind=target.Kind,Ids=target.Ids,Season=target.SeasonNumber,
                    PreviewEpisodes=selected.OrderBy(x=>x).ToList(),Watched=watched,IsManual=true
                };
                archive.PendingWatches.Add(bulk);
                ApplyToSnapshot(archive.Snapshot,bulk);
            }
            else foreach(var episode in selected)
            {
                var update=new PendingWatch{
                    Key=ManualEditKey(target.Kind,target.Ids)+":"+target.SeasonNumber+":"+episode,
                    Kind=target.Kind,Ids=target.Ids,Season=target.SeasonNumber,Episode=episode,
                    Watched=watched,IsManual=true
                };
                archive.PendingWatches.RemoveAll(p=>p.Key==update.Key);
                archive.PendingWatches.Add(update);
                ApplyToSnapshot(archive.Snapshot,update);
            }
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
