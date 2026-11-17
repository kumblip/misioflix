using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;
using Jellyfin.Data.Enums;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Controller.Collections;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Library;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// Bidirectional reconciliation of NFO sets with native Jellyfin BoxSets.
/// NFO/media files are READ ONLY. A durable ledger identifies the individual
/// memberships we may later remove and BoxSets WE created and may delete.
/// Missing/invalid libraries or damaged state must never trigger removals.
/// </summary>
public sealed class MisioFlixNfoCollectionsService : BackgroundService
{
    private const int MaxMediaItems = 20000;
    private const int MaxCollectionNames = 500;
    private const int MaxSetsPerItem = 32;
    private readonly ILibraryManager _library;
    private readonly ICollectionManager _collections;
    private readonly ILogger<MisioFlixNfoCollectionsService> _logger;
    private readonly string _statePath;
    private readonly SemaphoreSlim _runGate = new(1, 1);
    private readonly object _statusLock = new();
    private NfoCollectionSyncStatus _last = new(false, null, 0, 0, 0, 0, 0, null);
    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true, PropertyNameCaseInsensitive = true };

    // Persisted after every successful mutating batch, not just at the end of a scan.
    // Keys are Jellyfin GUID strings, not names (renames must not transfer ownership).
    public sealed class SyncLedger
    {
        public int Schema { get; set; } = 1;
        public DateTimeOffset? LastFullParseUtc { get; set; }
        public HashSet<string> CreatedBoxSetIds { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, List<string>> ManagedMembers { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, NfoSnapshot> NfoCache { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    }

    public sealed class NfoSnapshot
    {
        public string Path { get; set; } = "";
        public long Length { get; set; }
        public long ModifiedTicks { get; set; }
        public List<string> Sets { get; set; } = new();
        // A complete ordered set/sorttitle pairing, not global Jellyfin SortName.
        public Dictionary<string, string> SortBySet { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    }

    public MisioFlixNfoCollectionsService(ILibraryManager library, ICollectionManager collections,
        IApplicationPaths paths, ILogger<MisioFlixNfoCollectionsService> logger)
    {
        _library = library;
        _collections = collections;
        _logger = logger;
        _statePath = Path.Combine(paths.DataPath, "misioflix", "collections", "nfo-collections-state.json");
    }

    public NfoCollectionSyncStatus Status
    {
        get { lock (_statusLock) return _last; }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try { await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken).ConfigureAwait(false); }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
        while (!stoppingToken.IsCancellationRequested)
        {
            if (Plugin.Instance?.Configuration.Enabled == true &&
                Plugin.Instance.Configuration.AutoSyncNfoCollections)
            {
                try { await SynchronizeAsync(stoppingToken).ConfigureAwait(false); }
                catch (InvalidOperationException) { /* another synchronization or unsafe cache */ }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
                catch (Exception ex) { _logger.LogWarning(ex, "MisioFlix NFO collection synchronization failed"); }
            }
            try { await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken).ConfigureAwait(false); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
        }
    }

    public async Task<NfoCollectionSyncStatus> SynchronizeAsync(CancellationToken cancellationToken)
    {
        if (!await _runGate.WaitAsync(0, cancellationToken).ConfigureAwait(false))
            throw new InvalidOperationException("Synchronizacja kolekcji NFO już trwa.");
        lock (_statusLock) _last = _last with { Running = true, Error = null };
        try
        {
            var ledger = await LoadLedgerAsync(cancellationToken).ConfigureAwait(false);
            // Check NFO mtime and size every 30 minutes; once daily reparse
            // the XML even when metadata timestamps were preserved externally.
            var fullParse = !ledger.LastFullParseUtc.HasValue ||
                DateTimeOffset.UtcNow - ledger.LastFullParseUtc.Value >= TimeSpan.FromHours(24);
            var scanned = 0;
            var nfoFound = 0;
            var invalidNfo = 0;
            var created = 0;
            var added = 0;
            var removed = 0;
            var deleted = 0;
            var ordered = 0;
            var canRemove = true;
            var desired = new Dictionary<string, HashSet<Guid>>(StringComparer.OrdinalIgnoreCase);
            var sortTitles = new Dictionary<string, Dictionary<Guid, string>>(StringComparer.OrdinalIgnoreCase);
            var scannedIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var items = _library.GetItemList(new InternalItemsQuery
            {
                IncludeItemTypes = new[] { BaseItemKind.Movie, BaseItemKind.Series },
                Recursive = true,
                Limit = MaxMediaItems + 1,
                EnableTotalRecordCount = false
            });
            // NEVER infer deleted memberships from a truncated library query.
            if (items.Count >= MaxMediaItems)
                throw new InvalidOperationException("Za duża lub niepełna biblioteka; przerwano bez usuwania kolekcji.");

            foreach (var item in items)
            {
                cancellationToken.ThrowIfCancellationRequested();
                scanned++;
                var id = item.Id.ToString("N");
                scannedIds.Add(id);
                var nfo = NfoPath(item.Path, item.GetBaseItemKind() == BaseItemKind.Series);
                if (nfo is null)
                {
                    // A permanently missing NFO is equivalent to no <set>, but a
                    // temporarily missing volume is NOT evidence that a tag vanished.
                    var mediaFolder = MediaDirectory(item.Path);
                    if (mediaFolder is null || !Directory.Exists(mediaFolder)) canRemove = false;
                    ledger.NfoCache.Remove(id);
                    continue;
                }
                nfoFound++;
                NfoSnapshot info;
                try
                {
                    var file = new FileInfo(nfo);
                    if (!fullParse && ledger.NfoCache.TryGetValue(id, out var cached) &&
                        string.Equals(cached.Path, nfo, StringComparison.OrdinalIgnoreCase) &&
                        cached.Length == file.Length && cached.ModifiedTicks == file.LastWriteTimeUtc.Ticks)
                    {
                        info = cached;
                    }
                    else
                    {
                        info = ReadNfoSnapshot(nfo);
                        info.Length = file.Length;
                        info.ModifiedTicks = file.LastWriteTimeUtc.Ticks;
                        ledger.NfoCache[id] = info;
                    }
                }
                catch (Exception ex) when (ex is XmlException or IOException or UnauthorizedAccessException or InvalidDataException)
                {
                    invalidNfo++;
                    canRemove = false;
                    _logger.LogWarning("MisioFlix skipped invalid/unavailable NFO for {ItemId}: {ErrorType}",
                        item.Id, ex.GetType().Name);
                    continue;
                }
                foreach (var name in info.Sets)
                {
                    if (!desired.TryGetValue(name, out var ids)) desired[name] = ids = new HashSet<Guid>();
                    ids.Add(item.Id);
                    if (info.SortBySet.TryGetValue(name, out var sort))
                    {
                        if (!sortTitles.TryGetValue(name, out var names)) sortTitles[name] = names = new();
                        names[item.Id] = sort;
                    }
                }
                if (desired.Count > MaxCollectionNames)
                    throw new InvalidOperationException("Zbyt wiele kolekcji NFO; przerwano synchronizację.");
            }

            var existing = _library.GetItemList(new InternalItemsQuery
            {
                IncludeItemTypes = new[] { BaseItemKind.BoxSet },
                Recursive = true,
                EnableTotalRecordCount = false
            }).OfType<BoxSet>()
              .OrderBy(box => box.Id)
              .GroupBy(box => (box.Name ?? string.Empty).Trim(), StringComparer.OrdinalIgnoreCase)
              .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

            foreach (var entry in desired.OrderBy(x => x.Key, StringComparer.OrdinalIgnoreCase))
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (!existing.TryGetValue(entry.Key, out var box))
                {
                    try
                    {
                        box = await _collections.CreateCollectionAsync(new CollectionCreationOptions
                        {
                            Name = entry.Key,
                            ItemIdList = entry.Value.Select(id => id.ToString("N")).ToArray()
                        }).ConfigureAwait(false);
                        existing[entry.Key] = box;
                        ledger.CreatedBoxSetIds.Add(box.Id.ToString("N"));
                        added += entry.Value.Count;
                        created++;
                        AddManaged(ledger, box.Id, entry.Value);
                        await SaveLedgerAsync(ledger, cancellationToken).ConfigureAwait(false);
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        canRemove = false;
                        invalidNfo++;
                        _logger.LogWarning(ex, "MisioFlix failed to create BoxSet {Name}", entry.Key);
                    }
                }
                else
                {
                    try
                    {
                        var missing = entry.Value.Where(id => !box.ContainsLinkedChildByItemId(id)).ToArray();
                        if (missing.Length > 0)
                        {
                            await _collections.AddToCollectionAsync(box.Id, missing).ConfigureAwait(false);
                            added += missing.Length;
                        }
                        // A manual membership that IS explicitly described by NFO is
                        // adopted; only that particular link may be removed later.
                        if (AddManaged(ledger, box.Id, entry.Value))
                            await SaveLedgerAsync(ledger, cancellationToken).ConfigureAwait(false);
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        canRemove = false;
                        invalidNfo++;
                        _logger.LogWarning(ex, "MisioFlix failed to update BoxSet {Name}", entry.Key);
                    }
                }
            }

            // Prune only links previously registered in our durable ledger.
            // A corrupt XML, missing media volume or partial scan blocks ALL removals.
            if (canRemove)
            {
                var desiredByBox = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
                foreach (var entry in desired)
                    if (existing.TryGetValue(entry.Key, out var box))
                        desiredByBox[box.Id.ToString("N")] = entry.Value
                            .Select(id => id.ToString("N")).ToHashSet(StringComparer.OrdinalIgnoreCase);

                foreach (var prior in ledger.ManagedMembers.ToArray())
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    if (!Guid.TryParse(prior.Key, out var boxId)) continue;
                    var current = desiredByBox.TryGetValue(prior.Key, out var wanted)
                        ? wanted : new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    var stale = prior.Value.Where(id => !current.Contains(id))
                        .Select(id => Guid.TryParse(id, out var parsed) ? parsed : Guid.Empty)
                        .Where(id => id != Guid.Empty).Distinct().ToArray();
                    if (stale.Length == 0) continue;
                    try
                    {
                        var existingBox = _library.GetItemById(boxId) as BoxSet;
                        if (existingBox is not null)
                        {
                            if (!existingBox.LinkedChildrenLoaded)
                                throw new InvalidOperationException("Nie wczytano powiązań kolekcji; odmowa usuwania.");
                            var actual = stale.Where(existingBox.ContainsLinkedChildByItemId).ToArray();
                            if (actual.Length > 0)
                            {
                                await _collections.RemoveFromCollectionAsync(boxId, actual).ConfigureAwait(false);
                                removed += actual.Length;
                            }
                        }
                        var staleIds = stale.Select(id => id.ToString("N"))
                            .ToHashSet(StringComparer.OrdinalIgnoreCase);
                        prior.Value.RemoveAll(id => staleIds.Contains(id));
                        if (prior.Value.Count == 0) ledger.ManagedMembers.Remove(prior.Key);
                        await SaveLedgerAsync(ledger, cancellationToken).ConfigureAwait(false);
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        canRemove = false;
                        invalidNfo++;
                        _logger.LogWarning(ex, "MisioFlix did not remove stale links for BoxSet {Id}", boxId);
                        break;
                    }
                }
            }

            // Empty BoxSets are deleted ONLY when this plugin created them AND
            // Jellyfin reports zero actual linked items (including manual entries).
            if (canRemove)
            {
                foreach (var boxIdText in ledger.CreatedBoxSetIds.ToArray())
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    if (!Guid.TryParse(boxIdText, out var boxId)) continue;
                    var box = _library.GetItemById(boxId) as BoxSet;
                    if (box is null)
                    {
                        ledger.CreatedBoxSetIds.Remove(boxIdText);
                        ledger.ManagedMembers.Remove(boxIdText);
                        await SaveLedgerAsync(ledger, cancellationToken).ConfigureAwait(false);
                        continue;
                    }
                    if (!box.LinkedChildrenLoaded || box.LinkedChildren.Length != 0 || box.GetLinkedChildren().Count != 0)
                        continue;
                    var folder = await _collections.GetCollectionsFolder(false).ConfigureAwait(false);
                    if (folder is null || !IsChildOf(folder.Path, box.Path))
                    {
                        _logger.LogWarning("MisioFlix refused to delete BoxSet {Id} outside collection directory", boxId);
                        continue;
                    }
                    try
                    {
                        // Only a proven empty BoxSet metadata folder, NEVER media files.
                        _library.DeleteItem(box, new DeleteOptions { DeleteFileLocation = true, DeleteFromExternalProvider = false }, true);
                        ledger.CreatedBoxSetIds.Remove(boxIdText);
                        ledger.ManagedMembers.Remove(boxIdText);
                        await SaveLedgerAsync(ledger, cancellationToken).ConfigureAwait(false);
                        deleted++;
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        invalidNfo++;
                        _logger.LogWarning(ex, "MisioFlix failed deleting empty managed BoxSet {Id}", boxId);
                    }
                }
            }

            // Jellyfin 12.4 BoxSet has a per-collection *manual* order: the order
            // of LinkedChildren plus DisplayOrder="Default". The global movie
            // SortName is never changed. We only own order in OUR BoxSets.
            foreach (var entry in canRemove ? sortTitles : new Dictionary<string, Dictionary<Guid, string>>())
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (!existing.TryGetValue(entry.Key, out var box)) continue;
                if (!ledger.CreatedBoxSetIds.Contains(box.Id.ToString("N"))) continue;
                try
                {
                    box = _library.GetItemById(box.Id) as BoxSet ?? box;
                    if (!box.LinkedChildrenLoaded) continue; // never save an unknown link set
                    var links = box.LinkedChildren;
                    if (links.Length == 0) continue;
                    var indexes = links.Select((link, i) => (link, i)).ToArray();
                    var arranged = indexes.OrderBy(pair =>
                            pair.link.ItemId.HasValue && entry.Value.ContainsKey(pair.link.ItemId.Value) ? 0 : 1)
                        .ThenBy(pair => pair.link.ItemId.HasValue && entry.Value.TryGetValue(pair.link.ItemId.Value, out var key)
                            ? key : string.Empty, StringComparer.OrdinalIgnoreCase)
                        .ThenBy(pair => pair.i)
                        .Select(pair => pair.link).ToArray();
                    if (links.SequenceEqual(arranged) && box.DisplayOrder == "Default") continue;
                    box.LinkedChildren = arranged;
                    box.DisplayOrder = "Default";
                    await box.UpdateToRepositoryAsync(ItemUpdateType.MetadataEdit, cancellationToken).ConfigureAwait(false);
                    ordered++;
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    invalidNfo++;
                    _logger.LogWarning(ex, "MisioFlix could not apply per-BoxSet sort order to {BoxSetId}", box.Id);
                }
            }

            foreach (var id in ledger.NfoCache.Keys.Where(id => !scannedIds.Contains(id)).ToArray())
                ledger.NfoCache.Remove(id);
            if (fullParse && canRemove) ledger.LastFullParseUtc = DateTimeOffset.UtcNow;
            await SaveLedgerAsync(ledger, cancellationToken).ConfigureAwait(false);
            var error = !canRemove ? "Niepełny/niepoprawny odczyt — bez usuwania powiązań ani kolekcji."
                : invalidNfo > 0 ? $"Pominięto {invalidNfo} błędnych NFO lub operacji." : null;
            var status = new NfoCollectionSyncStatus(false, DateTimeOffset.UtcNow,
                scanned, nfoFound, desired.Count, created, added, error, removed, deleted, ordered);
            lock (_statusLock) _last = status;
            _logger.LogInformation("MisioFlix NFO sets: {Scanned} media, {Created} created, {Added} added, {Removed} removed, {Deleted} empty BoxSets deleted, {Ordered} sorted",
                scanned, created, added, removed, deleted, ordered);
            return status;
        }
        catch (Exception ex)
        {
            lock (_statusLock) _last = _last with
            {
                Running = false, LastRunUtc = DateTimeOffset.UtcNow,
                Error = ex is OperationCanceledException ? "Przerwano synchronizację." : ex.Message
            };
            throw;
        }
        finally { _runGate.Release(); }
    }

    private static bool AddManaged(SyncLedger ledger, Guid boxId, IEnumerable<Guid> ids)
    {
        var key = boxId.ToString("N");
        if (!ledger.ManagedMembers.TryGetValue(key, out var registered))
            ledger.ManagedMembers[key] = registered = new List<string>();
        var known = registered.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var changed = false;
        foreach (var id in ids)
        {
            var normalized = id.ToString("N");
            if (known.Add(normalized)) { registered.Add(normalized); changed = true; }
        }
        return changed;
    }

    private static bool IsChildOf(string? parent, string? candidate)
    {
        if (string.IsNullOrWhiteSpace(parent) || string.IsNullOrWhiteSpace(candidate)) return false;
        try
        {
            var root = Path.GetFullPath(parent).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            var path = Path.GetFullPath(candidate);
            return path.StartsWith(root, OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);
        }
        catch (Exception ex) when (ex is IOException or ArgumentException or UnauthorizedAccessException) { return false; }
    }

    private async Task<SyncLedger> LoadLedgerAsync(CancellationToken cancel)
    {
        if (!File.Exists(_statePath)) return new SyncLedger();
        try
        {
            var json = await File.ReadAllTextAsync(_statePath, cancel).ConfigureAwait(false);
            var ledger = JsonSerializer.Deserialize<SyncLedger>(json, Json)
                ?? throw new InvalidDataException("Pusta pamięć synchronizacji NFO");
            if (ledger.Schema != 1 || ledger.CreatedBoxSetIds is null || ledger.ManagedMembers is null || ledger.NfoCache is null)
                throw new InvalidDataException("Nieznany format pamięci synchronizacji NFO");
            return ledger;
        }
        catch (JsonException ex)
        {
            // Never silently replace damaged ownership state: it guards deletions.
            throw new InvalidDataException("Pamięć kolekcji NFO jest uszkodzona; nie wykonano usunięć.", ex);
        }
    }

    private async Task SaveLedgerAsync(SyncLedger ledger, CancellationToken cancel)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_statePath)!);
        var tmp = _statePath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await File.WriteAllTextAsync(tmp, JsonSerializer.Serialize(ledger, Json), cancel).ConfigureAwait(false);
            File.Move(tmp, _statePath, true);
        }
        finally { if (File.Exists(tmp)) File.Delete(tmp); }
    }

    private static string? MediaDirectory(string? mediaPath)
    {
        if (string.IsNullOrWhiteSpace(mediaPath)) return null;
        try { return Directory.Exists(mediaPath) ? mediaPath : Path.GetDirectoryName(mediaPath); }
        catch (Exception ex) when (ex is ArgumentException or IOException or UnauthorizedAccessException) { return null; }
    }

    private static string? NfoPath(string? mediaPath, bool series)
    {
        var directory = MediaDirectory(mediaPath);
        if (string.IsNullOrWhiteSpace(directory)) return null;
        try
        {
            var preferred = Path.Combine(directory, series ? "tvshow.nfo" : "movie.nfo");
            if (File.Exists(preferred)) return preferred;
            if (series) return null;
            var filename = Path.Combine(directory, Path.GetFileNameWithoutExtension(mediaPath) + ".nfo");
            return File.Exists(filename) ? filename : null;
        }
        catch (Exception ex) when (ex is ArgumentException or IOException or UnauthorizedAccessException) { return null; }
    }

    internal static IReadOnlyList<string> ReadSetTags(string path) => ReadNfoSnapshot(path).Sets;

    /// <summary>
    /// Direct children only. When there are N sets and N sorttitles, they pair
    /// by occurrence order (sets[0] with sorttitles[0], etc.). No guess otherwise.
    /// </summary>
    internal static NfoSnapshot ReadNfoSnapshot(string path)
    {
        var settings = new XmlReaderSettings
        {
            DtdProcessing = DtdProcessing.Prohibit,
            XmlResolver = null,
            MaxCharactersInDocument = 2_000_000,
            IgnoreComments = true
        };
        using var reader = XmlReader.Create(path, settings);
        var root = XDocument.Load(reader).Root;
        if (root is null || !(root.Name.LocalName.Equals("movie", StringComparison.OrdinalIgnoreCase) ||
                              root.Name.LocalName.Equals("tvshow", StringComparison.OrdinalIgnoreCase)))
            throw new XmlException("NFO must have a movie/tvshow root");
        var sets = root.Elements().Where(e => e.Name.LocalName.Equals("set", StringComparison.OrdinalIgnoreCase))
            .Select(e => NormalizeName(e.Value)).ToArray();
        if (sets.Length > MaxSetsPerItem) throw new InvalidDataException("Too many <set> tags");
        if (sets.Any(s => s is null)) throw new InvalidDataException("Invalid <set> tag");
        var names = sets.Select(s => s!).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var sorts = root.Elements().Where(e => e.Name.LocalName.Equals("sorttitle", StringComparison.OrdinalIgnoreCase))
            .Select(e => e.Value.Trim()).ToArray();
        var sortBySet = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (sets.Length > 0 && sets.Length == sorts.Length && sorts.All(s => s.Length is > 0 and <= 240))
        {
            for (var i = 0; i < sets.Length; i++) sortBySet[sets[i]!] = sorts[i];
        }
        return new NfoSnapshot { Path = path, Sets = names, SortBySet = sortBySet };
    }

    private static string? NormalizeName(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var value = string.Join(" ", raw.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        if (value.Length > 120 || value is "." or ".." || value.EndsWith(".", StringComparison.Ordinal) ||
            value.Any(ch => char.IsControl(ch) || "/\\:*?\"<>|".Contains(ch))) return null;
        return value;
    }
}

public sealed record NfoCollectionSyncStatus(
    bool Running, DateTimeOffset? LastRunUtc, int ScannedMedia,
    int FoundNfo, int ReferencedCollections, int CreatedCollections,
    int AddedMemberships, string? Error,
    int RemovedMemberships = 0, int DeletedCollections = 0, int ReorderedCollections = 0);
