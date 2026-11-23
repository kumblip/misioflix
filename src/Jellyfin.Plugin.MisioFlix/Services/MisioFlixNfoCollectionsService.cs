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
    private const int MaxFolderCandidates = 20000;
    private readonly ILibraryManager _library;
    private readonly ICollectionManager _collections;
    private readonly ILogger<MisioFlixNfoCollectionsService> _logger;
    private readonly string _statePath;
    private readonly SemaphoreSlim _runGate = new(1, 1);
    private readonly object _statusLock = new();
    private NfoCollectionSyncStatus _last = new(false, null, 0, 0, 0, 0, 0, null);
    private NfoCollectionSyncDiagnostic? _lastDiagnostic;
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

    // Read-only, administrator-only diagnostic snapshot from the LAST sync.
    // No file paths, credentials or NFO contents are exposed by the endpoint.
    public NfoCollectionSyncDiagnostic? Diagnostic
    {
        get { lock (_statusLock) return _lastDiagnostic; }
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
            var parsedNfo = 0;
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
            var movieIds = new HashSet<Guid>();
            var seasonIds = new HashSet<Guid>();
            var seriesIds = new HashSet<Guid>();
            var perLibrary = new Dictionary<string, NfoCollectionLibraryCounter>(StringComparer.OrdinalIgnoreCase);
            var genericFolderCount = 0;
            var missingConfiguredLibraries = new List<string>();
            var namesById = new Dictionary<Guid, string>();
            var movieWithNfo = 0;
            var seasonWithNfo = 0;
            var seasonWithSets = 0;
            var seriesWithNfo = 0;
            var folderWithNfo = 0;
            var movieWithSets = 0;
            var seriesWithSets = 0;
            var movieWithoutNfo = new List<string>();
            var movieWithoutSets = new List<string>();
            var invalidMovieNfo = new List<string>();
            var managedItemIds = ledger.ManagedMembers.Values.SelectMany(ids => ids)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            // Query BOTH types independently. If a backend incorrectly handles
            // combined item-type filters, neither movies nor series may disappear
            // silently from the sync. The individual counts are in diagnostics.
            var movies = _library.GetItemList(new InternalItemsQuery
            {
                IncludeItemTypes = new[] { BaseItemKind.Movie },
                Recursive = true, Limit = MaxMediaItems + 1, EnableTotalRecordCount = false
            });
            var series = _library.GetItemList(new InternalItemsQuery
            {
                IncludeItemTypes = new[] { BaseItemKind.Series },
                Recursive = true, Limit = MaxMediaItems + 1, EnableTotalRecordCount = false
            });
            // Seasons are independent media objects: an anime season may belong
            // to a different BoxSet than the parent series. A folder with its own
            // media NFO can also represent a show in a Jellyfin 'mixed' library.
            var seasons = _library.GetItemList(new InternalItemsQuery
            {
                IncludeItemTypes = new[] { BaseItemKind.Season },
                Recursive = true, Limit = MaxMediaItems + 1, EnableTotalRecordCount = false
            });
            var folders = _library.GetItemList(new InternalItemsQuery
            {
                IncludeItemTypes = new[] { BaseItemKind.Folder },
                Recursive = true, Limit = MaxFolderCandidates + 1, EnableTotalRecordCount = false
            });
            var items = movies.Concat(series).Concat(seasons).Concat(folders)
                .DistinctBy(item => item.Id).ToArray();
            // A folder is a media candidate only if its OWN directory contains
            // tvshow.nfo / movie.nfo / season.nfo. Nested grouping folders with
            // no NFO do not become synthetic movies or shows.
            var candidates = items.Select(item => (item, nfo: CandidateNfoPath(item.Path, item.GetBaseItemKind())))
                .Where(pair => pair.nfo.Kind is not null || pair.item.GetBaseItemKind() != BaseItemKind.Folder)
                // A Jellyfin mixed library may expose the SAME physical title as
                // both Series and Folder. Prefer the typed item; never add BOTH.
                .DistinctBy(pair => pair.nfo.Path is null
                    ? pair.item.Id.ToString("N")
                    : Path.GetFullPath(pair.nfo.Path),
                    OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal)
                .ToArray();
            genericFolderCount = folders.Count - candidates.Count(pair => pair.item.GetBaseItemKind() == BaseItemKind.Folder);
            // Distinguish physical source libraries by stable Jellyfin GUID.
            // Missing roots are a safety failure: NEVER remove BoxSet links.
            var configured = Plugin.Instance?.Configuration;
            if (configured?.LibraryPathsConfigured == true)
            {
                foreach (var lib in configured.LibraryPaths ?? new())
                {
                    if (!Guid.TryParse(lib.LibraryId, out var parsedId)) continue;
                    var idText = parsedId.ToString("N");
                    if (!perLibrary.ContainsKey(idText)) perLibrary[idText] = new NfoCollectionLibraryCounter(idText, lib.Name);
                    foreach (var root in lib.Paths ?? new())
                    {
                        if (string.IsNullOrWhiteSpace(root) || !Directory.Exists(root))
                        {
                            canRemove = false;
                            missingConfiguredLibraries.Add(lib.Name);
                            perLibrary[idText].Complete = false;
                        }
                    }
                }
            }
            // NEVER infer deleted memberships from a truncated library query.
            if (movies.Count > MaxMediaItems || series.Count > MaxMediaItems || seasons.Count > MaxMediaItems ||
                folders.Count > MaxFolderCandidates || candidates.Length > MaxMediaItems)
                throw new InvalidOperationException("Za duża lub niepełna biblioteka; przerwano bez usuwania kolekcji.");
            // An unexpectedly empty film query must not empty existing film
            // memberships. Could mean a library has not finished mounting.
            if (movies.Count == 0 && managedItemIds.Count > 0)
                canRemove = false;

            foreach (var candidate in candidates)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var item = candidate.item;
                scanned++;
                var id = item.Id.ToString("N");
                scannedIds.Add(id);
                var kind = candidate.nfo.Kind ?? (item.GetBaseItemKind() switch
                {
                    BaseItemKind.Movie => "movie", BaseItemKind.Series => "series",
                    BaseItemKind.Season => "season", _ => "folder"
                });
                var isMovie = kind == "movie";
                var isSeason = kind == "season";
                if (isMovie) movieIds.Add(item.Id);
                else if (isSeason) seasonIds.Add(item.Id);
                else seriesIds.Add(item.Id);
                namesById[item.Id] = item.Name ?? id;
                // An NFO of each kind belongs to its own Jellyfin item ID.
                // NEVER substitute a parent Series ID for a Season ID.
                var nfo = candidate.nfo.Path;
                var itemLibraries = new List<NfoCollectionLibraryCounter>();
                try
                {
                    foreach (var root in _library.GetCollectionFolders(item))
                    {
                        var libraryId = root.Id.ToString("N");
                        if (!perLibrary.TryGetValue(libraryId, out var counter))
                            perLibrary[libraryId] = counter = new NfoCollectionLibraryCounter(libraryId, root.Name ?? libraryId);
                        itemLibraries.Add(counter);
                        counter.FoundItems++;
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    canRemove = false;
                    _logger.LogWarning(ex, "Cannot resolve media {Id} to a Jellyfin library", item.Id);
                }
                if (itemLibraries.Count == 0) canRemove = false;
                if (nfo is null)
                {
                    // Never interpret a missing/unresolved NFO as evidence
                    // that a previously registered <set> has been deleted.
                    // A modified, valid NFO with no <set> IS evidence instead.
                    var mediaFolder = MediaDirectory(item.Path);
                    // All typed movies, series and seasons are expected to have
                    // their NFO. A missing file means scan completeness is not
                    // proven and must NEVER authorize pruning old memberships.
                    if (item.GetBaseItemKind() != BaseItemKind.Folder ||
                        mediaFolder is null || !Directory.Exists(mediaFolder) ||
                        ledger.NfoCache.ContainsKey(id) || managedItemIds.Contains(id)) canRemove = false;
                    foreach (var lib in itemLibraries) lib.MissingNfo++;
                    if (isMovie && movieWithoutNfo.Count < 20)
                        movieWithoutNfo.Add(item.Name ?? id);
                    continue;
                }
                nfoFound++;
                if (isMovie) movieWithNfo++;
                else if (isSeason) seasonWithNfo++;
                else seriesWithNfo++;
                if (item.GetBaseItemKind() == BaseItemKind.Folder) folderWithNfo++;
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
                    foreach (var lib in itemLibraries) { lib.InvalidNfo++; lib.Complete = false; }
                    _logger.LogWarning("MisioFlix skipped invalid/unavailable NFO for {ItemId}: {ErrorType}",
                        item.Id, ex.GetType().Name);
                    if (isMovie && invalidMovieNfo.Count < 20)
                        invalidMovieNfo.Add(item.Name ?? id);
                    continue;
                }
                parsedNfo++;
                foreach (var lib in itemLibraries)
                {
                    lib.NfoRead++;
                    if (info.Sets.Count > 0) lib.WithSet++;
                }
                if (isMovie)
                {
                    if (info.Sets.Count > 0) movieWithSets++;
                    else if (movieWithoutSets.Count < 20) movieWithoutSets.Add(item.Name ?? id);
                }
                else if (isSeason)
                {
                    if (info.Sets.Count > 0) seasonWithSets++;
                }
                else if (info.Sets.Count > 0) seriesWithSets++;
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

            // A missing previously-managed item is not proof of removal: a media
            // volume may be absent or Jellyfin may still be rescanning it.
            if (managedItemIds.Any(id => !scannedIds.Contains(id))) canRemove = false;
            if (perLibrary.Values.Any(lib => !lib.Complete)) canRemove = false;

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

            // Never run pruning if Jellyfin did not confirm all desired links.
            // AddToCollectionAsync returning successfully is not proof that a
            // collection's items are visible to its API/UI after the write.
            foreach (var entry in desired)
            {
                if (!existing.TryGetValue(entry.Key, out var box)) continue;
                var actualBox = _library.GetItemById(box.Id) as BoxSet ?? box;
                if (!actualBox.LinkedChildrenLoaded ||
                    entry.Value.Any(id => !actualBox.ContainsLinkedChildByItemId(id)))
                {
                    canRemove = false;
                    _logger.LogWarning("MisioFlix: collection {Name} has NFO members missing from native BoxSet; skipping deletions", entry.Key);
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

            // Read back ACTUAL resolved Jellyfin BoxSet children. Counting NFO
            // matches alone is insufficient: the native BoxSet page may still
            // have no movie links, even when source tags were read successfully.
            var groups = new List<NfoCollectionGroupDiagnostic>();
            foreach (var entry in desired.OrderBy(x => x.Key, StringComparer.OrdinalIgnoreCase))
            {
                if (!existing.TryGetValue(entry.Key, out var box)) continue;
                var expectedMovies = entry.Value.Count(movieIds.Contains);
                var expectedSeasons = entry.Value.Count(seasonIds.Contains);
                var expectedSeries = entry.Value.Count - expectedMovies - expectedSeasons;
                try
                {
                    var currentBox = _library.GetItemById(box.Id) as BoxSet ?? box;
                    var resolved = currentBox.GetLinkedChildren();
                    var resolvedIds = resolved.Select(item => item.Id).ToHashSet();
                    var linkedMovies = resolved.Count(item => movieIds.Contains(item.Id));
                    var linkedSeries = resolved.Count(item => seriesIds.Contains(item.Id));
                    var linkedSeasons = resolved.Count(item => seasonIds.Contains(item.Id));
                    var missing = entry.Value.Where(id => !resolvedIds.Contains(id)).ToArray();
                    var missingMovies = missing.Where(movieIds.Contains)
                        .Select(id => namesById.TryGetValue(id, out var name) ? name : id.ToString("N"))
                        .Take(16).ToArray();
                    var missingSeasons = missing.Count(seasonIds.Contains);
                    var missingSeries = missing.Count(id => seriesIds.Contains(id));
                    groups.Add(new NfoCollectionGroupDiagnostic(entry.Key, expectedMovies, expectedSeries,
                        linkedMovies, linkedSeries, missing.Count(movieIds.Contains), missingSeries, missingMovies,
                        expectedSeasons, linkedSeasons, missingSeasons));
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    canRemove = false;
                    _logger.LogWarning(ex, "MisioFlix could not inspect native BoxSet {Id} for diagnostics", box.Id);
                    groups.Add(new NfoCollectionGroupDiagnostic(entry.Key, expectedMovies, expectedSeries,
                        0, 0, expectedMovies, expectedSeries, entry.Value.Where(movieIds.Contains)
                            .Select(id => namesById.TryGetValue(id, out var name) ? name : id.ToString("N"))
                            .Take(16).ToArray(), expectedSeasons, 0, expectedSeasons));
                }
            }
            var diagnostic = new NfoCollectionSyncDiagnostic(DateTimeOffset.UtcNow, movies.Count, series.Count,
                movieWithNfo, movieWithSets, seriesWithSets, movieWithoutNfo.ToArray(),
                movieWithoutSets.ToArray(), invalidMovieNfo.ToArray(), groups,
                seasons.Count, seasonWithNfo, seasonWithSets, folderWithNfo, genericFolderCount,
                scanned, parsedNfo, movieWithSets + seriesWithSets + seasonWithSets,
                canRemove && missingConfiguredLibraries.Count == 0,
                perLibrary.Values.OrderBy(lib => lib.Name, StringComparer.OrdinalIgnoreCase)
                    .Select(lib => lib.ToReport()).ToArray(), seriesWithNfo);
            lock (_statusLock) _lastDiagnostic = diagnostic;

            // An incomplete scan may be a temporarily detached volume. Preserve
            // old cached snapshots as evidence; do not erase them on that run.
            if (canRemove)
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

    // Only explicit NFO files identify a generic Folder as media. This avoids
    // guessing from folder names, NFO tags, or Jellyfin display metadata.
    private static (string? Path, string? Kind) CandidateNfoPath(string? mediaPath, BaseItemKind type)
    {
        var directory = MediaDirectory(mediaPath);
        if (string.IsNullOrWhiteSpace(directory)) return (null, null);
        try
        {
            if (type == BaseItemKind.Season) return (FindNfoIgnoringCase(directory, "season.nfo"), "season");
            if (type == BaseItemKind.Series) return (NfoPath(mediaPath, true), "series");
            if (type == BaseItemKind.Movie) return (NfoPath(mediaPath, false), "movie");
            if (type != BaseItemKind.Folder) return (null, null);
            var tv = FindNfoIgnoringCase(directory, "tvshow.nfo");
            if (tv is not null) return (tv, "series");
            var film = FindNfoIgnoringCase(directory, "movie.nfo");
            if (film is not null) return (film, "movie");
            var season = FindNfoIgnoringCase(directory, "season.nfo");
            if (season is not null) return (season, "season");
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or ArgumentException)
        {
            // Missing source path is NOT evidence that an old BoxSet link should be removed.
        }
        return (null, null);
    }

    private static string? NfoPath(string? mediaPath, bool series)
    {
        var directory = MediaDirectory(mediaPath);
        if (string.IsNullOrWhiteSpace(directory)) return null;
        try
        {
            // Linux NAS uses case-sensitive filenames, while movie NFOs may
            // have been generated on Windows (MOVIE.NFO, TvShow.nfo, etc.).
            var preferred = FindNfoIgnoringCase(directory, series ? "tvshow.nfo" : "movie.nfo");
            if (preferred is not null) return preferred;
            if (series) return null;
            return FindNfoIgnoringCase(directory, Path.GetFileNameWithoutExtension(mediaPath) + ".nfo");
        }
        catch (Exception ex) when (ex is ArgumentException or IOException or UnauthorizedAccessException) { return null; }
    }

    private static string? FindNfoIgnoringCase(string directory, string filename)
    {
        var exact = Path.Combine(directory, filename);
        if (File.Exists(exact)) return exact;
        if (!Directory.Exists(directory)) return null;
        // A single exact-name case-insensitive match is safe; never select an
        // arbitrary unrelated NFO in a folder containing several movies.
        var matches = Directory.EnumerateFiles(directory, "*", SearchOption.TopDirectoryOnly)
            .Where(path => string.Equals(Path.GetFileName(path), filename, StringComparison.OrdinalIgnoreCase))
            .Take(2).ToArray();
        return matches.Length == 1 ? matches[0] : null;
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
                              root.Name.LocalName.Equals("tvshow", StringComparison.OrdinalIgnoreCase) ||
                              root.Name.LocalName.Equals("season", StringComparison.OrdinalIgnoreCase)))
            throw new XmlException("NFO must have a movie/tvshow/season root");
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

/// <summary>Admin-only, read-only summary of what the LAST scan found and what Jellyfin has linked.</summary>
public sealed record NfoCollectionSyncDiagnostic(
    DateTimeOffset LastScanUtc, int MoviesScanned, int SeriesScanned,
    int MoviesWithNfo, int MoviesWithSet, int SeriesWithSet,
    IReadOnlyList<string> MoviesWithoutNfoExamples,
    IReadOnlyList<string> MoviesWithoutSetExamples,
    IReadOnlyList<string> InvalidMovieNfoExamples,
    IReadOnlyList<NfoCollectionGroupDiagnostic> Collections,
    int SeasonsScanned = 0, int SeasonsWithNfo = 0, int SeasonsWithSet = 0,
    int FoldersWithNfo = 0, int SkippedGenericFolders = 0,
    int TotalJellyfinItems = 0, int TotalNfoRead = 0, int TotalItemsWithSet = 0,
    bool CompleteScan = false, IReadOnlyList<NfoCollectionLibraryDiagnostic>? Libraries = null,
    int SeriesWithNfo = 0);

public sealed record NfoCollectionLibraryDiagnostic(
    string LibraryId, string Name, int JellyfinItems, int ReadNfo,
    int WithSet, int MissingNfo, int InvalidNfo, bool Complete);

// Internal counter never appears in a user API response until it becomes a report.
internal sealed class NfoCollectionLibraryCounter
{
    public NfoCollectionLibraryCounter(string id, string name) { Id = id; Name = name; }
    public string Id { get; }
    public string Name { get; }
    public int FoundItems { get; set; }
    public int NfoRead { get; set; }
    public int WithSet { get; set; }
    public int MissingNfo { get; set; }
    public int InvalidNfo { get; set; }
    public bool Complete { get; set; } = true;
    public NfoCollectionLibraryDiagnostic ToReport() =>
        new(Id, Name, FoundItems, NfoRead, WithSet, MissingNfo, InvalidNfo, Complete);
}

public sealed record NfoCollectionGroupDiagnostic(
    string Name, int ExpectedMovies, int ExpectedSeries,
    int ActualMovies, int ActualSeries, int MissingMovieCount,
    int MissingSeriesCount, IReadOnlyList<string> MissingMovieNames,
    int ExpectedSeasons = 0, int ActualSeasons = 0, int MissingSeasonCount = 0);
