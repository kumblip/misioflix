using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;
using Jellyfin.Data.Enums;
using MediaBrowser.Controller.Collections;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Library;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// Additive, read-only NFO to native Jellyfin BoxSet reconciliation.
/// Supports repeated direct-child set elements in both movie.nfo and tvshow.nfo.
/// Does not rewrite NFO, item SortName, existing collection members or folders.
/// </summary>
public sealed class MisioFlixNfoCollectionsService : BackgroundService
{
    private const int MaxMediaItems = 20000;
    private const int MaxCollectionNames = 500;
    private const int MaxSetsPerItem = 32;
    private readonly ILibraryManager _library;
    private readonly ICollectionManager _collections;
    private readonly ILogger<MisioFlixNfoCollectionsService> _logger;
    private readonly SemaphoreSlim _runGate = new(1, 1);
    private readonly object _statusLock = new();
    private NfoCollectionSyncStatus _last = new(false, null, 0, 0, 0, 0, 0, null);

    public MisioFlixNfoCollectionsService(ILibraryManager library, ICollectionManager collections,
        ILogger<MisioFlixNfoCollectionsService> logger)
    {
        _library = library;
        _collections = collections;
        _logger = logger;
    }

    public NfoCollectionSyncStatus Status
    {
        get { lock (_statusLock) return _last; }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let Jellyfin mount its libraries and complete startup before scanning.
        try { await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken).ConfigureAwait(false); }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
        while (!stoppingToken.IsCancellationRequested)
        {
            if (Plugin.Instance?.Configuration.Enabled == true &&
                Plugin.Instance.Configuration.AutoSyncNfoCollections)
            {
                try { await SynchronizeAsync(stoppingToken).ConfigureAwait(false); }
                catch (InvalidOperationException) { /* Manual scan already in progress. */ }
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
            var scanned = 0;
            var nfoFound = 0;
            var invalidNfo = 0;
            var created = 0;
            var added = 0;
            var desired = new Dictionary<string, HashSet<Guid>>(StringComparer.OrdinalIgnoreCase);
            // Only registered Jellyfin movies and ROOT series, never files or seasons by guessing names.
            var items = _library.GetItemList(new InternalItemsQuery
            {
                IncludeItemTypes = new[] { BaseItemKind.Movie, BaseItemKind.Series },
                Recursive = true,
                Limit = MaxMediaItems,
                EnableTotalRecordCount = false
            });
            foreach (var item in items)
            {
                cancellationToken.ThrowIfCancellationRequested();
                scanned++;
                var nfo = NfoPath(item.Path, item.GetBaseItemKind() == BaseItemKind.Series);
                if (nfo is null) continue;
                nfoFound++;
                IReadOnlyList<string> sets;
                try { sets = ReadSetTags(nfo); }
                catch (Exception ex) when (ex is XmlException or IOException or UnauthorizedAccessException)
                {
                    invalidNfo++;
                    _logger.LogWarning("MisioFlix NFO collection parsing skipped invalid XML for item {ItemId} ({ErrorType})", item.Id, ex.GetType().Name);
                    continue;
                }
                foreach (var name in sets)
                {
                    if (desired.Count >= MaxCollectionNames && !desired.ContainsKey(name)) continue;
                    if (!desired.TryGetValue(name, out var ids)) desired[name] = ids = new HashSet<Guid>();
                    ids.Add(item.Id);
                }
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
                try
                {
                    if (!existing.TryGetValue(entry.Key, out var box))
                    {
                        // CollectionCreationOptions.ItemIdList is the native Jellyfin API:
                        // it creates the BoxSet and its initial members in one operation.
                        box = await _collections.CreateCollectionAsync(new CollectionCreationOptions
                        {
                            Name = entry.Key,
                            ItemIdList = entry.Value.Select(id => id.ToString("N")).ToArray()
                        }).ConfigureAwait(false);
                        existing[entry.Key] = box;
                        created++;
                        added += entry.Value.Count;
                    }
                    else
                    {
                        var missing = entry.Value.Where(id => !box.ContainsLinkedChildByItemId(id)).ToArray();
                        if (missing.Length == 0) continue;
                        await _collections.AddToCollectionAsync(box.Id, missing).ConfigureAwait(false);
                        added += missing.Length;
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "MisioFlix failed to reconcile collection {CollectionName}", entry.Key);
                    invalidNfo++;
                }
            }
            var finished = new NfoCollectionSyncStatus(false, DateTimeOffset.UtcNow,
                scanned, nfoFound, desired.Count, created, added,
                invalidNfo > 0 ? $"Pominięto {invalidNfo} niepoprawnych plików NFO lub operacji kolekcji." : null);
            lock (_statusLock) _last = finished;
            _logger.LogInformation("MisioFlix NFO collections: {Media} media, {Sets} sets, {Created} new BoxSets, {Added} memberships",
                scanned, desired.Count, created, added);
            return finished;
        }
        catch (Exception ex)
        {
            lock (_statusLock) _last = _last with
            {
                Running = false,
                LastRunUtc = DateTimeOffset.UtcNow,
                Error = ex is OperationCanceledException ? "Przerwano synchronizację." : ex.GetType().Name
            };
            throw;
        }
        finally { _runGate.Release(); }
    }

    private static string? NfoPath(string? mediaPath, bool series)
    {
        if (string.IsNullOrWhiteSpace(mediaPath)) return null;
        try
        {
            var directory = Directory.Exists(mediaPath) ? mediaPath : Path.GetDirectoryName(mediaPath);
            if (string.IsNullOrWhiteSpace(directory)) return null;
            var preferred = Path.Combine(directory, series ? "tvshow.nfo" : "movie.nfo");
            if (File.Exists(preferred)) return preferred;
            if (series) return null;
            // Jellyfin also allows <movie filename>.nfo for stand-alone movie files.
            var filename = Path.Combine(directory, Path.GetFileNameWithoutExtension(mediaPath) + ".nfo");
            return File.Exists(filename) ? filename : null;
        }
        catch (Exception ex) when (ex is ArgumentException or IOException or UnauthorizedAccessException)
        { return null; }
    }

    /// <summary>Pure parser: only immediate children of movie/tvshow; no nested actor/other fields.</summary>
    internal static IReadOnlyList<string> ReadSetTags(string path)
    {
        var settings = new XmlReaderSettings
        {
            DtdProcessing = DtdProcessing.Prohibit,
            XmlResolver = null,
            MaxCharactersInDocument = 2_000_000,
            IgnoreComments = true
        };
        using var reader = XmlReader.Create(path, settings);
        var document = XDocument.Load(reader);
        var root = document.Root;
        if (root is null || !(root.Name.LocalName.Equals("movie", StringComparison.OrdinalIgnoreCase) ||
                              root.Name.LocalName.Equals("tvshow", StringComparison.OrdinalIgnoreCase)))
            return Array.Empty<string>();
        return root.Elements()
            .Where(element => element.Name.LocalName.Equals("set", StringComparison.OrdinalIgnoreCase))
            .Select(element => NormalizeName(element.Value))
            .Where(name => name is not null)
            .Select(name => name!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(MaxSetsPerItem)
            .ToArray();
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
    int AddedMemberships, string? Error);
