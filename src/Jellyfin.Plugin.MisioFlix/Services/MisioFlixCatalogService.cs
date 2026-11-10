using System;
using System.Collections.Generic;
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
    private readonly string _hiddenResumePath;
    private static readonly SemaphoreSlim HiddenGate = new(1, 1);

    public MisioFlixCatalogService(HttpClient client, ILibraryManager library, IApplicationPaths applicationPaths)
    {
        _client = client;
        _library = library;
        // Separate JSON state, never the Jellyfin database, media or NFO files.
        _hiddenResumePath = Path.Combine(applicationPaths.DataPath, "misioflix", "hidden-resume.json");
    }

    public async Task<CatalogResponse> ReadForAuthenticatedUserAsync(HttpRequest caller, CancellationToken cancel)
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

        var root = Path.GetFullPath(config.AnimeRoot);
        var result = new List<CatalogItem>();
        const int pageSize = 400;
        const int maxItems = 16000; // Defensive bound; not a catalog size claim.

        for (var start = 0; start < maxItems; start += pageSize)
        {
            var path = $"Items?UserId={Uri.EscapeDataString(userId)}" +
                       "&Recursive=true&IncludeItemTypes=Movie,Series" +
                       "&Fields=Genres,Overview,Tags,DateCreated,ChildCount,RecursiveItemCount" +
                       "&EnableUserData=true" +
                       $"&StartIndex={start}&Limit={pageSize}";
            using var doc = await GetJsonAsync(origin, path, auth, cancel).ConfigureAwait(false);
            var items = Get(doc.RootElement, "Items");
            if (items.ValueKind != JsonValueKind.Array) break;

            var received = 0;
            foreach (var json in items.EnumerateArray())
            {
                received++;
                var itemId = Text(Get(json, "Id"));
                if (!Guid.TryParse(itemId, out var guid)) continue;

                // The GUID originates from the already-authorized /Items result.
                var originalItem = _library.GetItemById(guid);
                if (originalItem is null) continue;
                var mediaPath = originalItem.Path;
                var isAnime = IsBelowRoot(mediaPath, root);
                if (isAnime)
                {
                    var local = ReadNfo(mediaPath, Text(Get(json, "Type")));
                    // Even missing NFO must NEVER fall back to Jellyfin metadata.
                    result.Add(new CatalogItem
                    {
                        id = itemId,
                        anime = true,
                        type = Text(Get(json, "Type")),
                        title = local?.OriginalTitle ?? "Brak tytułu w NFO",
                        year = local?.Year ?? string.Empty,
                        plot = local?.Plot ?? string.Empty,
                        kind = local?.Kind ?? string.Empty,
                        genres = local?.Genres ?? new List<string>(),
                        has_image = HasPrimaryImage(json),
                        date_added = Text(Get(json, "DateCreated")),
                        progress_percent = Progress(json),
                        season_count = PositiveInt(Get(json, "ChildCount")),
                        episode_count = PositiveInt(Get(json, "RecursiveItemCount")),
                        rating = PersonalRating(json),
                        mal_id = local?.MalId,
                        watch_status = WatchStatus(json)
                    });
                }
                else
                {
                    var type = Text(Get(json, "Type"));
                    result.Add(new CatalogItem
                    {
                        id = itemId,
                        anime = false,
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
            if (received < pageSize) break;
        }

        var animeGenres = result.Where(x => x.anime).SelectMany(x => x.genres)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.CurrentCultureIgnoreCase).ToArray();
        var mediaGenres = result.Where(x => !x.anime).SelectMany(x => x.genres)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.CurrentCultureIgnoreCase).ToArray();
        return new CatalogResponse(result, new GenreSets(animeGenres, mediaGenres));
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
        return new ResumeResponse(result.Where(x => !hidden.Contains(x.catalog_id)).ToList(),
            result.Where(x => hidden.Contains(x.catalog_id)).ToList());
    }

    public async Task HideResumeForAuthenticatedUserAsync(HttpRequest caller, Guid catalogId,
        bool hide, CancellationToken cancel)
    {
        var (_, _, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        // Only currently visible Jellyfin media can be hidden: never accept arbitrary item IDs.
        var catalog = await ReadForAuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        if (!catalog.items.Any(x => x.id.Equals(catalogId.ToString(), StringComparison.OrdinalIgnoreCase)))
            throw new UnauthorizedAccessException("Item is not accessible to this user");
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
            var path = $"{route}?UserId={Uri.EscapeDataString(userId)}&MediaTypes=Video" +
                       $"&IncludeItemTypes=Movie,Episode&StartIndex={offset}&Limit={batchSize}&EnableUserData=true";
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

    private static ResumeItem? ToResumeItem(JsonElement item, bool isNextUp)
    {
        var id = Text(Get(item, "Id"));
        if (!Guid.TryParse(id, out _)) return null;
        var type = Text(Get(item, "Type"));
        var catalogId = type == "Movie" ? id : type == "Episode" ? Text(Get(item, "SeriesId")) : "";
        if (!Guid.TryParse(catalogId, out _)) return null;
        var data = Get(item, "UserData");
        var percentage = Number(Get(data, "PlayedPercentage"));
        if (percentage <= 0)
        {
            var duration = Number(Get(item, "RunTimeTicks"));
            var pos = Number(Get(data, "PlaybackPositionTicks"));
            if (duration > 0) percentage = 100.0 * pos / duration;
        }
        if (!isNextUp && (percentage <= 0 || percentage >= 100)) return null;
        return new ResumeItem
        {
            id = id,
            catalog_id = catalogId,
            progress_percent = Math.Round(Math.Clamp(percentage, 0, 100), 1),
            season = PositiveInt(Get(item, "ParentIndexNumber")),
            episode = PositiveInt(Get(item, "IndexNumber")),
            next_up = isNextUp
        };
    }

    public async Task<string> GetAuthenticatedUserIdAsync(HttpRequest caller,CancellationToken cancel)
    {
        var (_,_,userId)=await AuthenticatedUserAsync(caller,cancel).ConfigureAwait(false);
        return userId;
    }

    public async Task<int> AuthorizedMalIdAsync(HttpRequest caller,Guid catalogId,Guid? seasonId,CancellationToken cancel)
    {
        var catalog=await ReadForAuthenticatedUserAsync(caller,cancel).ConfigureAwait(false);
        var item=catalog.items.FirstOrDefault(x=>x.id.Equals(catalogId.ToString(),StringComparison.OrdinalIgnoreCase) && x.anime);
        if(item is null) throw new UnauthorizedAccessException("Anime not accessible");
        if(!seasonId.HasValue)return item.mal_id ?? throw new ArgumentException("Brak identyfikatora MAL w NFO serii");
        var seasons=await ReadSeasonsAsync(caller,catalogId,cancel).ConfigureAwait(false);
        var season=seasons.FirstOrDefault(x=>x.id.Equals(seasonId.Value.ToString(),StringComparison.OrdinalIgnoreCase));
        return season?.mal_id ?? throw new ArgumentException("Brak identyfikatora MAL w NFO sezonu");
    }

    /// <summary>Update per-user numeric rating in Jellyfin; never CommunityRating or NFO.</summary>
    public async Task<double?> SetPersonalRatingAsync(HttpRequest caller, Guid itemId, double? score, CancellationToken cancel)
    {
        if (score.HasValue && (!double.IsFinite(score.Value) || score.Value < 1 || score.Value > 10 ||
            Math.Abs(score.Value * 2 - Math.Round(score.Value * 2)) > 0.00001))
            throw new ArgumentOutOfRangeException(nameof(score), "Ocena: 1–10, skok 0,5");
        var catalog = await ReadForAuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        if (!catalog.items.Any(x => x.id.Equals(itemId.ToString(), StringComparison.OrdinalIgnoreCase)))
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
        if (!catalog.items.Any(x => x.id.Equals(parentId.ToString(), StringComparison.OrdinalIgnoreCase) && x.type == "Series"))
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
        var series = catalog.items.FirstOrDefault(x => x.id.Equals(seriesId.ToString(), StringComparison.OrdinalIgnoreCase) && x.type == "Series");
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

    private static LocalNfo? ReadNfo(string? itemPath, string type)
    {
        if (string.IsNullOrWhiteSpace(itemPath)) return null;
        var folder = Directory.Exists(itemPath) ? itemPath : Path.GetDirectoryName(itemPath);
        if (string.IsNullOrWhiteSpace(folder)) return null;
        var candidates = new List<string>();
        if (type == "Series") { candidates.Add(Path.Combine(folder, "tvshow.nfo")); candidates.Add(Path.Combine(folder, "season.nfo")); }
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
                return new LocalNfo(
                    V("originaltitle"),
                    V("year"),
                    V("plot"),
                    kind is null ? string.Empty : kind[4..].Trim(),
                    nfo.Elements("genre").Select(e => e.Value.Trim())
                        .Where(s => !string.IsNullOrWhiteSpace(s))
                        .Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
                    ParseNfoRating(nfo),
                    int.TryParse(nfo.Elements("uniqueid").FirstOrDefault(e =>
                        string.Equals((string?)e.Attribute("type"), "mal", StringComparison.OrdinalIgnoreCase))?.Value,
                        NumberStyles.None, CultureInfo.InvariantCulture, out var malId) && malId > 0 ? malId : null);
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

    private static List<string> Strings(JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.Array) return new List<string>();
        return value.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String)
            .Select(x => x.GetString() ?? string.Empty).Where(x => x.Length > 0).ToList();
    }

    private sealed record LocalNfo(string OriginalTitle, string Year, string Plot, string Kind, List<string> Genres, double? Rating, int? MalId);
}

public sealed record GenreSets(string[] anime, string[] media);
public sealed record CatalogResponse(List<CatalogItem> items, GenreSets genres);

public sealed class CatalogItem
{
    public string id { get; set; } = string.Empty;
    public bool anime { get; set; }
    public string type { get; set; } = string.Empty;
    public string title { get; set; } = string.Empty;
    public string year { get; set; } = string.Empty;
    public string plot { get; set; } = string.Empty;
    public string kind { get; set; } = string.Empty;
    public List<string> genres { get; set; } = new();
    public bool has_image { get; set; }
    public string date_added { get; set; } = string.Empty;
    public double progress_percent { get; set; }
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
}

public sealed record SeasonInfo(string id, string name, int? number, double? rating, int? mal_id, string watch_status);

public sealed record EpisodeInfo(string id, string title, int? season, int? number, bool watched);
