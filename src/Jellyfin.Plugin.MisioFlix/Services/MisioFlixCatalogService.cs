using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using MediaBrowser.Controller.Collections;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Common.Configuration;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Http;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// Uses Jellyfin's OWN authenticated /Items API to determine what each caller may see.
/// Only then looks up the matching Jellyfin BaseItem.Path to read anime NFO.
/// No bulk filesystem listing and no NFO write operation.
/// </summary>
public sealed class MisioFlixCatalogService
{
    private readonly HttpClient _client;
    private readonly ILibraryManager _library;
    private readonly ICollectionManager _collections;
    private readonly IUserManager _users;
    // Only successfully parsed NFO is cached, and only while file metadata is unchanged.
    // No user state, access tokens, watched statuses or collection memberships live here.
    private static readonly ConcurrentDictionary<string, NfoCacheEntry> ParsedNfoCache = new(
        OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);
    private readonly string _hiddenResumePath;
    private readonly string _removedResumePath;
    private readonly string _languageFlagsPath;
    private static readonly SemaphoreSlim HiddenGate = new(1, 1);

    public MisioFlixCatalogService(HttpClient client, ILibraryManager library, IApplicationPaths applicationPaths,
        ICollectionManager collections, IUserManager users)
    {
        _client = client;
        _library = library;
        _collections = collections;
        _users = users;
        // Separate JSON state, never the Jellyfin database, media or NFO files.
        _hiddenResumePath = Path.Combine(applicationPaths.DataPath, "misioflix", "hidden-resume.json");
        _removedResumePath = Path.Combine(applicationPaths.DataPath, "misioflix", "removed-resume.json");
        _languageFlagsPath = Path.Combine(applicationPaths.DataPath, "misioflix", "language-flags-index.json");
    }

    public async Task<CatalogResponse> ReadForAuthenticatedUserAsync(HttpRequest caller, CancellationToken cancel, Guid? libraryId = null)
    {
        var auth = caller.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(auth))
        {
            throw new UnauthorizedAccessException("Missing Jellyfin Authorization header");
        }

        var config = Plugin.Instance?.Configuration
            ?? throw new InvalidOperationException("MisioFlix is not initialized");
        var origin = new Uri(config.JellyfinLoopbackUrl.TrimEnd('/') + "/", UriKind.Absolute);
        if (origin.Scheme != Uri.UriSchemeHttp ||
            (origin.Host != "localhost" && origin.Host != "127.0.0.1" && origin.Host != "::1"))
        {
            throw new InvalidOperationException("JellyfinLoopbackUrl must be HTTP loopback");
        }

        using var me = await GetJsonAsync(origin, "Users/Me", auth, cancel).ConfigureAwait(false);
        var userId = Text(Get(me.RootElement, "Id"));
        if (!Guid.TryParse(userId, out _))
        {
            throw new UnauthorizedAccessException("Jellyfin did not recognize the caller");
        }

        // Load the existing, administrator-refreshed language index once.
        // Absolutely no media stream probing or disk writes happen here.
        await EnsureLanguageIndexAsync(cancel).ConfigureAwait(false);

        // An optional library scope is accepted only when visible to the caller.
        // Include mixed Jellyfin Folder items ONLY for an explicitly anime-scoped
        // catalogue, never for the global movie/series search.
        // Use the same currently visible library IDs and administrator roles as
        // the Home carousels. Media paths may lag behind a Jellyfin folder rename.
        var allowed = await GetHomeLibrariesAsync(origin, auth, userId, cancel).ConfigureAwait(false);
        var animeLibraryIds = allowed.Where(view => view.category == "anime")
            .Select(view => view.id).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var includeAnimeFolders = false;
        if (libraryId.HasValue)
        {
            var selected = allowed.FirstOrDefault(view => view.id.Equals(libraryId.Value.ToString("N"), StringComparison.OrdinalIgnoreCase));
            if (selected is null) throw new UnauthorizedAccessException("Requested library is not accessible");
            includeAnimeFolders = selected.category == "anime";
        }
        var result = new List<CatalogItem>();
        const int pageSize = 400;
        // Page through the authenticated result, not an arbitrary item ceiling.
        // Keep only GUIDs as a progress guard; each JSON page is disposed before the next.
        var seen = new HashSet<Guid>();
        var start = 0;
        while (true)
        {
            cancel.ThrowIfCancellationRequested();
            var path = $"Items?UserId={Uri.EscapeDataString(userId)}" +
                       (libraryId.HasValue ? $"&ParentId={libraryId.Value:N}" : string.Empty) +
                       "&Recursive=true&IncludeItemTypes=Movie,Series,Season" +
                       (includeAnimeFolders ? ",Folder" : string.Empty) +
                       "&Fields=Genres,Overview,DateCreated,ChildCount,RecursiveItemCount,ParentId" +
                       "&EnableUserData=true&EnableTotalRecordCount=false" +
                       "&SortBy=SortName&SortOrder=Ascending" +
                       $"&StartIndex={start}&Limit={pageSize}";
            using var doc = await GetJsonAsync(origin, path, auth, cancel).ConfigureAwait(false);
            var items = Get(doc.RootElement, "Items");
            if (items.ValueKind != JsonValueKind.Array)
                throw new HttpRequestException("Jellyfin returned an invalid catalog page.");

            var received = items.GetArrayLength();
            if (received == 0) break;
            var seenBefore = seen.Count;
            foreach (var json in items.EnumerateArray())
            {
                cancel.ThrowIfCancellationRequested();
                var itemId = Text(Get(json, "Id"));
                if (!Guid.TryParse(itemId, out var guid) || !seen.Add(guid)) continue;

                // The GUID originates from the already-authorized /Items result.
                var originalItem = _library.GetItemById(guid);
                if (originalItem is null) continue;
                // Resolve membership through Jellyfin's own physical library mapping, never
                // the display name or a guessed path. These IDs also scope genre proposals.
                var libraryIds = _library.GetCollectionFolders(originalItem)
                    .Select(folder => folder.Id.ToString("N"))
                    .Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                var mediaPath = originalItem.Path;
                // The authoritative membership is the same view ID used by Home.
                // A library rename/move must not reclassify anime as Simkl media.
                var inAnimeLibrary = libraryIds.Any(animeLibraryIds.Contains);
                var animeSource = AnimeSourceForLibraryMembership(libraryIds, mediaPath);
                var isAnime = inAnimeLibrary || animeSource.Length != 0;
                if (inAnimeLibrary && animeSource.Length == 0)
                    animeSource = "both"; // Anime is known, audio type is not: never guess PL.
                var itemType = Text(Get(json, "Type"));
                // Mixed Jellyfin libraries can expose a media root as Type=Folder
                // even though the directory has tvshow.nfo/movie.nfo. Never guess
                // that a generic folder is anime: require actual local media NFO.
                if (itemType == "Folder")
                {
                    if (!isAnime) continue;
                    itemType = AnimeFolderMediaType(mediaPath);
                    if (itemType.Length == 0) continue;
                }
                if (isAnime)
                {
                    var local = ReadNfo(mediaPath, itemType);
                    // Even missing NFO must NEVER fall back to Jellyfin metadata.
                    result.Add(new CatalogItem
                    {
                        id = itemId,
                        library_ids = libraryIds,
                        anime = true,
                        pl_audio = KnownPolishAudio(itemId),
                        pl_subtitles = KnownSubtitles(itemId, "pl"),
                        en_subtitles = KnownSubtitles(itemId, "en"),
                        anime_source = animeSource,
                        type = itemType,
                        // Season -> its Jellyfin Series GUID, never a title-based guess.
                        // The parent still must be present in the user's authorised catalog
                        // before the client may display a parent Series result.
                        parent_series_id = itemType == "Season"
                            ? NormalizeCatalogGuid(Get(json, "SeriesId"), Get(json, "ParentId"))
                            : string.Empty,
                        // Both alternatives come from the same NFO, never from Jellyfin's
                        // potentially unrelated/translated season Name.
                        search_titles = local is null
                            ? new List<string>()
                            : new[] { local.OriginalTitle, local.DisplayTitle }
                                .Where(x => !string.IsNullOrWhiteSpace(x))
                                .Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
                        title = local?.OriginalTitle ?? "Brak tytułu w NFO",
                        year = local?.Year ?? string.Empty,
                        plot = local?.Plot ?? string.Empty,
                        kind = local?.Kind ?? string.Empty,
                        // Use exactly <seasonnumber> in this season.nfo, not a
                        // sequential guess, the TV-season name or Series ChildCount.
                        season_number = itemType == "Season" ? local?.SeasonNumber : null,
                        genres = local?.Genres ?? new List<string>(),
                        has_image = HasPrimaryImage(json),
                        date_added = Text(Get(json, "DateCreated")),
                        progress_percent = Progress(json),
                        // A season does not contain N seasons: Jellyfin ChildCount
                        // is the number of episodes. Only a Series has seasons.
                        season_count = itemType == "Series"
                            ? PositiveInt(Get(json, "ChildCount")) : null,
                        episode_count = PositiveInt(Get(json, "RecursiveItemCount"))
                            ?? (itemType == "Season" ? PositiveInt(Get(json, "ChildCount")) : null),
                        rating = PersonalRating(json),
                        mal_id = local?.MalId,
                        watch_status = WatchStatus(json)
                    });
                }
                else
                {
                    var type = Text(Get(json, "Type"));
                    // Search Seasons/Specials only for anime, where each season has its own NFO.
                    if (type == "Season") continue;
                    result.Add(new CatalogItem
                    {
                        id = itemId,
                        library_ids = libraryIds,
                        anime = false,
                        pl_audio = KnownPolishAudio(itemId),
                        pl_subtitles = KnownSubtitles(itemId, "pl"),
                        en_subtitles = KnownSubtitles(itemId, "en"),
                        type = type,
                        title = Text(Get(json, "Name")),
                        year = Text(Get(json, "ProductionYear")),
                        plot = Text(Get(json, "Overview")),
                        kind = type == "Movie" ? "Film" : "Serial",
                        genres = Strings(Get(json, "Genres")),
                        has_image = HasPrimaryImage(json),
                        date_added = Text(Get(json, "DateCreated")),
                        progress_percent = Progress(json),
                        season_count = type == "Series" ? PositiveInt(Get(json, "ChildCount")) : null,
                        episode_count = type == "Series" ? PositiveInt(Get(json, "RecursiveItemCount")) : null,
                        rating = PersonalRating(json),
                        watch_status = WatchStatus(json)
                    });
                }
            }
            // A non-empty page without new IDs is not a successful end. Fail rather
            // than loop forever or publish a silently incomplete catalog to IndexedDB.
            if (seen.Count == seenBefore)
                throw new HttpRequestException("Jellyfin catalog pagination did not advance.");
            // Advance by the raw page length, including filtered seasons and duplicates.
            // Some servers return fewer than Limit; only an empty page confirms the end.
            start = checked(start + received);
        }

        var animeGenres = result.Where(x => x.anime).SelectMany(x => x.genres)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.CurrentCultureIgnoreCase).ToArray();
        var mediaGenres = result.Where(x => !x.anime).SelectMany(x => x.genres)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.CurrentCultureIgnoreCase).ToArray();
        return new CatalogResponse(result, new GenreSets(animeGenres, mediaGenres));
    }

    // An unknown/incomplete index entry is not proof of original-language audio.
    // This method reads the already loaded in-memory index only (O(1) per item).
    private static bool? KnownPolishAudio(string itemId)
    {
        if (!Guid.TryParse(itemId, out var id) ||
            !LanguageFlagsCache.TryGetValue(id.ToString("N"), out var flags)) return null;
        if (flags.pl is "audio" or "both") return true;
        return flags.partial ? null : false;
    }

    // Read subtitle presence from the SAME durable index as card flags and
    // pl_audio. A partial/unknown entry is not evidence of subtitles.
    private static bool? KnownSubtitles(string itemId, string language)
    {
        if (!Guid.TryParse(itemId, out var id) ||
            !LanguageFlagsCache.TryGetValue(id.ToString("N"), out var flags)) return null;
        var availability = language == "pl" ? flags.pl : flags.en;
        if (availability is "subtitles" or "both") return true;
        return flags.partial ? null : false;
    }

    // Home shelves are small, server-side filtered queries, NEVER a second catalogue scan.
    // User /Views scopes the allowed ParentId to libraries actually visible to the caller.
    public async Task<List<HomeLibrary>> ReadHomeLibrariesAsync(HttpRequest caller, CancellationToken cancel)
    {
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        return await GetHomeLibrariesAsync(origin, auth, userId, cancel).ConfigureAwait(false);
    }

    private async Task<List<HomeLibrary>> GetHomeLibrariesAsync(Uri origin, string auth, string userId, CancellationToken cancel)
    {
        await EnsureLanguageIndexAsync(cancel).ConfigureAwait(false);
        using var doc = await GetJsonAsync(origin, $"Users/{Uri.EscapeDataString(userId)}/Views", auth, cancel).ConfigureAwait(false);
        var views = Get(doc.RootElement, "Items");
        var result = new List<HomeLibrary>();
        if (views.ValueKind != JsonValueKind.Array) return result;
        foreach (var view in views.EnumerateArray())
        {
            var id = Text(Get(view, "Id"));
            if (!Guid.TryParse(id, out var guid)) continue;
            var name = Text(Get(view, "Name"));
            var collection = Text(Get(view, "CollectionType")).ToLowerInvariant();
            // Prefer the explicit admin library-ID classification. Renames do not change IDs.
            // Libraries not yet registered keep the prior naming heuristic until saved.
            var settings = Plugin.Instance?.Configuration;
            var mapped = settings?.LibraryPathsConfigured == true
                ? settings.LibraryPaths?.FirstOrDefault(x =>
                    Guid.TryParse(x.LibraryId, out var mappedId) && mappedId == guid)
                : null;
            var isAnime = mapped is null
                ? (settings?.LibraryPathsConfigured != true && name.Contains("anime", StringComparison.OrdinalIgnoreCase))
                : mapped.Role is "anime_pl" or "anime_eng" or "anime_both";
            // No arbitrary view types, no top-level global search, no special collections.
            var category = isAnime ? "anime" : collection switch
            {
                "movies" => "movies",
                "tvshows" => "series",
                // A Simkl-assigned Jellyfin mixed library can contain both movies and series.
                "mixed" when mapped?.Role is "simkl" or "other" => "mixed",
                "boxsets" => "collections",
                // Every user-visible Jellyfin library gets a Home shelf, even when
                // Jellyfin omits CollectionType (as with Anime PL/ENG after a rename).
                // The admin role changes enrichment/integrations, not discovery.
                _ => "mixed"
            };
            var kind = collection switch
            {
                "movies" => "movies",
                "tvshows" => "tv",
                "boxsets" => "boxsets",
                _ => "mixed"
            };
            var href = $"#/" + kind + $"?topParentId={guid:N}&collectionType={Uri.EscapeDataString(collection)}";
            // The user's home page should be library-specific, not alphabetically mixed.
            // A manual flags-index refresh must also invalidate the browser's
            // persisted recommendation catalog on every client device.
            var revision = (Plugin.Instance?.Configuration?.LibraryPathsRevision ?? string.Empty)
                + ":audio:" + (_languageFlagsUpdatedUtc?.UtcDateTime.Ticks.ToString(CultureInfo.InvariantCulture) ?? "0");
            result.Add(new HomeLibrary(guid.ToString("N"), name, category, href, revision));
        }
        return result;
    }

    // v0.4.90: Membership is read from Jellyfin's real collection manager,
    // not guessed from series names, genres, TMDb tags or other metadata.
    // The same *authenticated* Jellyfin user is used for membership and size.
    // One number is shown per media card; if an item belongs to multiple
    // collections, use the first alphabetical collection for a stable badge.
    private async Task<Dictionary<Guid, (int Count, string Name)>> ReadCollectionMembershipAsync(
        Uri origin, string auth, string userId, IEnumerable<Guid> ids, CancellationToken cancel)
    {
        var result = new Dictionary<Guid, (int Count, string Name)>();
        if (!Guid.TryParse(userId, out var userGuid)) return result;
        var user = _users.GetUserById(userGuid);
        if (user is null) return result;
        var chosen = new Dictionary<Guid, (Guid CollectionId, string Name)>();
        foreach (var itemId in ids.Distinct())
        {
            cancel.ThrowIfCancellationRequested();
            try
            {
                // The manager enforces collection visibility for the authenticated user.
                var boxSet = _collections.GetCollectionsContainingItem(user, itemId)
                    .OrderBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
                    .ThenBy(c => c.Id)
                    .FirstOrDefault();
                if (boxSet is not null) chosen[itemId] = (boxSet.Id, boxSet.Name);
            }
            catch (Exception) when (!cancel.IsCancellationRequested)
            {
                // Bad/legacy BoxSet metadata must never break the user's
                // existing home shelf or the native Jellyfin poster overlays.
            }
        }
        if (chosen.Count == 0) return result;
        // A bounded number of requests; cache counts per user because one BoxSet
        // commonly appears across many home and native library cards.
        var unique = chosen.Values.Select(x => x.CollectionId).Distinct().ToArray();
        // Three concurrent Jellyfin requests MAX, instead of N serial round trips.
        // Counts are fetched afresh every time: no stale collection size or
        // cross-user leakage after editing BoxSets in the native Jellyfin UI.
        using var limiter = new SemaphoreSlim(3, 3);
        var countJobs = unique.Select(async collectionId =>
        {
            await limiter.WaitAsync(cancel).ConfigureAwait(false);
            try
            {
                var path = $"Items?UserId={Uri.EscapeDataString(userId)}" +
                    $"&ParentId={collectionId:N}&Recursive=false&CollapseBoxSetItems=false" +
                    "&EnableTotalRecordCount=true&Limit=1";
                using var doc = await GetJsonAsync(origin, path, auth, cancel).ConfigureAwait(false);
                var total = Get(doc.RootElement, "TotalRecordCount");
                return total.ValueKind == JsonValueKind.Number && total.TryGetInt32(out var size) && size > 0
                    ? (CollectionId: collectionId, Count: size) : (CollectionId: collectionId, Count: 0);
            }
            catch (HttpRequestException)
            {
                // Decorative collection badge must not interrupt home or overlays.
                return (CollectionId: collectionId, Count: 0);
            }
            finally { limiter.Release(); }
        }).ToArray();
        var completed = await Task.WhenAll(countJobs).ConfigureAwait(false);
        var counts = completed.Where(x => x.Count > 0)
            .ToDictionary(x => x.CollectionId, x => x.Count);
        foreach (var (itemId, entry) in chosen)
            if (counts.TryGetValue(entry.CollectionId, out var count) && count > 0)
                result[itemId] = (count, entry.Name);
        return result;
    }

    public async Task<HomeShelfResponse> ReadHomeShelfAsync(HttpRequest caller, Guid libraryId,
        string? mode, int startIndex, int limit, CancellationToken cancel)
    {
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        var views = await GetHomeLibrariesAsync(origin, auth, userId, cancel).ConfigureAwait(false);
        var view = views.FirstOrDefault(v => v.id.Equals(libraryId.ToString("N"), StringComparison.OrdinalIgnoreCase));
        if (view is null) throw new UnauthorizedAccessException("Library is not accessible to this user");
        return await ReadHomeShelfAuthorizedAsync(origin, auth, userId, view, libraryId, mode, startIndex, limit, cancel)
            .ConfigureAwait(false);
    }

    // The same authorization-scoped shelf builder is reused by the batch API;
    // only the caller's /Views lookup is shared, never cached across requests.
    private async Task<HomeShelfResponse> ReadHomeShelfAuthorizedAsync(
        Uri origin, string auth, string userId, HomeLibrary view, Guid libraryId,
        string? mode, int startIndex, int limit, CancellationToken cancel)
    {
        if (startIndex < 0 || startIndex > 40000) throw new ArgumentOutOfRangeException(nameof(startIndex));
        if (limit < 1 || limit > 25) throw new ArgumentOutOfRangeException(nameof(limit));
        var random = string.Equals(mode, "random", StringComparison.OrdinalIgnoreCase);
        const int randomCount = 5;
        var resultLimit = random ? randomCount : limit;
        var collections = view.category == "collections";
        var types = view.category switch
        {
            "movies" => "Movie",
            "series" => "Series",
            _ => "Series,Movie"
        };
        // One common, library-ID-based discovery route for ALL shelves.
        // Match the direct user-visible library contents in native Jellyfin,
        // regardless of whether its role is anime, Simkl or not yet configured.
        // No library-wide scan and no tag inspection are needed to find cards.
        var directScope = $"Items?UserId={Uri.EscapeDataString(userId)}" +
            $"&ParentId={libraryId:N}&Recursive=false&CollapseBoxSetItems=false" +
            $"&SortBy={(random ? "Random" : "DateCreated")}&SortOrder=Descending" +
            "&EnableUserData=true&EnableTotalRecordCount=false" +
            "&Fields=Genres,Overview,DateCreated,ChildCount,RecursiveItemCount" +
            $"&StartIndex={(random ? 0 : startIndex)}&Limit={(random ? 60 : limit + 1)}";
        using var doc = await GetJsonAsync(origin, directScope, auth, cancel).ConfigureAwait(false);
        var items = Get(doc.RootElement, "Items");
        var list = new List<HomeTile>();
        // An authorized Folder can represent a media title in mixed libraries.
        // An actual local tvshow.nfo/movie.nfo is needed only to identify this
        // Folder's media kind; it is NOT a gate for discovering the library.
        var examined = 0;
        void Collect(JsonElement entries)
        {
            examined = 0;
            if (entries.ValueKind != JsonValueKind.Array) return;
            foreach (var item in entries.EnumerateArray())
            {
                if (list.Count >= resultLimit) break;
                examined++;
                var tile = MakeHomeTile(item, view.category)
                    ?? MakeLibraryFolderTile(item, view.category);
                if (tile is not null) list.Add(tile);
            }
        }
        Collect(items);
        var pageCount = items.ValueKind == JsonValueKind.Array ? items.GetArrayLength() : 0;
        // Some libraries expose actual Series/Movie items only recursively.
        // Use the SAME fallback for every library, not an anime-only branch.
        if (!collections && list.Count == 0)
        {
            var recursiveScope = $"Items?UserId={Uri.EscapeDataString(userId)}" +
                $"&ParentId={libraryId:N}&Recursive=true&IncludeItemTypes={types}&CollapseBoxSetItems=false" +
                $"&SortBy={(random ? "Random" : "DateCreated")}&SortOrder=Descending" +
                "&EnableUserData=true&EnableTotalRecordCount=false" +
                "&Fields=Genres,Overview,DateCreated,ChildCount,RecursiveItemCount" +
                $"&StartIndex={(random ? 0 : startIndex)}&Limit={(random ? 60 : limit + 1)}";
            using var recursivePage = await GetJsonAsync(origin, recursiveScope, auth, cancel).ConfigureAwait(false);
            var recursiveItems = Get(recursivePage.RootElement, "Items");
            Collect(recursiveItems);
            pageCount = recursiveItems.ValueKind == JsonValueKind.Array ? recursiveItems.GetArrayLength() : 0;
        }
        // Jellyfin's legacy user-scoped route can expose mixed-folder media
        // that /Items omits. Still restricted to the authenticated user's view.
        if (!collections && list.Count == 0)
        {
            var userFolderScope = $"Users/{Uri.EscapeDataString(userId)}/Items?" +
                $"ParentId={libraryId:N}&Recursive=false&CollapseBoxSetItems=false" +
                $"&SortBy={(random ? "Random" : "DateCreated")}&SortOrder=Descending" +
                "&EnableUserData=true&Fields=Genres,Overview,DateCreated,ChildCount,RecursiveItemCount" +
                $"&StartIndex={(random ? 0 : startIndex)}&Limit={(random ? 60 : limit + 1)}";
            try
            {
                using var userPage = await GetJsonAsync(origin, userFolderScope, auth, cancel).ConfigureAwait(false);
                var userItems = Get(userPage.RootElement, "Items");
                Collect(userItems);
                pageCount = userItems.ValueKind == JsonValueKind.Array ? userItems.GetArrayLength() : 0;
            }
            catch (HttpRequestException ex) when (ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest)
            {
                // Unsupported on some versions; the first routes stay valid.
            }
        }
        if (!collections)
        {
            var membership = await ReadCollectionMembershipAsync(origin, auth, userId,
                list.Where(t => t.type is "Movie" or "Series").Select(t => Guid.Parse(t.id)), cancel).ConfigureAwait(false);
            foreach (var tile in list)
                if (Guid.TryParse(tile.id, out var id) && membership.TryGetValue(id, out var details))
                { tile.memberCollectionCount = details.Count; tile.memberCollectionName = details.Name; }
        }
        // A mixed library can contain non-media folders. Use the actual number
        // of examined Jellyfin items, not the number of emitted cards, to avoid
        // repeating or skipping entries on the next carousel page.
        var hasMore = !random && (pageCount > examined || pageCount >= limit + 1);
        return new HomeShelfResponse(view.id, view.name, random ? "random" : "latest", startIndex, hasMore, list,
            random ? null : startIndex + examined);
    }

    // Initial latest shelves can be loaded in one authorized round trip.
    // No user privileges are cached: authentication and /Views run for every
    // batch request; inaccessible GUIDs are NEVER returned.
    public async Task<List<HomeShelfResponse>> ReadHomeShelvesAsync(
        HttpRequest caller, IReadOnlyList<Guid> libraryIds, CancellationToken cancel)
    {
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        var views = await GetHomeLibrariesAsync(origin, auth, userId, cancel).ConfigureAwait(false);
        var requested = libraryIds.Distinct().Take(12).ToArray();
        var allowed = requested.Select(id => (Id: id, View: views.FirstOrDefault(v =>
                v.id.Equals(id.ToString("N"), StringComparison.OrdinalIgnoreCase))))
            .Where(x => x.View is not null).ToArray();
        using var limiter = new SemaphoreSlim(3, 3); // never flood a small NAS
        var jobs = allowed.Select(async entry =>
        {
            await limiter.WaitAsync(cancel).ConfigureAwait(false);
            try
            {
                return await ReadHomeShelfAuthorizedAsync(origin, auth, userId,
                    entry.View!, entry.Id, "latest", 0, 10, cancel).ConfigureAwait(false);
            }
            finally { limiter.Release(); }
        }).ToArray();
        return (await Task.WhenAll(jobs).ConfigureAwait(false)).ToList();
    }

    // Collections do not need a separate "BoxSets" user-view/library. Jellyfin
    // stores BoxSets globally, even when no corresponding view is present in
    // Users/{id}/Views. Query only user-visible BoxSets; never return folders.
    public async Task<HomeShelfResponse> ReadHomeCollectionsAsync(HttpRequest caller,
        string? mode, int startIndex, int limit, CancellationToken cancel)
    {
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        if (startIndex < 0 || startIndex > 40000) throw new ArgumentOutOfRangeException(nameof(startIndex));
        if (limit < 1 || limit > 25) throw new ArgumentOutOfRangeException(nameof(limit));
        var random = string.Equals(mode, "random", StringComparison.OrdinalIgnoreCase);
        var wanted = random ? 5 : limit;
        // Crucially: NO ParentId. A collections library need not be present
        // in /Views, and ParentId+IncludeItemTypes=BoxSet is buggy in Jellyfin 12.
        var path = $"Items?UserId={Uri.EscapeDataString(userId)}" +
                   "&Recursive=true&IncludeItemTypes=BoxSet&CollapseBoxSetItems=false" +
                   $"&SortBy={(random ? "Random" : "DateCreated")}&SortOrder=Descending" +
                   "&EnableUserData=true&Fields=Genres,Overview,DateCreated,ChildCount" +
                   $"&StartIndex={(random ? 0 : startIndex)}&Limit={(random ? 60 : limit + 1)}";
        using var doc = await GetJsonAsync(origin, path, auth, cancel).ConfigureAwait(false);
        var items = Get(doc.RootElement, "Items");
        var tiles = new List<HomeTile>();
        if (items.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in items.EnumerateArray())
            {
                if (tiles.Count >= wanted) break;
                var tile = MakeHomeTile(item, "collections");
                if (tile is not null) tiles.Add(tile);
            }
        }
        var more = !random && items.ValueKind == JsonValueKind.Array && items.GetArrayLength() > limit;
        return new HomeShelfResponse("collections", "Kolekcje", random ? "random" : "latest", startIndex, more, tiles);
    }

    private HomeTile? MakeHomeTile(JsonElement item, string category)
    {
        var id = Text(Get(item, "Id"));
        if (!Guid.TryParse(id, out var guid)) return null;
        var type = Text(Get(item, "Type"));
        var collection = category == "collections";
        if (collection ? type != "BoxSet" : type != "Series" && type != "Movie") return null;
        var isAnime = category == "anime";
        LocalNfo? nfo = null;
        if (isAnime)
        {
            var local = _library.GetItemById(guid);
            // The authenticated library ID already determines anime membership.
            // A renamed media root must not hide an otherwise valid Jellyfin card.
            if (local is not null) nfo = ReadNfo(local.Path, type);
        }
        var title = isAnime
            ? (!string.IsNullOrWhiteSpace(nfo?.OriginalTitle) ? nfo.OriginalTitle : "Brak tytułu w NFO")
            : Text(Get(item, "Name"));
        return new HomeTile
        {
            id = guid.ToString("N"),
            serverId = Text(Get(item, "ServerId")),
            type = type,
            anime = isAnime,
            title = title,
            year = isAnime ? nfo?.Year ?? "" : Text(Get(item, "ProductionYear")),
            format = isAnime ? nfo?.Kind ?? "" : "",
            description = isAnime ? nfo?.Plot ?? "" : Text(Get(item, "Overview")),
            // Supply the complete authorized genre list for the on-demand info
            // preview. Poster chips still render only the first three in home.js.
            genres = (isAnime ? nfo?.Genres ?? new List<string>() : Strings(Get(item, "Genres"))).ToList(),
            hasPrimary = HasPrimaryImage(item),
            seasons = type == "Series" ? PositiveInt(Get(item, "ChildCount")) : null,
            episodes = type == "Series" ? PositiveInt(Get(item, "RecursiveItemCount")) : null,
            collectionCount = collection ? PositiveInt(Get(item, "ChildCount")) : null,
            userRating = PersonalRating(item),
            watchStatus = WatchStatus(item),
            simklExcluded = isAnime || ((type == "Movie" || type == "Series") &&
                _library.GetItemById(guid) is { } localSimkl && IsSimklAnime(localSimkl,type,item)),
            malId = isAnime ? nfo?.MalId ?? FirstSeasonMalId(_library.GetItemById(guid)?.Path) : null
        };
    }

    // In Jellyfin mixed libraries a tvshow folder may be a generic Folder item.
    // No guessed labels and no raw filesystem scan: one authorized item ID and
    // one trusted NFO file under the administrator-configured anime root.
    private static string AnimeFolderMediaType(string? path)
    {
        if (string.IsNullOrWhiteSpace(path) || !Directory.Exists(path)) return string.Empty;
        if (File.Exists(Path.Combine(path, "tvshow.nfo"))) return "Series";
        if (File.Exists(Path.Combine(path, "movie.nfo"))) return "Movie";
        return string.Empty;
    }

    private HomeTile? MakeLibraryFolderTile(JsonElement item, string category)
    {
        if (Text(Get(item, "Type")) != "Folder") return null;
        if (!Guid.TryParse(Text(Get(item, "Id")), out var id)) return null;
        var local = _library.GetItemById(id);
        if (local is null) return null;
        var type = AnimeFolderMediaType(local.Path);
        if (type.Length == 0) return null; // Never invent a media kind for an arbitrary folder.
        var anime = category == "anime";
        var nfo = anime ? ReadNfo(local.Path, type) : null;
        // The NFO is metadata, not a prerequisite for displaying this folder.
        return new HomeTile
        {
            id = id.ToString("N"),
            serverId = Text(Get(item, "ServerId")),
            type = type,
            anime = anime,
            title = anime ? (!string.IsNullOrWhiteSpace(nfo?.OriginalTitle)
                ? nfo.OriginalTitle : nfo?.DisplayTitle ?? "Brak tytułu w NFO")
                : Text(Get(item, "Name")),
            year = anime ? nfo?.Year ?? "" : Text(Get(item, "ProductionYear")),
            format = anime ? nfo?.Kind ?? "" : "",
            description = anime ? nfo?.Plot ?? "" : Text(Get(item, "Overview")),
            genres = (anime ? nfo?.Genres ?? new List<string>() : Strings(Get(item, "Genres"))).ToList(),
            hasPrimary = HasPrimaryImage(item),
            seasons = type == "Series" ? PositiveInt(Get(item, "ChildCount")) : null,
            episodes = type == "Series" ? PositiveInt(Get(item, "RecursiveItemCount")) : null,
            userRating = PersonalRating(item),
            watchStatus = WatchStatus(item),
            simklExcluded = anime || IsSimklAnime(local, type, item),
            malId = anime ? nfo?.MalId ?? FirstSeasonMalId(local.Path) : null
        };
    }

    // Only returns item IDs already visible through the caller's authenticated
    // Jellyfin Items API. The genre order comes from the caller's own catalog,
    // never a user-supplied filesystem path. This API does not scan the library.
    public async Task<List<HomeTile>> ReadHomeRecommendationCardsAsync(HttpRequest caller,
        string? ids, CancellationToken cancel)
    {
        var requested = (ids ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => Guid.TryParse(x, out _)).Select(Guid.Parse).Distinct().Take(25).ToArray();
        if (requested.Length == 0) return new List<HomeTile>();
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        var path = $"Items?UserId={Uri.EscapeDataString(userId)}" +
            $"&Ids={Uri.EscapeDataString(string.Join(",", requested.Select(x => x.ToString("N"))))}" +
            "&IncludeItemTypes=Movie,Series&Recursive=true&CollapseBoxSetItems=false" +
            "&EnableUserData=true&Fields=Genres,Overview,Tags,ChildCount,RecursiveItemCount" +
            $"&Limit={requested.Length}";
        using var doc = await GetJsonAsync(origin, path, auth, cancel).ConfigureAwait(false);
        var rows = Get(doc.RootElement, "Items");
        if (rows.ValueKind != JsonValueKind.Array) return new List<HomeTile>();
        var allowed = requested.ToHashSet();
        var found = new Dictionary<Guid, HomeTile>();
        foreach (var item in rows.EnumerateArray())
        {
            if (!Guid.TryParse(Text(Get(item, "Id")), out var id) || !allowed.Contains(id)) continue;
            var media = _library.GetItemById(id);
            if (media is null) continue;
            var category = AnimeSource(media.Path).Length != 0 ? "anime" : "movies";
            var tile = MakeHomeTile(item, category);
            if (tile is not null) found[id] = tile;
        }
        if (found.Count != 0)
        {
            var membership = await ReadCollectionMembershipAsync(origin, auth, userId, found.Keys, cancel)
                .ConfigureAwait(false);
            foreach (var (id, info) in membership)
                if (found.TryGetValue(id, out var tile))
                { tile.memberCollectionCount = info.Count; tile.memberCollectionName = info.Name; }
        }
        return requested.Where(found.ContainsKey).Select(id => found[id]).ToList();
    }

    public async Task<HomeResumeResponse> ReadHomeResumeAsync(HttpRequest caller, CancellationToken cancel)
    {
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        var entries = await ReadResumeForAuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        var all = entries.items.Concat(entries.hidden).ToList();
        var cards = new Dictionary<string, HomeTile>(StringComparer.OrdinalIgnoreCase);
        // One bounded Items call per batch, no entire-library lookup or NFO scan.
        for (var i = 0; i < all.Count; i += 80)
        {
            var batch = all.Skip(i).Take(80).Select(e => e.catalog_id).Distinct().ToArray();
            var path = $"Items?UserId={Uri.EscapeDataString(userId)}" +
                       $"&Ids={Uri.EscapeDataString(string.Join(',', batch))}" +
                       "&EnableUserData=true&Fields=Genres,Overview,ChildCount,RecursiveItemCount" +
                       $"&Limit={batch.Length}";
            using var doc = await GetJsonAsync(origin, path, auth, cancel).ConfigureAwait(false);
            var items = Get(doc.RootElement, "Items");
            if (items.ValueKind != JsonValueKind.Array) continue;
            foreach (var json in items.EnumerateArray())
            {
                var id = Text(Get(json, "Id"));
                if (!Guid.TryParse(id, out var guid)) continue;
                var local = _library.GetItemById(guid);
                var category = local is not null && AnimeSource(local.Path).Length > 0 ? "anime" : "movies";
                var tile = MakeHomeTile(json, category);
                if (tile is not null) cards[id] = tile;
            }
        }
        HomeResumeTile? Project(ResumeItem entry)
        {
            if (!cards.TryGetValue(entry.catalog_id, out var tile)) return null;
            return new HomeResumeTile(tile, entry.id, entry.progress_percent,
                entry.season, entry.episode, entry.next_up, entry.position_ticks, entry.resume_type);
        }
        return new HomeResumeResponse(
            entries.items.Select(Project).Where(e => e is not null).Cast<HomeResumeTile>().ToList(),
            entries.hidden.Select(Project).Where(e => e is not null).Cast<HomeResumeTile>().ToList());
    }

    /// <summary>
    /// Small, permission-filtered batch of overlay metadata. Unlike /api/catalog this
    /// never scans the full library. Max 18 items; anime text/genres come ONLY from NFO.
    /// The Jellyfin /Items query with UserId and the caller's own token acts as the
    /// authorisation gate. Item paths/identifiers are never accepted as filesystem paths.
    /// </summary>
    public async Task<List<OverlayInfo>> ReadOverlaysForAuthenticatedUserAsync(
        HttpRequest caller, string? ids, CancellationToken cancel)
    {
        var requested = (ids ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => Guid.TryParse(x, out _))
            .Select(Guid.Parse).Distinct().Take(18).ToList();
        if (requested.Count == 0) return new List<OverlayInfo>();
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        var query = $"Items?UserId={Uri.EscapeDataString(userId)}" +
            $"&Ids={Uri.EscapeDataString(string.Join(",", requested.Select(g => g.ToString("N"))))}" +
            "&Fields=Genres,Overview,Tags,ChildCount,RecursiveItemCount" +
            "&EnableUserData=true&Limit=18";
        using var doc = await GetJsonAsync(origin, query, auth, cancel).ConfigureAwait(false);
        var items = Get(doc.RootElement, "Items");
        var output = new List<OverlayInfo>();
        var mediaIds = new HashSet<Guid>();
        if (items.ValueKind != JsonValueKind.Array) return output;
        var allowedIds = requested.ToHashSet();
        foreach (var item in items.EnumerateArray())
        {
            if (!Guid.TryParse(Text(Get(item,"Id")), out var id) || !allowedIds.Contains(id)) continue;
            var libItem = _library.GetItemById(id);
            if (libItem is null) continue;
            var type = Text(Get(item,"Type"));
            if (type is "Movie" or "Series") mediaIds.Add(id);
            var anime = AnimeSource(libItem.Path).Length > 0;
            // NFO <tag>Anime</tag> is also a hard exclusion from Simkl,
            // even when an item lives outside the configured AnimeRoot.
            var simklExcluded = IsSimklAnime(libItem, type, item);
            var nfo = anime ? ReadNfo(libItem.Path, type) : null;
            // A few Jellyfin 12 item DTOs omit SeriesId/IndexNumber for Season.
            // Use the matching authorized local item, never a guessed title.
            Guid seasonParentId = Guid.Empty;
            int? simklIndex = null;
            // A season's exact Jellyfin parent/index can also be used by the
            // independent, read-only MAL resume-frame decorator. No MAL writes.
            if (type == "Season")
            {
                if (!Guid.TryParse(Text(Get(item,"SeriesId")), out seasonParentId))
                {
                    if (libItem.GetType().GetProperty("SeriesId")?.GetValue(libItem) is Guid parentId)
                        seasonParentId = parentId;
                }
                var rawIndex = Get(item,"IndexNumber");
                if (rawIndex.ValueKind == JsonValueKind.Number)
                    simklIndex = (int)Number(rawIndex);
                else if (libItem.GetType().GetProperty("IndexNumber")?.GetValue(libItem) is int localIndex)
                    simklIndex = localIndex;
                if (simklIndex < 0) simklIndex = null;
            }
            var genres = anime ? (nfo?.Genres ?? new List<string>()) : Strings(Get(item,"Genres"));
            var info = new OverlayInfo
            {
                id = id.ToString("N"),
                anime = anime,
                simklExcluded = simklExcluded,
                year = anime ? (nfo?.Year ?? string.Empty) : Text(Get(item,"ProductionYear")),
                format = anime ? (nfo?.Kind ?? string.Empty) : string.Empty,
                genres = genres.ToList(),
                description = (anime ? (nfo?.Plot ?? string.Empty) : Text(Get(item,"Overview"))).Trim(),
                hasPrimary = HasPrimaryImage(item),
                seasons = type == "Series" ? PositiveInt(Get(item,"ChildCount")) : null,
                // A season contains episodes, not sub-seasons. Return its actual
                // total to the same decorative paw overlay used by series cards.
                // The native pink badge is UNPLAYED count, not total episodes.
                episodes = type == "Series" ? PositiveInt(Get(item,"RecursiveItemCount"))
                    : type == "Season" ? PositiveInt(Get(item,"ChildCount"))
                        ?? PositiveInt(Get(item,"RecursiveItemCount"))
                    : null,
                // Only non-anime seasons: expose Jellyfin's exact parent ID and
                // season index for the independently-styled Simkl resume border.
                // Never infer a season number from a translated/display title.
                simklSeriesId = !simklExcluded && seasonParentId != Guid.Empty ? seasonParentId.ToString("N") : null,
                simklSeasonNumber = !simklExcluded ? simklIndex : null,
                malSeriesId = anime && seasonParentId != Guid.Empty ? seasonParentId.ToString("N") : null,
                malSeasonNumber = anime ? simklIndex : null,
                userRating = PersonalRating(item),
                malId = anime ? nfo?.MalId ?? (type=="Series" ? FirstSeasonMalId(libItem.Path) : null) : null,
                watchStatus = type == "Series" && Get(Get(item,"UserData"),"UnplayedItemCount").ValueKind != JsonValueKind.Number
                    && Get(Get(item,"UserData"),"Played").ValueKind != JsonValueKind.True
                    ? string.Empty : WatchStatus(item)
            };
            output.Add(info);
        }
        var membership = await ReadCollectionMembershipAsync(origin, auth, userId,
            mediaIds, cancel).ConfigureAwait(false);
        foreach (var info in output)
            if (Guid.TryParse(info.id, out var id) && membership.TryGetValue(id, out var details))
            { info.memberCollectionCount = details.Count; info.memberCollectionName = details.Name; }
        return output;
    }

    // v127: durable server-side language index. There is NO TTL and NO polling for
    // media changes. A card performs a small, authenticated visibility check; only
    // previously UNKNOWN items are indexed on first view. The administrator can
    // explicitly rebuild the complete index in MisioFlix settings.
    // Store only availability flags, never file paths, tokens or watched state.
    private static readonly ConcurrentDictionary<string, LanguageFlagInfo> LanguageFlagsCache =
        new(StringComparer.OrdinalIgnoreCase);
    private static readonly SemaphoreSlim LanguageFlagsGate = new(1, 1);
    private static bool _languageFlagsLoaded;
    private static DateTimeOffset? _languageFlagsUpdatedUtc;
    public sealed class LanguageIndexFile
    {
        public int Schema { get; set; } = 2;
        public DateTimeOffset? UpdatedUtc { get; set; }
        public Dictionary<string, LanguageFlagInfo> Items { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    }

    private async Task EnsureLanguageIndexAsync(CancellationToken cancel)
    {
        if (_languageFlagsLoaded) return;
        await LanguageFlagsGate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            if (_languageFlagsLoaded) return;
            try
            {
                if (File.Exists(_languageFlagsPath))
                {
                    await using var source = File.OpenRead(_languageFlagsPath);
                    var disk = await JsonSerializer.DeserializeAsync<LanguageIndexFile>(source, cancellationToken:cancel)
                        .ConfigureAwait(false);
                    if (disk?.Schema == 2 && disk.Items is not null)
                    {
                        foreach (var (key, value) in disk.Items)
                            if (Guid.TryParse(key, out _) && value is not null) LanguageFlagsCache[key] = value;
                        _languageFlagsUpdatedUtc = disk.UpdatedUtc;
                    }
                }
            }
            catch (Exception e) when (e is IOException or JsonException or UnauthorizedAccessException)
            {
                // Corrupt/inaccessible index must not break the existing Jellyfin UI.
                // Keep the in-memory results; do not automatically overwrite the file.
                _languageFlagsUpdatedUtc = null;
            }
            _languageFlagsLoaded = true;
        }
        finally { LanguageFlagsGate.Release(); }
    }

    private async Task SaveLanguageIndexUnderGateAsync(CancellationToken cancel,
        Dictionary<string, LanguageFlagInfo>? replacing = null, DateTimeOffset? refreshedUtc = null)
    {
        var folder = Path.GetDirectoryName(_languageFlagsPath)!;
        Directory.CreateDirectory(folder);
        var temporary = _languageFlagsPath + ".tmp-" + Guid.NewGuid().ToString("N");
        try
        {
            await using (var output = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None,
                65536, useAsync:true))
            {
                var index = new LanguageIndexFile
                {
                    UpdatedUtc = refreshedUtc ?? _languageFlagsUpdatedUtc,
                    Items = replacing ?? LanguageFlagsCache.ToDictionary(entry=>entry.Key, entry=>entry.Value,
                        StringComparer.OrdinalIgnoreCase)
                };
                await JsonSerializer.SerializeAsync(output, index, cancellationToken:cancel).ConfigureAwait(false);
                await output.FlushAsync(cancel).ConfigureAwait(false);
            }
            File.Move(temporary, _languageFlagsPath, overwrite:true);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }

    public async Task<LanguageFlagIndexStatus> ReadLanguageFlagsIndexStatusAsync(CancellationToken cancel)
    {
        await EnsureLanguageIndexAsync(cancel).ConfigureAwait(false);
        return new LanguageFlagIndexStatus(LanguageFlagsCache.Count, _languageFlagsUpdatedUtc);
    }

    public async Task<List<LanguageFlagInfo>> ReadLanguageFlagsForAuthenticatedUserAsync(
        HttpRequest caller, string? ids, CancellationToken cancel)
    {
        var requested = (ids ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => Guid.TryParse(x, out _))
            .Select(Guid.Parse).Distinct().Take(12).ToArray();
        if (requested.Length == 0) return new List<LanguageFlagInfo>();
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        // Always verify permissions for this exact Jellyfin user BEFORE reading a
        // shared cache entry. The lookup itself contains no heavy stream fields.
        using var verified = await GetJsonAsync(origin,
            $"Items?UserId={Uri.EscapeDataString(userId)}" +
            $"&Ids={Uri.EscapeDataString(string.Join(',', requested.Select(x => x.ToString("N"))))}" +
            "&EnableUserData=false&Limit=12", auth, cancel).ConfigureAwait(false);
        var found = Get(verified.RootElement, "Items");
        var output = new List<LanguageFlagInfo>();
        if (found.ValueKind != JsonValueKind.Array) return output;
        await EnsureLanguageIndexAsync(cancel).ConfigureAwait(false);
        var requestedSet = requested.ToHashSet();
        foreach (var item in found.EnumerateArray())
        {
            if (!Guid.TryParse(Text(Get(item, "Id")), out var id) || !requestedSet.Contains(id)) continue;
            var type = Text(Get(item, "Type"));
            if (type is not ("Movie" or "Episode" or "Video" or "Series" or "Season")) continue;
            var key = id.ToString("N");
            // v128: the card endpoint is STRICTLY READ ONLY. It must never start
            // a media/episode scan or rewrite the whole JSON index while posters
            // are loading. Index changes are made ONLY by the admin refresh.
            // An unknown item returns an empty availability object, so the web
            // client can memoize it instead of polling repeatedly on navigation.
            // Authorization was validated above, even for cached objects.
            if (LanguageFlagsCache.TryGetValue(key, out var cached)) output.Add(cached);
            else output.Add(new LanguageFlagInfo(key, null, null, true));
        }
        return output;
    }

    private async Task<LanguageFlagInfo> CalculateLanguageFlagsAsync(Uri origin, string auth,
        string userId, Guid id, string type, CancellationToken cancel)
    {
        var availability = new TrackAvailability();
        var partial = false;
        if (type is "Movie" or "Episode" or "Video")
        {
            using var detailed = await GetJsonAsync(origin,
                $"Items/{id:N}?UserId={Uri.EscapeDataString(userId)}&Fields=MediaSources,MediaStreams",
                auth, cancel).ConfigureAwait(false);
            availability.AddItem(detailed.RootElement, LibraryAudioHint(id));
            partial = !availability.AudioClassificationComplete;
        }
        else
        {
            // Aggregate actual episode streams. Do not decide the language of
            // all episodes merely from the Series/Season's own name.
            const int pageSize = 250;
            const int maxEpisodes = 30000;
            for (var offset = 0; offset < maxEpisodes; offset += pageSize)
            {
                using var page = await GetJsonAsync(origin,
                    $"Items?UserId={Uri.EscapeDataString(userId)}" +
                    $"&ParentId={id:N}&Recursive=true&IncludeItemTypes=Episode" +
                    "&Fields=MediaSources,MediaStreams&EnableUserData=false" +
                    $"&StartIndex={offset}&Limit={pageSize}",auth,cancel).ConfigureAwait(false);
                var episodes=Get(page.RootElement,"Items");
                if (episodes.ValueKind != JsonValueKind.Array) { partial=true; break; }
                foreach (var episode in episodes.EnumerateArray())
                {
                    if (!Guid.TryParse(Text(Get(episode,"Id")),out var episodeId)) continue;
                    var episodeFlags = new TrackAvailability();
                    episodeFlags.AddItem(episode, LibraryAudioHint(episodeId));
                    if (!episodeFlags.SawStreamInfo)
                    {
                        try
                        {
                            using var detail=await GetJsonAsync(origin,
                                $"Items/{episodeId:N}?UserId={Uri.EscapeDataString(userId)}" +
                                "&Fields=MediaSources,MediaStreams",auth,cancel).ConfigureAwait(false);
                            episodeFlags.AddItem(detail.RootElement, LibraryAudioHint(episodeId));
                        }
                        catch (HttpRequestException ex) when (ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest)
                        { partial=true; }
                    }
                    availability.Merge(episodeFlags);
                    if (!episodeFlags.AudioClassificationComplete) partial=true;
                }
                if (episodes.GetArrayLength() < pageSize) break;
                if (offset+pageSize >= maxEpisodes) partial=true;
            }
        }
        return new LanguageFlagInfo(id.ToString("N"), availability.Mode("pl"), availability.Mode("en"), partial);
    }

    // The name comes from the real Jellyfin CollectionFolder(s) containing
    // this exact item. It is not inferred from the title, path or NFO.
    // Where multiple libraries disagree, do not force an audio language.
    private string LibraryAudioHint(Guid itemId)
    {
        var item = _library.GetItemById(itemId);
        if (item is null) return string.Empty;
        try
        {
            var settings = Plugin.Instance?.Configuration;
            var folders = _library.GetCollectionFolders(item).ToArray();
            // Explicit mapping survives library renames and distinguishes single-track audio
            // without relying on an outdated display name.
            if (settings?.LibraryPathsConfigured == true)
            {
                var mapped = folders.Select(folder => (settings.LibraryPaths ?? new())
                    .FirstOrDefault(mapping => Guid.TryParse(mapping.LibraryId, out var libId)
                        && libId == folder.Id))
                    .Where(mapping => mapping is not null)
                    .Select(mapping => mapping!.AudioLanguage switch
                    {
                        "pl" => "pl", "en" => "en",
                        // An anime-pl/eng role already expresses the library default.
                        // Only used for a SINGLE audio track; never invent a second one.
                        _ => mapping.Role switch { "anime_pl" => "pl", "anime_eng" => "en", _ => string.Empty }
                    })
                    .Where(language => language.Length != 0).Distinct().Take(2).ToArray();
                if (mapped.Length == 1) return mapped[0];
                if (mapped.Length > 1) return string.Empty;
            }
            var hints = folders
                .Select(folder=>folder.Name?.Trim() ?? string.Empty)
                .Select(name=>name.EndsWith("PL",StringComparison.OrdinalIgnoreCase) ? "pl" :
                    name.EndsWith("ENG",StringComparison.OrdinalIgnoreCase) ? "en" : "")
                .Where(x=>x.Length!=0).Distinct(StringComparer.Ordinal).Take(2).ToArray();
            return hints.Length==1 ? hints[0] : string.Empty;
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        { return string.Empty; }
    }

    // Run ONLY on explicit admin click. Read all visible media and rebuild
    // series/season unions in a single paginated pass; never run on Home mount.
    // Incomplete API responses do not replace a previously valid index.
    public async Task<LanguageFlagIndexStatus> RefreshLanguageFlagsIndexAsync(
        HttpRequest caller, CancellationToken cancel)
    {
        var (origin,auth,userId)=await AuthenticatedUserAsync(caller,cancel).ConfigureAwait(false);
        await EnsureLanguageIndexAsync(cancel).ConfigureAwait(false);
        await LanguageFlagsGate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var fresh = new Dictionary<string, LanguageFlagInfo>(StringComparer.OrdinalIgnoreCase);
            var parents = new Dictionary<string, TrackAvailability>(StringComparer.OrdinalIgnoreCase);
            var incomplete = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var typed = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var seasonToSeries = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            const int pageSize = 250;
            const int maxItems = 50000;
            var reachedEnd = false;
            for (var offset = 0; offset < maxItems; offset += pageSize)
            {
                cancel.ThrowIfCancellationRequested();
                using var page=await GetJsonAsync(origin,
                    $"Items?UserId={Uri.EscapeDataString(userId)}&Recursive=true" +
                    "&IncludeItemTypes=Movie,Video,Series,Season,Episode" +
                    "&Fields=MediaSources,MediaStreams,ParentId,SeriesId" +
                    $"&EnableUserData=false&StartIndex={offset}&Limit={pageSize}",auth,cancel).ConfigureAwait(false);
                var items=Get(page.RootElement,"Items");
                if (items.ValueKind != JsonValueKind.Array)
                    throw new InvalidOperationException("Jellyfin zwrócił niepełną listę mediów.");
                foreach (var item in items.EnumerateArray())
                {
                    if (!Guid.TryParse(Text(Get(item,"Id")),out var id)) continue;
                    var idText = id.ToString("N");
                    var type=Text(Get(item,"Type"));
                    if (type is not ("Movie" or "Video" or "Series" or "Season" or "Episode")) continue;
                    typed[idText]=type;
                    if (type is "Series" or "Season")
                    {
                        parents.TryAdd(idText,new TrackAvailability());
                        if (type=="Season")
                        {
                            // Some Jellyfin Episode DTOs provide only SeasonId/ParentId.
                            // Use the Season's actual authorized SeriesId/ParentId to
                            // propagate verified episode flags up to its Series.
                            var rawParent=Text(Get(item,"SeriesId"));
                            if (!Guid.TryParse(rawParent,out var sid))
                                Guid.TryParse(Text(Get(item,"ParentId")),out sid);
                            if (sid!=Guid.Empty) seasonToSeries[idText]=sid.ToString("N");
                        }
                        continue;
                    }
                    var flags=new TrackAvailability();
                    flags.AddItem(item,LibraryAudioHint(id));
                    if (!flags.SawStreamInfo)
                    {
                        // Some Jellyfin installations omit streams from lists.
                        // The manual refresh may issue a detail request for such an item.
                        try
                        {
                            using var detail=await GetJsonAsync(origin,
                                $"Items/{id:N}?UserId={Uri.EscapeDataString(userId)}"+
                                "&Fields=MediaSources,MediaStreams",auth,cancel).ConfigureAwait(false);
                            flags.AddItem(detail.RootElement,LibraryAudioHint(id));
                        }
                        catch (HttpRequestException ex) when (ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest)
                        { /* No invented tracks for inaccessible/unreadable files. */ }
                    }
                    fresh[idText]=new LanguageFlagInfo(idText,flags.Mode("pl"),flags.Mode("en"),!flags.AudioClassificationComplete);
                    if (type=="Episode")
                    {
                        foreach (var parentKey in new[] {Text(Get(item,"ParentId")),Text(Get(item,"SeasonId")),Text(Get(item,"SeriesId"))})
                        {
                            if (!Guid.TryParse(parentKey,out var pid)) continue;
                            var key=pid.ToString("N");
                            if (!parents.TryGetValue(key,out var union)) parents[key]=union=new TrackAvailability();
                            union.Merge(flags);
                            if (!flags.AudioClassificationComplete) incomplete.Add(key);
                        }
                    }
                }
                if (items.GetArrayLength()<pageSize) { reachedEnd=true; break; }
            }
            if (!reachedEnd) throw new InvalidOperationException("Zbyt wiele plików w bibliotece — nie zastąpiono bazy niepełnymi danymi.");
            foreach (var (seasonId,seriesId) in seasonToSeries)
            {
                if (!parents.TryGetValue(seasonId,out var seasonFlags)) continue;
                if (!parents.TryGetValue(seriesId,out var seriesFlags))
                    parents[seriesId]=seriesFlags=new TrackAvailability();
                seriesFlags.Merge(seasonFlags); // Boolean union; duplicate Episode.SeriesId is harmless.
                if (incomplete.Contains(seasonId)) incomplete.Add(seriesId);
            }
            foreach (var (key,type) in typed)
            {
                if (type is not ("Season" or "Series")) continue;
                if (!parents.TryGetValue(key,out var union)) union=new TrackAvailability();
                fresh[key]=new LanguageFlagInfo(key,union.Mode("pl"),union.Mode("en"),
                    incomplete.Contains(key) || !union.AudioClassificationComplete);
            }
            // One atomic commit only after the COMPLETE scan succeeded.
            var refreshedUtc=DateTimeOffset.UtcNow;
            await SaveLanguageIndexUnderGateAsync(cancel,fresh,refreshedUtc).ConfigureAwait(false);
            LanguageFlagsCache.Clear();
            foreach (var (id,flags) in fresh) LanguageFlagsCache[id]=flags;
            _languageFlagsUpdatedUtc=refreshedUtc;
            return new LanguageFlagIndexStatus(LanguageFlagsCache.Count,_languageFlagsUpdatedUtc);
        }
        finally { LanguageFlagsGate.Release(); }
    }

    private sealed class TrackAvailability
    {
        private bool _plAudio,_plSubs,_enAudio,_enSubs;
        private bool _sawAudioTrack, _unclassifiedAudio;
        public bool SawStreamInfo { get; private set; }
        // An empty stream list or undecipherable audio language is NOT
        // confirmation that Polish audio is absent.
        public bool AudioClassificationComplete => _sawAudioTrack && !_unclassifiedAudio;
        public string? Mode(string language)
        {
            var audio=language=="pl" ? _plAudio : _enAudio;
            var subs=language=="pl" ? _plSubs : _enSubs;
            return audio && subs ? "both" : audio ? "audio" : subs ? "subtitles" : null;
        }
        public void Merge(TrackAvailability other)
        {
            _plAudio |= other._plAudio; _enAudio |= other._enAudio;
            _plSubs |= other._plSubs; _enSubs |= other._enSubs;
            SawStreamInfo |= other.SawStreamInfo;
            _sawAudioTrack |= other._sawAudioTrack;
            _unclassifiedAudio |= other._unclassifiedAudio;
        }
        public void AddItem(JsonElement item,string libraryHint)
        {
            // Versions may each carry their own streams. Use MediaSources first
            // and the item-level stream list only when source streams are absent.
            var sources=Get(item,"MediaSources");
            var hadSourceStreams=false;
            if (sources.ValueKind==JsonValueKind.Array)
                foreach (var source in sources.EnumerateArray())
                {
                    var tracks=Get(source,"MediaStreams");
                    if (tracks.ValueKind!=JsonValueKind.Array) continue;
                    hadSourceStreams=true;
                    AddStreams(tracks,libraryHint);
                }
            if (!hadSourceStreams) AddStreams(Get(item,"MediaStreams"),libraryHint);
        }
        private void AddStreams(JsonElement streams,string libraryHint)
        {
            if (streams.ValueKind!=JsonValueKind.Array) return;
            SawStreamInfo=true;
            var audioTracks=streams.EnumerateArray().Where(e=>Text(Get(e,"Type"))=="Audio").ToArray();
            foreach (var stream in streams.EnumerateArray())
            {
                var type=Text(Get(stream,"Type"));
                if (type is not ("Audio" or "Subtitle")) continue;
                var lang=type=="Audio" && audioTracks.Length==1 && libraryHint.Length>0
                    ? libraryHint : LanguageOf(stream);
                if (type=="Audio")
                {
                    _sawAudioTrack=true;
                    if (lang.Length==0) _unclassifiedAudio=true;
                }
                if (lang=="pl")
                { if (type=="Audio") _plAudio=true; else _plSubs=true; }
                else if (lang=="en")
                { if (type=="Audio") _enAudio=true; else _enSubs=true; }
            }
        }
        private static string LanguageOf(JsonElement stream)
        {
            var specified=Text(Get(stream,"Language"));
            if (!string.IsNullOrWhiteSpace(specified))
            {
                var resolved=NormalizeLanguage(specified);
                if (resolved.Length!=0) return resolved;
                if (specified.Trim().ToLowerInvariant() is not ("und" or "unk" or "unknown"))
                {
                    // A standard non-PL/non-EN language tag (ja/jpn/deu/etc.)
                    // is known non-Polish; an unparseable free-form value is not.
                    var tag = specified.Trim();
                    if (tag.Length is >= 2 and <= 12 && tag.All(c => char.IsLetter(c) || c == '-'))
                        return "other";
                    return string.Empty;
                }
            }
            foreach (var key in new[]{"DisplayLanguage","Title","DisplayTitle"})
            {
                var parsed=NormalizeLanguage(Text(Get(stream,key)));
                if (parsed.Length!=0) return parsed;
            }
            return string.Empty;
        }
        private static string NormalizeLanguage(string? raw)
        {
            var value=(raw??string.Empty).Trim().ToLowerInvariant().Replace('_','-');
            if (value is "pl" or "pol" or "polish" or "polski" ||
                value.StartsWith("pl-",StringComparison.Ordinal) ||
                value.StartsWith("pol-",StringComparison.Ordinal) ||
                value.StartsWith("polish ",StringComparison.Ordinal) ||
                value.StartsWith("polski ",StringComparison.Ordinal)) return "pl";
            if (value is "en" or "eng" or "english" or "angielski" ||
                value.StartsWith("en-",StringComparison.Ordinal) ||
                value.StartsWith("eng-",StringComparison.Ordinal) ||
                value.StartsWith("english ",StringComparison.Ordinal) ||
                value.StartsWith("angielski ",StringComparison.Ordinal)) return "en";
            return string.Empty;
        }
    }

    /// <summary>
    /// Playback items are resolved via the current Jellyfin Resume and NextUp endpoints.
    /// Text/genre metadata still comes only from the authorised catalogue / anime NFO.
    /// Hidden entries are per user and never alter Jellyfin's playback history.
    /// </summary>
    public async Task<ResumeResponse> ReadResumeForAuthenticatedUserAsync(HttpRequest caller, CancellationToken cancel)
    {
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        var result = new List<ResumeItem>();
        var byCatalog = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Jellyfin 12 uses UserItems/Resume. The older endpoint is a fallback for installations
        // still exposing it. Paginate so that the banner is NOT limited to 12 or 3 entries.
        try
        {
            await ReadResumePages("UserItems/Resume", origin, auth, userId, result, byCatalog, cancel).ConfigureAwait(false);
        }
        catch (HttpRequestException e) when (e.StatusCode == HttpStatusCode.NotFound)
        {
            result.Clear(); byCatalog.Clear();
            await ReadResumePages($"Users/{Uri.EscapeDataString(userId)}/Items/Resume", origin,
                auth, userId, result, byCatalog, cancel).ConfigureAwait(false);
        }

        // Some Jellyfin builds may return an empty Resume response despite
        // resumable user-data positions. Query the regular, user-scoped Items API
        // only in this case; do not double-scan on successful Resume requests.
        if (result.Count == 0)
        {
            try
            {
                using var fallback = await GetJsonAsync(origin,
                    $"Items?UserId={Uri.EscapeDataString(userId)}" +
                    "&Recursive=true&Filters=IsResumable&IncludeItemTypes=Movie,Episode" +
                    "&MediaTypes=Video&EnableUserData=true&Limit=100&SortBy=DatePlayed" +
                    "&SortOrder=Descending", auth, cancel).ConfigureAwait(false);
                var candidates = Get(fallback.RootElement, "Items");
                if (candidates.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in candidates.EnumerateArray())
                    {
                        var entry = ToResumeItem(item, isNextUp: false);
                        if (entry is not null && byCatalog.Add(entry.catalog_id)) result.Add(entry);
                    }
                }
            }
            catch (HttpRequestException e) when (e.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest)
            {
                // A server without the fallback route still gets native NextUp.
            }
        }

        // Shows/NextUp also contains serials between episodes where no specific episode
        // has a resumable position. Resume entries take precedence for each series.
        try
        {
            const int batchSize = 200;
            for (var offset = 0; offset < 3000; offset += batchSize)
            {
                using var doc = await GetJsonAsync(origin,
                    $"Shows/NextUp?UserId={Uri.EscapeDataString(userId)}&StartIndex={offset}&Limit={batchSize}&EnableUserData=true",
                    auth, cancel).ConfigureAwait(false);
                var items = Get(doc.RootElement, "Items");
                if (items.ValueKind != JsonValueKind.Array) break;
                var received = 0;
                foreach (var item in items.EnumerateArray())
                {
                    received++;
                    var entry = ToResumeItem(item, isNextUp: true);
                    if (entry is not null && byCatalog.Add(entry.catalog_id)) result.Add(entry);
                }
                if (received < batchSize) break;
            }
        }
        catch (HttpRequestException e) when (e.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest)
        {
            // Do not break the resumable movie list if the NextUp route is unavailable.
        }

        var hidden = await ReadHiddenForUserAsync(userId, cancel).ConfigureAwait(false);
        var removed = await ReadRemovedForUserAsync(userId, cancel).ConfigureAwait(false);
        // A removed series stays out even when other unfinished episodes exist.
        // A genuinely NEW playback later than the removal date can re-add it.
        static string NormalizedId(string value) => Guid.TryParse(value, out var parsed)
            ? parsed.ToString("N") : value;
        var hiddenKeys = new HashSet<string>(hidden.Select(NormalizedId), StringComparer.OrdinalIgnoreCase);
        result = result.Where(x => !removed.TryGetValue(NormalizedId(x.catalog_id), out var state)
            || (DateTimeOffset.TryParse(x.last_played, out var latest)
                && latest.ToUniversalTime() > state.removedAtUtc)).ToList();
        return new ResumeResponse(result.Where(x => !hiddenKeys.Contains(NormalizedId(x.catalog_id))).ToList(),
            result.Where(x => hiddenKeys.Contains(NormalizedId(x.catalog_id))).ToList());
    }

    public async Task HideResumeForAuthenticatedUserAsync(HttpRequest caller, Guid catalogId,
        bool hide, CancellationToken cancel)
    {
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        // Verify the exact target through Jellyfin's user-scoped API, without a
        // costly full catalogue scan on every dismissal or restoration.
        using (var result = await GetJsonAsync(origin,
            $"Items?UserId={Uri.EscapeDataString(userId)}&Ids={catalogId:N}&Limit=1",
            auth, cancel).ConfigureAwait(false))
        {
            var found = Get(result.RootElement, "Items");
            if (found.ValueKind != JsonValueKind.Array ||
                !found.EnumerateArray().Any(x =>
                    Text(Get(x, "Id")).Equals(catalogId.ToString("N"), StringComparison.OrdinalIgnoreCase)))
                throw new UnauthorizedAccessException("Item is not accessible to this user");
        }
        await HiddenGate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var all = await ReadHiddenDocumentAsync(cancel).ConfigureAwait(false);
            if (!all.TryGetValue(userId, out var ids))
                all[userId] = ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (hide) ids.Add(catalogId.ToString());
            else ids.Remove(catalogId.ToString());
            var folder = Path.GetDirectoryName(_hiddenResumePath)!;
            Directory.CreateDirectory(folder);
            var temp = _hiddenResumePath + ".tmp";
            try
            {
                await File.WriteAllTextAsync(temp, JsonSerializer.Serialize(all), cancel).ConfigureAwait(false);
                File.Move(temp, _hiddenResumePath, overwrite: true);
            }
            finally { if (File.Exists(temp)) File.Delete(temp); }
        }
        finally { HiddenGate.Release(); }
    }

    // Remove from the logged-in user's CONTINUE WATCHING, not from the media library.
    // Reset the exact episode/movie resume position; preserve its watch status,
    // play count, favourites, last-played time and personal rating. A separate
    // per-user exclusion handles Jellyfin's NextUp rows with position=0.
    public async Task RemoveResumeForAuthenticatedUserAsync(HttpRequest caller, Guid catalogId,
        Guid resumeId, CancellationToken cancel)
    {
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        using var verified = await GetJsonAsync(origin,
            $"Items?UserId={Uri.EscapeDataString(userId)}&Ids={resumeId:N}&EnableUserData=true&Limit=1",
            auth, cancel).ConfigureAwait(false);
        var allowed = Get(verified.RootElement, "Items");
        if (allowed.ValueKind != JsonValueKind.Array)
            throw new UnauthorizedAccessException("No authorized media item");
        var item = allowed.EnumerateArray().FirstOrDefault();
        if (item.ValueKind != JsonValueKind.Object ||
            !Guid.TryParse(Text(Get(item, "Id")), out var realId) || realId != resumeId)
            throw new UnauthorizedAccessException("Item not accessible");
        var kind = Text(Get(item, "Type"));
        var validParent = Guid.TryParse(Text(Get(item, "SeriesId")), out var seriesGuid) && seriesGuid == catalogId;
        if (!validParent && kind == "Episode")
        {
            var local = _library.GetItemById(resumeId);
            validParent = local?.GetType().GetProperty("SeriesId")?.GetValue(local) is Guid parent
                && parent == catalogId;
        }
        if (!(kind == "Movie" && catalogId == resumeId) && !(kind == "Episode" && validParent))
            throw new UnauthorizedAccessException("Resume target does not match the requested title");

        var route = $"UserItems/{resumeId:N}/UserData?userId={Uri.EscapeDataString(userId)}";
        using (var current = await GetJsonAsync(origin, route, auth, cancel).ConfigureAwait(false))
        {
            var userData = current.RootElement;
            var currentTicks = (long)Number(Get(userData, "PlaybackPositionTicks"));
            var last = Text(Get(userData, "LastPlayedDate"));
            if (currentTicks > 0)
            {
                var props = new Dictionary<string, object?>
                {
                    ["ItemId"] = resumeId,
                    ["Key"] = Text(Get(userData,"Key")),
                    ["Played"] = Get(userData,"Played").ValueKind == JsonValueKind.True,
                    ["PlayCount"] = (int)Number(Get(userData,"PlayCount")),
                    ["PlaybackPositionTicks"] = 0L,
                    ["IsFavorite"] = Get(userData,"IsFavorite").ValueKind == JsonValueKind.True,
                    ["Rating"] = Get(userData,"Rating").ValueKind == JsonValueKind.Number
                        ? Number(Get(userData,"Rating")) : null,
                };
                if (!string.IsNullOrEmpty(last)) props["LastPlayedDate"] = last;
                using var update = new HttpRequestMessage(HttpMethod.Post, new Uri(origin, route));
                update.Headers.TryAddWithoutValidation("Authorization", auth);
                update.Content = new System.Net.Http.StringContent(JsonSerializer.Serialize(props),
                    System.Text.Encoding.UTF8, "application/json");
                using var response = await _client.SendAsync(update, cancel).ConfigureAwait(false);
                if (response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.Unauthorized)
                    throw new UnauthorizedAccessException("Jellyfin refused user data update");
                response.EnsureSuccessStatusCode();
            }
        }
        // Persist after the successful Jellyfin update. Keep state separate from
        // hidden cards: a removed item is not recoverable via "Pokaż ukryte".
        await HiddenGate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var removed = await ReadRemovedDocumentAsync(cancel).ConfigureAwait(false);
            if (!removed.TryGetValue(userId, out var userRemoved))
                removed[userId] = userRemoved = new Dictionary<string, RemovedResume>(StringComparer.OrdinalIgnoreCase);
            userRemoved[catalogId.ToString("N")] = new RemovedResume(resumeId.ToString(), DateTimeOffset.UtcNow);
            var dir = Path.GetDirectoryName(_removedResumePath)!;
            Directory.CreateDirectory(dir);
            var temp = _removedResumePath + ".tmp";
            try
            {
                await File.WriteAllTextAsync(temp, JsonSerializer.Serialize(removed), cancel).ConfigureAwait(false);
                File.Move(temp, _removedResumePath, overwrite:true);
            }
            finally { if (File.Exists(temp)) File.Delete(temp); }
            var hidden = await ReadHiddenDocumentAsync(cancel).ConfigureAwait(false);
            if (hidden.TryGetValue(userId, out var hiddenIds) && hiddenIds.Remove(catalogId.ToString()))
            {
                var tmp = _hiddenResumePath + ".tmp";
                try
                {
                    await File.WriteAllTextAsync(tmp, JsonSerializer.Serialize(hidden), cancel).ConfigureAwait(false);
                    File.Move(tmp, _hiddenResumePath, overwrite:true);
                }
                finally { if (File.Exists(tmp)) File.Delete(tmp); }
            }
        }
        finally { HiddenGate.Release(); }
    }

    public sealed record RemovedResume(string resumeId, DateTimeOffset removedAtUtc);

    private async Task<Dictionary<string, RemovedResume>> ReadRemovedForUserAsync(string userId,
        CancellationToken cancel)
    {
        await HiddenGate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var doc = await ReadRemovedDocumentAsync(cancel).ConfigureAwait(false);
            return doc.TryGetValue(userId, out var items) ? items
                : new Dictionary<string, RemovedResume>(StringComparer.OrdinalIgnoreCase);
        }
        finally { HiddenGate.Release(); }
    }

    private async Task<Dictionary<string, Dictionary<string, RemovedResume>>> ReadRemovedDocumentAsync(
        CancellationToken cancel)
    {
        if (!File.Exists(_removedResumePath))
            return new Dictionary<string, Dictionary<string, RemovedResume>>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var json = await File.ReadAllTextAsync(_removedResumePath, cancel).ConfigureAwait(false);
            return JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, RemovedResume>>>(json)
                ?? new Dictionary<string, Dictionary<string, RemovedResume>>(StringComparer.OrdinalIgnoreCase);
        }
        catch (JsonException) { return new(StringComparer.OrdinalIgnoreCase); }
        catch (IOException) { return new(StringComparer.OrdinalIgnoreCase); }
    }

    private async Task<HashSet<string>> ReadHiddenForUserAsync(string userId, CancellationToken cancel)
    {
        await HiddenGate.WaitAsync(cancel).ConfigureAwait(false);
        try
        {
            var doc = await ReadHiddenDocumentAsync(cancel).ConfigureAwait(false);
            return doc.TryGetValue(userId, out var ids) ? ids : new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }
        finally { HiddenGate.Release(); }
    }

    private async Task<Dictionary<string, HashSet<string>>> ReadHiddenDocumentAsync(CancellationToken cancel)
    {
        if (!File.Exists(_hiddenResumePath)) return new(StringComparer.OrdinalIgnoreCase);
        try
        {
            var json = await File.ReadAllTextAsync(_hiddenResumePath, cancel).ConfigureAwait(false);
            return JsonSerializer.Deserialize<Dictionary<string, HashSet<string>>>(json)
                ?? new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        }
        catch (JsonException) { return new(StringComparer.OrdinalIgnoreCase); }
        catch (IOException) { return new(StringComparer.OrdinalIgnoreCase); }
    }

    private async Task ReadResumePages(string route, Uri origin, string auth, string userId,
        List<ResumeItem> result, HashSet<string> byCatalog, CancellationToken cancel)
    {
        const int batchSize = 200;
        for (var offset = 0; offset < 3000; offset += batchSize)
        {
            // Recursive is required when retrieving resumed episodes from nested
            // television/Anime folders. Return per-user watch state in the DTO.
            var path = $"{route}?UserId={Uri.EscapeDataString(userId)}&MediaTypes=Video" +
                       $"&Recursive=true&IncludeItemTypes=Movie,Episode" +
                       $"&StartIndex={offset}&Limit={batchSize}&EnableUserData=true";
            using var doc = await GetJsonAsync(origin, path, auth, cancel).ConfigureAwait(false);
            var items = Get(doc.RootElement, "Items");
            if (items.ValueKind != JsonValueKind.Array) break;
            var received = 0;
            foreach (var item in items.EnumerateArray())
            {
                received++;
                var entry = ToResumeItem(item, isNextUp: false);
                if (entry is not null && byCatalog.Add(entry.catalog_id)) result.Add(entry);
            }
            if (received < batchSize) break;
        }
    }

    private ResumeItem? ToResumeItem(JsonElement item, bool isNextUp)
    {
        var id = Text(Get(item, "Id"));
        if (!Guid.TryParse(id, out _)) return null;
        var type = Text(Get(item, "Type"));
        var catalogId = type == "Movie" ? id : type == "Episode" ? Text(Get(item, "SeriesId")) : "";
        if (type == "Episode" && !Guid.TryParse(catalogId, out _))
        {
            // A minority of server versions omit SeriesId from an Episode DTO.
            // Resolve the already-authorized episode via Jellyfin's local item
            // index (without searching by the anime title or traversing NFO).
            var local = _library.GetItemById(Guid.Parse(id));
            var property = local?.GetType().GetProperty("SeriesId");
            if (property?.GetValue(local) is Guid seriesId && seriesId != Guid.Empty)
                catalogId = seriesId.ToString("N");
        }
        if (!Guid.TryParse(catalogId, out _)) return null;
        var data = Get(item, "UserData");
        var percentage = Number(Get(data, "PlayedPercentage"));
        if (percentage <= 0)
        {
            var duration = Number(Get(item, "RunTimeTicks"));
            var pos = Number(Get(data, "PlaybackPositionTicks"));
            if (duration > 0) percentage = 100.0 * pos / duration;
        }
        // Resume has a real saved position even if Jellyfin omitted RunTimeTicks.
        if (percentage <= 0 && Number(Get(data, "PlaybackPositionTicks")) > 0)
            percentage = 1;
        if (!isNextUp && (percentage <= 0 || percentage >= 100)) return null;
        return new ResumeItem
        {
            id = id,
            catalog_id = catalogId,
            progress_percent = Math.Round(Math.Clamp(percentage, 0, 100), 1),
            season = PositiveInt(Get(item, "ParentIndexNumber")),
            episode = PositiveInt(Get(item, "IndexNumber")),
            next_up = isNextUp,
            resume_type = type,
            position_ticks = (long)Number(Get(data, "PlaybackPositionTicks")),
            last_played = Text(Get(data, "LastPlayedDate"))
        };
    }

    public async Task<string> GetAuthenticatedUserIdAsync(HttpRequest caller,CancellationToken cancel)
    {
        var (_,_,userId)=await AuthenticatedUserAsync(caller,cancel).ConfigureAwait(false);
        return userId;
    }

    // One authorized media item, not a scan of every anime in the user's library.
    // Jellyfin returns compact (N) GUIDs from Items, while ASP.NET binds the same
    // values to canonical (D) Guids. Always compare the parsed value, not strings.
    private static bool SameGuid(string? value, Guid id) =>
        Guid.TryParse(value, out var parsed) && parsed == id;

    // At most 24 immediate child folders, checked only for a Season 1 NFO.
    // No Jellyfin API request or MAL request is needed for home-card MAL mapping.
    private static int? FirstSeasonMalId(string? seriesPath)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(seriesPath)) return null;
            var root = Directory.Exists(seriesPath) ? seriesPath : Path.GetDirectoryName(seriesPath);
            if (string.IsNullOrWhiteSpace(root) || !Directory.Exists(root)) return null;
            foreach (var folder in Directory.EnumerateDirectories(root).Take(24))
            {
                var path = Path.Combine(folder, "season.nfo");
                if (!File.Exists(path) || new FileInfo(path).Length > 3_000_000) continue;
                var settings = new XmlReaderSettings { DtdProcessing= DtdProcessing.Prohibit,
                    XmlResolver=null, MaxCharactersInDocument=3_000_000 };
                using var reader=XmlReader.Create(path,settings);
                var xml=XDocument.Load(reader);
                if (xml.Root?.Element("seasonnumber")?.Value.Trim() != "1") continue;
                return ReadNfo(folder,"Season",requireMalId:true)?.MalId;
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or XmlException) { }
        return null;
    }

    /// <summary>
    /// Read-only, per-user authorization for a bounded group of Simkl card scores.
    /// Never accept external provider IDs or paths from a browser. Avoid touching
    /// all-items catalog scans or making one HTTP request for each poster.
    /// </summary>
    public async Task<Dictionary<string,SimklMediaTarget>> AuthorizedSimklCardTargetsAsync(
        HttpRequest caller, string? ids, CancellationToken cancel)
    {
        var requested=(ids??string.Empty).Split(',',StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x=>Guid.TryParse(x,out _)).Select(Guid.Parse).Distinct().Take(36).ToArray();
        var targets=new Dictionary<string,SimklMediaTarget>(StringComparer.OrdinalIgnoreCase);
        if(requested.Length==0)return targets;
        var (origin,auth,userId)=await AuthenticatedUserAsync(caller,cancel).ConfigureAwait(false);
        using var response=await GetJsonAsync(origin,
            $"Items?UserId={Uri.EscapeDataString(userId)}&Ids={Uri.EscapeDataString(string.Join(',',requested.Select(g=>g.ToString("N"))))}"+
            $"&Fields=ProviderIds,Tags&IncludeItemTypes=Movie,Series&Limit={requested.Length}",auth,cancel).ConfigureAwait(false);
        var items=Get(response.RootElement,"Items");
        if(items.ValueKind!=JsonValueKind.Array)return targets;
        var allowed=requested.ToHashSet();
        foreach(var item in items.EnumerateArray())
        {
            if(!Guid.TryParse(Text(Get(item,"Id")),out var id)||!allowed.Contains(id))continue;
            var type=Text(Get(item,"Type"));
            if(type!="Movie"&&type!="Series")continue;
            try
            {
                var target=MakeSimklTarget(id,item,type=="Movie"?"movies":"shows",null);
                if(target.Relevant)targets[id.ToString("N")]=target;
            }
            catch(UnauthorizedAccessException) { /* Missing/non-visible local item: no rating. */ }
        }
        return targets;
    }

    // Simkl has a separate trust boundary: authenticated Jellyfin media identity,
    // NEVER an arbitrary external ID submitted by a browser and NEVER the AnimeRoot.
    // A Season maps to the parent series in Simkl (Simkl has one show-list entry).
    public async Task<SimklMediaTarget> AuthorizedSimklTargetAsync(HttpRequest caller,
        Guid catalogId, Guid? seasonId, CancellationToken cancel)
    {
        if (catalogId == Guid.Empty || seasonId == Guid.Empty)
            throw new ArgumentException("Nieprawidłowy identyfikator filmu lub serialu");
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        var id = seasonId ?? catalogId;
        using var allowed = await GetJsonAsync(origin,
            $"Items?UserId={Uri.EscapeDataString(userId)}&Ids={id:N}&Recursive=true&Limit=2" +
            "&IncludeItemTypes=Series,Season,Movie&Fields=ProviderIds,Tags", auth, cancel).ConfigureAwait(false);
        var list = Get(allowed.RootElement, "Items");
        if (list.ValueKind != JsonValueKind.Array ||
            !list.EnumerateArray().Any(x => SameGuid(Text(Get(x,"Id")), id)))
            throw new UnauthorizedAccessException("Pozycja niedostępna dla tego użytkownika Jellyfin");

        using var full = await GetJsonAsync(origin,
            $"Users/{Uri.EscapeDataString(userId)}/Items/{id:N}", auth, cancel).ConfigureAwait(false);
        var item = full.RootElement;
        var type = Text(Get(item, "Type"));
        int? seasonNumber = null;
        if (seasonId.HasValue)
        {
            if (type != "Season" || !SameGuid(Text(Get(item, "SeriesId")), catalogId))
                throw new UnauthorizedAccessException("Sezon nie należy do podanego serialu");
            seasonNumber = (int)Number(Get(item, "IndexNumber"));
        }
        else if (type != "Movie" && type != "Series")
            throw new ArgumentException("Simkl obsługuje tutaj tylko filmy i seriale");

        if (seasonId.HasValue)
        {
            using var parentAllowed = await GetJsonAsync(origin,
                $"Items?UserId={Uri.EscapeDataString(userId)}&Ids={catalogId:N}&Recursive=true&Limit=2" +
                "&IncludeItemTypes=Series&Fields=ProviderIds", auth, cancel).ConfigureAwait(false);
            var parentList = Get(parentAllowed.RootElement, "Items");
            if (parentList.ValueKind != JsonValueKind.Array ||
                !parentList.EnumerateArray().Any(x => SameGuid(Text(Get(x,"Id")), catalogId)))
                throw new UnauthorizedAccessException("Serial jest niedostępny dla tego użytkownika");
            using var parent = await GetJsonAsync(origin,
                $"Users/{Uri.EscapeDataString(userId)}/Items/{catalogId:N}", auth, cancel).ConfigureAwait(false);
            if (Text(Get(parent.RootElement,"Type")) != "Series")
                throw new UnauthorizedAccessException("Element nadrzędny nie jest serialem");
            return MakeSimklTarget(catalogId, parent.RootElement, "shows", seasonNumber);
        }
        return MakeSimklTarget(catalogId, item, type=="Movie"?"movies":"shows", null);
    }

    // Episode details use a server-verified child of the selected season and series.
    // A client-provided episode number is NEVER accepted as a write target.
    public async Task<(SimklMediaTarget Target,int EpisodeNumber)> AuthorizedSimklEpisodeAsync(
        HttpRequest caller,Guid catalogId,Guid seasonId,Guid episodeId,CancellationToken cancel)
    {
        if(episodeId==Guid.Empty||seasonId==Guid.Empty||catalogId==Guid.Empty)
            throw new ArgumentException("Wybierz prawidłowy odcinek i sezon.");
        var target=await AuthorizedSimklTargetAsync(caller,catalogId,seasonId,cancel).ConfigureAwait(false);
        if(!target.Relevant)return (target,0);
        var (origin,auth,userId)=await AuthenticatedUserAsync(caller,cancel).ConfigureAwait(false);
        using var allowed=await GetJsonAsync(origin,
            $"Items?UserId={Uri.EscapeDataString(userId)}&Ids={episodeId:N}&Recursive=true&Limit=2"+
            "&IncludeItemTypes=Episode",auth,cancel).ConfigureAwait(false);
        var items=Get(allowed.RootElement,"Items");
        if(items.ValueKind!=JsonValueKind.Array||
            !items.EnumerateArray().Any(e=>SameGuid(Text(Get(e,"Id")),episodeId)))
            throw new UnauthorizedAccessException("Odcinek niedostępny dla tego użytkownika Jellyfin");
        using var full=await GetJsonAsync(origin,
            $"Users/{Uri.EscapeDataString(userId)}/Items/{episodeId:N}",auth,cancel).ConfigureAwait(false);
        var media=full.RootElement;
        if(Text(Get(media,"Type"))!="Episode" ||
            !SameGuid(Text(Get(media,"SeasonId")),seasonId) ||
            !SameGuid(Text(Get(media,"SeriesId")),catalogId))
            throw new UnauthorizedAccessException("Odcinek nie należy do tego sezonu i serialu");
        var episodeNumber=(int)Number(Get(media,"IndexNumber"));
        if(episodeNumber<1||episodeNumber>9999)
            throw new ArgumentException("Odcinek nie ma prawidłowego numeru w Jellyfin.");
        var episodeNumbers=await AuthorizedSimklSeasonEpisodeNumbersAsync(caller,seasonId,cancel).ConfigureAwait(false);
        if(!episodeNumbers.Contains(episodeNumber))
            throw new UnauthorizedAccessException("Odcinek nie jest dostępny w tym sezonie");
        return (target,episodeNumber);
    }

    // Episode numbers for the selected season only, obtained via Jellyfin with the
    // authenticated user's permissions. The browser cannot invent episode numbers.
    public async Task<List<int>> AuthorizedSimklSeasonEpisodeNumbersAsync(HttpRequest caller,
        Guid seasonId,CancellationToken cancel)
    {
        if(seasonId==Guid.Empty)throw new ArgumentException("Nieprawidłowy sezon");
        var (origin,auth,userId)=await AuthenticatedUserAsync(caller,cancel).ConfigureAwait(false);
        using var response=await GetJsonAsync(origin,
            $"Items?UserId={Uri.EscapeDataString(userId)}&ParentId={seasonId:N}"+
            "&Recursive=false&IncludeItemTypes=Episode&Limit=501",auth,cancel).ConfigureAwait(false);
        var root=response.RootElement;
        if(Number(Get(root,"TotalRecordCount"))>500)
            throw new InvalidOperationException("Sezon ma ponad 500 odcinków — ręczna edycja odcinków jest wyłączona.");
        var items=Get(root,"Items");
        if(items.ValueKind!=JsonValueKind.Array)return new List<int>();
        if(items.GetArrayLength()>500)
            throw new InvalidOperationException("Zbyt wiele odcinków w jednym sezonie.");
        return items.EnumerateArray()
            .Where(e=>Text(Get(e,"Type"))=="Episode")
            .Select(e=>(int)Number(Get(e,"IndexNumber")))
            .Where(n=>n>0 && n<10000)
            .Distinct().OrderBy(n=>n).ToList();
    }

    // Admin-classified libraries are the authoritative Simkl boundary.
    // This check uses the stored paths/IDs, without reading thousands of NFO tags.
    // Unmapped paths are excluded from Simkl until an administrator classifies them.
    // Legacy installs without a saved map retain the old tag-based safety gate.
    internal static bool IsSimklAnime(BaseItem local, string type, JsonElement item = default)
    {
        var config = Plugin.Instance?.Configuration;
        if (config?.LibraryPathsConfigured == true)
        {
            var role = ManagedLibraryRoleFromPath(local.Path);
            return role != "simkl" && role != "other";
        }
        if (AnimeSource(local.Path).Length != 0) return true;
        static bool AnimeTag(string? value) => string.Equals(value?.Trim(),"Anime",StringComparison.OrdinalIgnoreCase);
        var fromApi = Get(item,"Tags");
        if (fromApi.ValueKind == JsonValueKind.Array &&
            fromApi.EnumerateArray().Any(tag=>tag.ValueKind==JsonValueKind.String && AnimeTag(tag.GetString()))) return true;
        // Jellyfin may expose tags through BaseItem even if the selected API
        // response omitted Fields=Tags. Reflection avoids depending on a
        // specific Jellyfin 12 BaseItem.Tags property signature.
        try
        {
            if (local.GetType().GetProperty("Tags")?.GetValue(local) is IEnumerable<string> tags &&
                tags.Any(AnimeTag)) return true;
        }
        catch (System.Reflection.TargetInvocationException) { /* NFO fallback below. */ }
        return ReadNfo(local.Path,type)?.AnimeTag == true;
    }

    private SimklMediaTarget MakeSimklTarget(Guid id, JsonElement data, string kind, int? seasonNumber)
    {
        var local = _library.GetItemById(id);
        if (local is null) throw new UnauthorizedAccessException("Pozycja nie istnieje w bibliotece");
        if (IsSimklAnime(local, kind=="movies"?"Movie":"Series", data))
            return new SimklMediaTarget(false, kind, seasonNumber, new Dictionary<string,string>(), "");
        var source = Get(data, "ProviderIds");
        var ids = new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (key, provider) in new[] { ("tmdb","Tmdb"), ("imdb","Imdb"), ("tvdb","Tvdb") })
        {
            var raw = Text(Get(source, provider)).Trim();
            if (raw.Length is > 0 and < 64 &&
                (key=="imdb" ? System.Text.RegularExpressions.Regex.IsMatch(raw, @"^tt[0-9]{5,12}$", System.Text.RegularExpressions.RegexOptions.IgnoreCase) :
                    System.Text.RegularExpressions.Regex.IsMatch(raw, @"^[0-9]{1,14}$"))) ids[key]=raw;
        }
        var title=Text(Get(data,"OriginalTitle"));
        if(string.IsNullOrWhiteSpace(title))title=Text(Get(data,"Name"));
        var productionYear=(int)Number(Get(data,"ProductionYear"));
        return new SimklMediaTarget(true,kind,seasonNumber,ids,title,
            productionYear is >=1888 and <=2100 ? productionYear : null);
    }

    public async Task<int> AuthorizedMalIdAsync(HttpRequest caller, Guid catalogId,
        Guid? seasonId, CancellationToken cancel)
    {
        if (catalogId == Guid.Empty || seasonId == Guid.Empty)
            throw new ArgumentException("Nieprawidłowy identyfikator anime/sezonu");

        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        var itemId = seasonId ?? catalogId;

        // The authenticated Jellyfin Items query applies the current user's
        // library permissions, and returns at most a single matching item.
        var route = $"Items?UserId={Uri.EscapeDataString(userId)}" +
            $"&Ids={itemId:N}&Recursive=true&Limit=2" +
            "&IncludeItemTypes=Series,Season,Movie&CollapseBoxSetItems=false";
        using var result = await GetJsonAsync(origin, route, auth, cancel).ConfigureAwait(false);
        var items = Get(result.RootElement, "Items");
        if (items.ValueKind != JsonValueKind.Array)
            throw new UnauthorizedAccessException("Nie znaleziono pozycji użytkownika");
        JsonElement found = default;
        foreach (var row in items.EnumerateArray())
        {
            if (SameGuid(Text(Get(row, "Id")), itemId)) { found = row; break; }
        }
        if (found.ValueKind != JsonValueKind.Object)
            throw new UnauthorizedAccessException("Pozycja nie jest dostępna dla użytkownika");

        var type = Text(Get(found, "Type"));
        if (seasonId.HasValue)
        {
            if (type != "Season") throw new ArgumentException("Wybrana pozycja nie jest sezonem");
            // SeriesId must reference the parent, not a sibling season or
            // another show's NFO. Verify the parent via the user's item API.
            using var season = await GetJsonAsync(origin,
                $"Users/{Uri.EscapeDataString(userId)}/Items/{itemId:N}", auth, cancel)
                .ConfigureAwait(false);
            if (!SameGuid(Text(Get(season.RootElement, "SeriesId")), catalogId))
                throw new UnauthorizedAccessException("Sezon nie należy do wybranej serii");
        }
        else if (type != "Series" && type != "Movie")
            throw new ArgumentException("Wybrana pozycja nie jest anime");

        var local = _library.GetItemById(itemId);
        var animeSource = local is null ? string.Empty : AnimeSource(local.Path);
        if (animeSource.Length == 0)
            throw new UnauthorizedAccessException("Pozycja jest poza biblioteką anime");

        var malId = ReadNfo(local.Path, type, requireMalId: true)?.MalId;
        if (malId.HasValue && malId.Value > 0) return malId.Value;

        // On a series page, a root-level MAL ID might be absent while the
        // first physical season has a valid season.nfo. Use only season 1;
        // never silently borrow an unrelated season's identifier.
        if (!seasonId.HasValue && type == "Series")
        {
            using var seasons = await GetJsonAsync(origin,
                $"Shows/{catalogId:N}/Seasons?UserId={Uri.EscapeDataString(userId)}&EnableUserData=false",
                auth, cancel).ConfigureAwait(false);
            var rows = Get(seasons.RootElement, "Items");
            if (rows.ValueKind == JsonValueKind.Array)
            {
                var first = rows.EnumerateArray().FirstOrDefault(x => Number(Get(x, "IndexNumber")) == 1);
                if (first.ValueKind == JsonValueKind.Object &&
                    Guid.TryParse(Text(Get(first, "Id")), out var firstId))
                {
                    var firstLocal = _library.GetItemById(firstId);
                    if (firstLocal is not null && AnimeSource(firstLocal.Path) == animeSource)
                    {
                        var firstMalId = ReadNfo(firstLocal.Path, "Season", requireMalId: true)?.MalId;
                        if (firstMalId.HasValue && firstMalId.Value > 0) return firstMalId.Value;
                    }
                }
            }
        }
        throw new ArgumentException(seasonId.HasValue
            ? "Brak MAL ID w season.nfo tego sezonu"
            : "Brak MAL ID w NFO serii lub jej pierwszego sezonu");
    }

    /// <summary>Update per-user numeric rating in Jellyfin; never CommunityRating or NFO.</summary>
    public async Task<double?> SetPersonalRatingAsync(HttpRequest caller, Guid itemId, double? score, CancellationToken cancel)
    {
        if (score.HasValue && (!double.IsFinite(score.Value) || score.Value < 1 || score.Value > 10 ||
            Math.Abs(score.Value * 2 - Math.Round(score.Value * 2)) > 0.00001))
            throw new ArgumentOutOfRangeException(nameof(score), "Ocena: 1–10, skok 0,5");
        var catalog = await ReadForAuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        if (!catalog.items.Any(x => SameGuid(x.id, itemId)))
            throw new UnauthorizedAccessException("Item not accessible");
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        return await UpdateRatingForItemAsync(origin, auth, userId, itemId, score, cancel).ConfigureAwait(false);
    }

    public async Task<double?> SetSeasonRatingAsync(HttpRequest caller, Guid parentId, Guid seasonId,
        double? score, CancellationToken cancel)
    {
        if (score.HasValue && (!double.IsFinite(score.Value) || score.Value < 1 || score.Value > 10 ||
            Math.Abs(score.Value * 2 - Math.Round(score.Value * 2)) > 0.00001))
            throw new ArgumentOutOfRangeException(nameof(score));
        var catalog = await ReadForAuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        if (!catalog.items.Any(x => SameGuid(x.id, parentId) && x.type == "Series"))
            throw new UnauthorizedAccessException("Series not accessible");
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        using var doc = await GetJsonAsync(origin,
            $"Shows/{parentId}/Seasons?UserId={Uri.EscapeDataString(userId)}&Fields=Overview&EnableUserData=true", auth, cancel)
            .ConfigureAwait(false);
        var seasons = Get(doc.RootElement, "Items");
        if (seasons.ValueKind != JsonValueKind.Array || !seasons.EnumerateArray().Any(x =>
            Text(Get(x,"Id")).Equals(seasonId.ToString("N"), StringComparison.OrdinalIgnoreCase) ||
            Text(Get(x,"Id")).Equals(seasonId.ToString(), StringComparison.OrdinalIgnoreCase)))
            throw new UnauthorizedAccessException("Season not accessible");
        return await UpdateRatingForItemAsync(origin, auth, userId, seasonId, score, cancel).ConfigureAwait(false);
    }

    private async Task<double?> UpdateRatingForItemAsync(Uri origin, string auth, string userId, Guid id,
        double? score, CancellationToken cancel)
    {
        var route = $"UserItems/{id}/UserData?userId={Uri.EscapeDataString(userId)}";
        using var current = await GetJsonAsync(origin, route, auth, cancel).ConfigureAwait(false);
        // Jellyfin UserData updates use a complete DTO. Preserve every existing playback field.
        var original = current.RootElement;
        var props = new Dictionary<string, object?>
        {
            ["ItemId"] = id,
            ["Key"] = Text(Get(original, "Key")),
            ["Played"] = Get(original,"Played").ValueKind == JsonValueKind.True,
            ["PlayCount"] = (int)Number(Get(original,"PlayCount")),
            ["PlaybackPositionTicks"] = (long)Number(Get(original,"PlaybackPositionTicks")),
            ["IsFavorite"] = Get(original,"IsFavorite").ValueKind == JsonValueKind.True,
            ["Rating"] = score,
        };
        var last = Text(Get(original, "LastPlayedDate"));
        if (!string.IsNullOrEmpty(last)) props["LastPlayedDate"] = last;
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(origin, route));
        request.Headers.TryAddWithoutValidation("Authorization", auth);
        request.Content = new System.Net.Http.StringContent(JsonSerializer.Serialize(props),
            System.Text.Encoding.UTF8, "application/json");
        using var response = await _client.SendAsync(request, cancel).ConfigureAwait(false);
        if (response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.Unauthorized)
            throw new UnauthorizedAccessException("Jellyfin denied rating update");
        response.EnsureSuccessStatusCode();
        return score;
    }

    public async Task<List<SeasonInfo>> ReadSeasonsAsync(HttpRequest caller, Guid seriesId, CancellationToken cancel)
    {
        var catalog = await ReadForAuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        var series = catalog.items.FirstOrDefault(x => SameGuid(x.id, seriesId) && x.type == "Series");
        if (series is null) throw new UnauthorizedAccessException("Series not accessible");
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        using var doc = await GetJsonAsync(origin,
            $"Shows/{seriesId}/Seasons?UserId={Uri.EscapeDataString(userId)}&EnableUserData=true", auth, cancel)
            .ConfigureAwait(false);
        var array = Get(doc.RootElement,"Items");
        var list = new List<SeasonInfo>();
        if (array.ValueKind != JsonValueKind.Array) return list;
        foreach (var it in array.EnumerateArray())
        {
            var id = Text(Get(it,"Id"));
            if (!Guid.TryParse(id,out var guid)) continue;
            var season = _library.GetItemById(guid);
            // A local tvshow.nfo may exist under each physical season's folder.
            var nfo = series.anime ? ReadSeasonNfo(season?.Path) : null;
            list.Add(new SeasonInfo(id,Text(Get(it,"Name")),(int?)PositiveInt(Get(it,"IndexNumber")),
                PersonalRating(it),nfo?.MalId,WatchStatus(it)));
        }
        return list;
    }

    /// <summary>
    /// Returns episodes that Jellyfin itself authorizes for the current user.
    /// For anime, do not take episode titles or descriptions from Jellyfin:
    /// the interface displays only structural season/episode numbers.
    /// </summary>
    public async Task<List<EpisodeInfo>> ReadEpisodesAsync(HttpRequest caller, Guid seriesId, bool anime, CancellationToken cancel)
    {
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        const int pageSize = 200;
        const int maxEpisodes = 4000;
        var list = new List<EpisodeInfo>();
        for (var start = 0; start < maxEpisodes; start += pageSize)
        {
            using var doc = await GetJsonAsync(origin,
                $"Shows/{seriesId}/Episodes?UserId={Uri.EscapeDataString(userId)}" +
                $"&IsMissing=false&EnableUserData=true&StartIndex={start}&Limit={pageSize}",
                auth, cancel).ConfigureAwait(false);
            var items = Get(doc.RootElement, "Items");
            if (items.ValueKind != JsonValueKind.Array) break;
            var received = 0;
            foreach (var item in items.EnumerateArray())
            {
                received++;
                var id = Text(Get(item, "Id"));
                if (!Guid.TryParse(id, out _)) continue;
                var season = Get(item, "ParentIndexNumber");
                var episode = Get(item, "IndexNumber");
                var seasonNo = season.ValueKind == JsonValueKind.Number && season.TryGetInt32(out var sn) ? sn : (int?)null;
                var episodeNo = episode.ValueKind == JsonValueKind.Number && episode.TryGetInt32(out var en) ? en : (int?)null;
                list.Add(new EpisodeInfo(id, anime ? "" : Text(Get(item, "Name")), seasonNo, episodeNo,
                    Get(Get(item, "UserData"), "Played").ValueKind == JsonValueKind.True));
            }
            if (received < pageSize) break;
        }
        return list;
    }

    private static LocalNfo? ReadSeasonNfo(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return null;
        return ReadNfo(path,"Series");
    }

    private async Task<(Uri origin, string auth, string userId)> AuthenticatedUserAsync(HttpRequest caller, CancellationToken cancel)
    {
        var auth = caller.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(auth)) throw new UnauthorizedAccessException("Missing Jellyfin Authorization header");
        var url = Plugin.Instance?.Configuration.JellyfinLoopbackUrl
            ?? throw new InvalidOperationException("Missing Jellyfin loopback URL");
        var origin = new Uri(url.TrimEnd('/') + "/", UriKind.Absolute);
        if (origin.Scheme != Uri.UriSchemeHttp ||
            (origin.Host != "localhost" && origin.Host != "127.0.0.1" && origin.Host != "::1"))
            throw new InvalidOperationException("JellyfinLoopbackUrl must be HTTP loopback");
        using var me = await GetJsonAsync(origin, "Users/Me", auth, cancel).ConfigureAwait(false);
        var userId = Text(Get(me.RootElement, "Id"));
        if (!Guid.TryParse(userId, out _)) throw new UnauthorizedAccessException("Invalid Jellyfin user");
        return (origin, auth, userId);
    }

    private async Task<JsonDocument> GetJsonAsync(Uri origin, string path, string authorization, CancellationToken cancel)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(origin, path));
        request.Headers.TryAddWithoutValidation("Authorization", authorization);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        using var response = await _client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancel).ConfigureAwait(false);
        if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
        {
            throw new UnauthorizedAccessException("Jellyfin denied the request");
        }
        response.EnsureSuccessStatusCode();
        await using var body = await response.Content.ReadAsStreamAsync(cancel).ConfigureAwait(false);
        return await JsonDocument.ParseAsync(body, cancellationToken: cancel).ConfigureAwait(false);
    }

    // A saved map is authoritative. The library ID remains stable across renames;
    // Jellyfin-provided paths are stored in each mapping and can be refreshed by admin.
    // Resolve by the longest matching root, so nested roots never override a
    // more specific classification. No file or NFO is accessed during lookup.
    private static string ManagedLibraryRoleFromPath(string? mediaPath)
    {
        var config = Plugin.Instance?.Configuration;
        if (config?.LibraryPathsConfigured != true || string.IsNullOrWhiteSpace(mediaPath))
            return string.Empty;
        var bestLength = -1;
        var matchedRole = string.Empty;
        foreach (var entry in config.LibraryPaths ?? new())
        {
            foreach (var path in entry.Paths ?? new())
            {
                if (string.IsNullOrWhiteSpace(path)) continue;
                try
                {
                    var fullRoot = Path.GetFullPath(path);
                    if (fullRoot.Length <= bestLength || !IsBelowRoot(mediaPath, fullRoot)) continue;
                    bestLength = fullRoot.Length;
                    matchedRole = entry.Role;
                }
                catch (ArgumentException) { /* Ignore invalid administrator paths. */ }
            }
        }
        return matchedRole;
    }

    // Catalog/search/proposals use the SAME stable Jellyfin library IDs as Home.
    // An administrator may rename/move a root while the saved path is stale.
    // Never infer audio from the path here; the language index does that separately.
    private static string AnimeSourceForLibraryMembership(IEnumerable<string> libraryIds, string? mediaPath)
    {
        var config = Plugin.Instance?.Configuration;
        if (config?.LibraryPathsConfigured == true)
        {
            var ids = libraryIds.ToHashSet(StringComparer.OrdinalIgnoreCase);
            var roles = (config.LibraryPaths ?? new())
                .Where(mapping => Guid.TryParse(mapping.LibraryId, out var id) && ids.Contains(id.ToString("N")))
                .Select(mapping => mapping.Role)
                .ToHashSet(StringComparer.Ordinal);
            if (roles.Contains("anime_both") || (roles.Contains("anime_pl") && roles.Contains("anime_eng")))
                return "both";
            if (roles.Contains("anime_pl")) return "lektor";
            if (roles.Contains("anime_eng")) return "original";
        }
        return AnimeSource(mediaPath);
    }

    // Both PL+ENG archives are eligible for either anime search audio mode.
    // For legacy installations, retain the historic two physical anime roots.
    private static string AnimeSource(string? mediaPath)
    {
        var config = Plugin.Instance?.Configuration;
        if (config?.LibraryPathsConfigured == true)
        {
            return ManagedLibraryRoleFromPath(mediaPath) switch
            {
                "anime_pl" => "lektor",
                "anime_eng" => "original",
                "anime_both" => "both",
                _ => string.Empty
            };
        }
        if (!string.IsNullOrWhiteSpace(config?.AnimeRoot) &&
            IsBelowRoot(mediaPath, Path.GetFullPath(config.AnimeRoot))) return "lektor";
        if (!string.IsNullOrWhiteSpace(config?.AnimeOriginalRoot) &&
            IsBelowRoot(mediaPath, Path.GetFullPath(config.AnimeOriginalRoot))) return "original";
        return string.Empty;
    }

    private static bool IsBelowRoot(string? mediaPath, string root)
    {
        if (string.IsNullOrWhiteSpace(mediaPath)) return false;
        try
        {
            var normalized = Path.GetFullPath(mediaPath);
            var prefix = root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            return normalized.Equals(root, StringComparison.Ordinal) ||
                   normalized.StartsWith(prefix, StringComparison.Ordinal);
        }
        catch { return false; }
    }

    private static LocalNfo? ReadNfo(string? itemPath, string type, bool requireMalId = false)
    {
        if (string.IsNullOrWhiteSpace(itemPath)) return null;
        var folder = Directory.Exists(itemPath) ? itemPath : Path.GetDirectoryName(itemPath);
        if (string.IsNullOrWhiteSpace(folder)) return null;
        var candidates = new List<string>();
        if (type == "Series") { candidates.Add(Path.Combine(folder, "tvshow.nfo")); candidates.Add(Path.Combine(folder, "season.nfo")); }
        else if (type == "Season") { candidates.Add(Path.Combine(folder, "season.nfo")); candidates.Add(Path.Combine(folder, "tvshow.nfo")); }
        else
        {
            candidates.Add(Path.Combine(folder, "movie.nfo"));
            candidates.Add(Path.ChangeExtension(itemPath, ".nfo"));
        }
        foreach (var file in candidates)
        {
            if (!File.Exists(file)) continue;
            try
            {
                var info = new FileInfo(file);
                if (info.Length > 3_000_000) continue;
                // File.Exists + FileInfo check stay in place on EVERY read.
                // An edited NFO invalidates the parsed value by length/time.
                // Failures are NEVER cached; a temporarily locked NFO is retried.
                var stamp = info.LastWriteTimeUtc;
                var length = info.Length;
                if (ParsedNfoCache.TryGetValue(file, out var cached) &&
                    cached.Length == length && cached.ModifiedUtc == stamp)
                {
                    if (requireMalId && !cached.Parsed.MalId.HasValue) continue;
                    return cached.Parsed with { Genres = new List<string>(cached.Parsed.Genres) };
                }
                var xmlSettings = new XmlReaderSettings
                {
                    DtdProcessing = DtdProcessing.Prohibit,
                    XmlResolver = null,
                    MaxCharactersInDocument = 3_000_000,
                    IgnoreComments = true
                };
                using var xmlReader = XmlReader.Create(file, xmlSettings);
                var doc = XDocument.Load(xmlReader);
                var nfo = doc.Root;
                if (nfo is null) continue;
                string V(string name) => nfo.Element(name)?.Value.Trim() ?? string.Empty;
                var tags = nfo.Elements("tag").Select(e => e.Value.Trim()).ToArray();
                var kind = tags.FirstOrDefault(t => t.StartsWith("Typ:", StringComparison.OrdinalIgnoreCase));
                var parsed = new LocalNfo(
                    V("originaltitle"),
                    V("title"),
                    V("year"),
                    V("plot"),
                    kind is null ? string.Empty : kind[4..].Trim(),
                    nfo.Elements("genre").Select(e => e.Value.Trim())
                        .Where(s => !string.IsNullOrWhiteSpace(s))
                        .Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
                    ParseNfoRating(nfo),
                    int.TryParse(nfo.Elements("uniqueid").FirstOrDefault(e =>
                        string.Equals((string?)e.Attribute("type"), "mal", StringComparison.OrdinalIgnoreCase))?.Value,
                        NumberStyles.None, CultureInfo.InvariantCulture, out var malId) && malId > 0 ? malId : null,
                    int.TryParse(V("seasonnumber"), NumberStyles.None, CultureInfo.InvariantCulture, out var seasonOrdinal)
                        && seasonOrdinal > 0 ? seasonOrdinal : null,
                    tags.Any(t=>string.Equals(t,"Anime",StringComparison.OrdinalIgnoreCase)) ||
                    (nfo.Element("anime") is { } animeFlag &&
                        !new[]{"false","0","no","nie"}.Contains(animeFlag.Value.Trim(),StringComparer.OrdinalIgnoreCase)));
                // Do not cache data if the file was rewritten while parsing.
                try
                {
                    var after = new FileInfo(file);
                    if (after.Length == length && after.LastWriteTimeUtc == stamp)
                    {
                        if (ParsedNfoCache.Count > 8192) ParsedNfoCache.Clear();
                        ParsedNfoCache[file] = new NfoCacheEntry(stamp, length,
                            parsed with { Genres = new List<string>(parsed.Genres) });
                    }
                }
                catch (IOException) { /* File changed/deleted after a valid read: still return parsed data. */ }
                if (requireMalId && !parsed.MalId.HasValue) continue;
                return parsed;
            }
            catch (XmlException) { /* Invalid NFO: no guessing */ }
            catch (IOException) { /* File in use: retry next request */ }
            catch (UnauthorizedAccessException) { /* No access to NFO */ }
        }
        return null;
    }

    private static double? ParseNfoRating(XElement nfo)
    {
        // Anime descriptive ratings are NFO-only; never fall back to Jellyfin.
        var raw = nfo.Element("rating")?.Value
            ?? nfo.Element("ratings")?.Elements("rating").Select(x => x.Element("value")?.Value)
                .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));
        if (double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out var rating)
            && rating >= 0 && rating <= 10) return Math.Round(rating, 1);
        return null;
    }

    private static int? PositiveInt(JsonElement item)
    {
        if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var value) && value > 0)
            return value;
        return null;
    }

    private static double? PersonalRating(JsonElement item)
        => PositiveRating(Get(Get(item, "UserData"), "Rating"));

    private static double? PositiveRating(JsonElement item)
    {
        var rating = Number(item);
        return rating > 0 && rating <= 10 ? Math.Round(rating, 1) : null;
    }

    private static string WatchStatus(JsonElement item)
    {
        var data = Get(item, "UserData");
        var total = PositiveInt(Get(item, "RecursiveItemCount"));
        // Jellyfin's per-series Played flag may be inconsistent; when episode counts
        // are available, prefer the actual watched/unwatched episode aggregation.
        if (total.HasValue && Get(data, "UnplayedItemCount").ValueKind == JsonValueKind.Number)
        {
            var count = Number(Get(data, "UnplayedItemCount"));
            if (count <= 0) return "watched";
            if (count < total.Value) return "started";
            return "unwatched";
        }
        if (Get(data, "Played").ValueKind == JsonValueKind.True) return "watched";
        if (Progress(item) > 0 || Number(Get(data, "PlayedPercentage")) > 0
            || !string.IsNullOrWhiteSpace(Text(Get(data, "LastPlayedDate")))) return "started";
        return "unwatched";
    }

    private static bool HasPrimaryImage(JsonElement item)
    {
        var tags = Get(item, "ImageTags");
        return !string.IsNullOrWhiteSpace(Text(Get(tags, "Primary")));
    }

    private static double Progress(JsonElement item)
    {
        var position = Number(Get(Get(item, "UserData"), "PlaybackPositionTicks"));
        var duration = Number(Get(item, "RunTimeTicks"));
        return duration <= 0 ? 0 : Math.Round(Math.Clamp(100 * position / duration, 0, 100), 1);
    }

    private static double Number(JsonElement value)
    {
        return value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number) ? number : 0;
    }

    private static JsonElement Get(JsonElement value, string key)
    {
        if (value.ValueKind != JsonValueKind.Object) return default;
        if (value.TryGetProperty(key, out var result)) return result;
        var camel = char.ToLowerInvariant(key[0]) + key[1..];
        return value.TryGetProperty(camel, out result) ? result : default;
    }

    private static string Text(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.String => value.GetString() ?? string.Empty,
        JsonValueKind.Number => value.ToString(),
        _ => string.Empty
    };

    private static string NormalizeCatalogGuid(JsonElement primary, JsonElement fallback)
    {
        var raw = Text(primary);
        if (!Guid.TryParse(raw, out var id) || id == Guid.Empty)
        {
            raw = Text(fallback);
            if (!Guid.TryParse(raw, out id) || id == Guid.Empty) return string.Empty;
        }
        return id.ToString("N");
    }

    private static List<string> Strings(JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.Array) return new List<string>();
        return value.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String)
            .Select(x => x.GetString() ?? string.Empty).Where(x => x.Length > 0).ToList();
    }

    private sealed record NfoCacheEntry(DateTime ModifiedUtc, long Length, LocalNfo Parsed);
    private sealed record LocalNfo(string OriginalTitle, string DisplayTitle, string Year, string Plot, string Kind, List<string> Genres, double? Rating, int? MalId, int? SeasonNumber, bool AnimeTag);
}

public sealed record GenreSets(string[] anime, string[] media);
public sealed record CatalogResponse(List<CatalogItem> items, GenreSets genres);

public sealed class CatalogItem
{
    public string id { get; set; } = string.Empty;
    // Same stable CollectionFolder GUIDs as /Library/VirtualFolders and User /Views.
    public List<string> library_ids { get; set; } = new();
    public bool anime { get; set; }
    // Cached, verified Polish AUDIO availability; null means unknown.
    // Subtitles alone do not count as audio. Never inferred from a folder name here.
    public bool? pl_audio { get; set; }
    // From the identical durable PL/EN language-flags index; unknown != false.
    public bool? pl_subtitles { get; set; }
    public bool? en_subtitles { get; set; }
    // "lektor" = animelektor (PL); "original" = anime (original audio / EN subs).
    public string anime_source { get; set; } = string.Empty;
    public string type { get; set; } = string.Empty;
    public string title { get; set; } = string.Empty;
    // Parent relationship is an actual Jellyfin SeriesId/ParentId GUID, not a name match.
    public string parent_series_id { get; set; } = string.Empty;
    // NFO title and originaltitle; helps find a series by any linked season/Special.
    public List<string> search_titles { get; set; } = new();
    public string year { get; set; } = string.Empty;
    public string plot { get; set; } = string.Empty;
    public string kind { get; set; } = string.Empty;
    public List<string> genres { get; set; } = new();
    public bool has_image { get; set; }
    public string date_added { get; set; } = string.Empty;
    public double progress_percent { get; set; }
    // Actual season.nfo <seasonnumber>; absent/invalid is null (never fabricated).
    public int? season_number { get; set; }
    public int? season_count { get; set; }
    public int? episode_count { get; set; }
    public double? rating { get; set; }
    public int? mal_id { get; set; }
    public string watch_status { get; set; } = "unwatched";
}

public sealed record ResumeResponse(List<ResumeItem> items, List<ResumeItem> hidden);
public sealed class ResumeItem
{
    public string id { get; set; } = string.Empty;
    public string catalog_id { get; set; } = string.Empty;
    public double progress_percent { get; set; }
    public int? season { get; set; }
    public int? episode { get; set; }
    public bool next_up { get; set; }
    public long position_ticks { get; set; }
    public string resume_type { get; set; } = string.Empty;
    public string last_played { get; set; } = string.Empty;
}

public sealed record SeasonInfo(string id, string name, int? number, double? rating, int? mal_id, string watch_status);

public sealed record EpisodeInfo(string id, string title, int? season, int? number, bool watched);

/// <summary>Exactly the fields needed by decorative badges on existing Jellyfin cards.</summary>
public sealed record LanguageFlagInfo(string id, string? pl, string? en, bool partial);
public sealed record LanguageFlagIndexStatus(int indexed, DateTimeOffset? updatedUtc);

public sealed class OverlayInfo
{
    public string id { get; set; } = string.Empty;
    public bool anime { get; set; }
    public bool simklExcluded { get; set; }
    public string year { get; set; } = string.Empty;
    public string format { get; set; } = string.Empty;
    public List<string> genres { get; set; } = new();
    public string description { get; set; } = string.Empty;
    public bool hasPrimary { get; set; }
    public int? seasons { get; set; }
    public int? episodes { get; set; }
    // Simkl-only season decoration data; anime is intentionally excluded.
    public string? simklSeriesId { get; set; }
    public int? simklSeasonNumber { get; set; }
    // Read-only poster decoration for anime; never interpreted as Simkl data.
    public string? malSeriesId { get; set; }
    public int? malSeasonNumber { get; set; }
    public double? userRating { get; set; }
    public string watchStatus { get; set; } = string.Empty;
    public int? malId { get; set; }
    public int? memberCollectionCount { get; set; }
    public string? memberCollectionName { get; set; }
}

// Personal home rows; every instance is derived from an allowed user-scoped Jellyfin item.
public sealed record HomeLibrary(string id, string name, string category, string href, string catalogRevision = "");
public sealed record HomeShelfResponse(string libraryId, string libraryName, string mode,
    int startIndex, bool hasMore, List<HomeTile> items, int? nextStartIndex = null);
public sealed class HomeTile
{
    public string id { get; set; } = string.Empty;
    public string serverId { get; set; } = string.Empty;
    public string type { get; set; } = string.Empty;
    public bool anime { get; set; }
    public bool simklExcluded { get; set; }
    public string title { get; set; } = string.Empty;
    public string year { get; set; } = string.Empty;
    public string format { get; set; } = string.Empty;
    public string description { get; set; } = string.Empty;
    public List<string> genres { get; set; } = new();
    public bool hasPrimary { get; set; }
    public int? seasons { get; set; }
    public int? episodes { get; set; }
    public int? collectionCount { get; set; }
    public int? memberCollectionCount { get; set; }
    public string? memberCollectionName { get; set; }
    public double? userRating { get; set; }
    public string watchStatus { get; set; } = string.Empty;
    public int? malId { get; set; }
}
public sealed record HomeResumeTile(HomeTile item, string resumeId, double progress,
    int? season, int? episode, bool nextUp, long positionTicks, string resumeType);
public sealed record HomeResumeResponse(List<HomeResumeTile> items, List<HomeResumeTile> hidden);

// Separate media identity for Simkl; no MAL IDs or NFO content are transferred.
public sealed record SimklMediaTarget(bool Relevant, string Kind, int? SeasonNumber,
    Dictionary<string,string> Ids, string Title,int? Year=null);
