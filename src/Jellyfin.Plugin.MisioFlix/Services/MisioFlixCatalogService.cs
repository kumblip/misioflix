using System;
using System.Collections.Generic;
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

    public MisioFlixCatalogService(HttpClient client, ILibraryManager library)
    {
        _client = client;
        _library = library;
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
                       "&Fields=Genres,Overview,Tags,DateCreated" +
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
                        progress_percent = Progress(json)
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
                        progress_percent = Progress(json)
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
    /// Resume items are purely playback state. Titles, descriptions and genres are deliberately
    /// NOT returned here; the client matches authorised series/movie IDs to the NFO/Jellyfin
    /// catalog before displaying anything (anime text still comes exclusively from NFO).
    /// </summary>
    public async Task<ResumeResponse> ReadResumeForAuthenticatedUserAsync(HttpRequest caller, CancellationToken cancel)
    {
        var auth = caller.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(auth))
            throw new UnauthorizedAccessException("Missing Jellyfin Authorization header");

        var config = Plugin.Instance?.Configuration
            ?? throw new InvalidOperationException("MisioFlix is not initialized");
        var origin = new Uri(config.JellyfinLoopbackUrl.TrimEnd('/') + "/", UriKind.Absolute);
        if (origin.Scheme != Uri.UriSchemeHttp ||
            (origin.Host != "localhost" && origin.Host != "127.0.0.1" && origin.Host != "::1"))
            throw new InvalidOperationException("JellyfinLoopbackUrl must be HTTP loopback");

        using var me = await GetJsonAsync(origin, "Users/Me", auth, cancel).ConfigureAwait(false);
        var userId = Text(Get(me.RootElement, "Id"));
        if (!Guid.TryParse(userId, out _))
            throw new UnauthorizedAccessException("Jellyfin did not recognize the caller");

        // MediaTypes=Video limits Jellyfin's resume query to actual playback items.
        var path = $"Users/{Uri.EscapeDataString(userId)}/Items/Resume" +
                   "?MediaTypes=Video&IncludeItemTypes=Movie,Episode&Limit=12&EnableUserData=true";
        using var doc = await GetJsonAsync(origin, path, auth, cancel).ConfigureAwait(false);
        var items = Get(doc.RootElement, "Items");
        var result = new List<ResumeItem>();
        if (items.ValueKind != JsonValueKind.Array) return new ResumeResponse(result);
        foreach (var item in items.EnumerateArray())
        {
            var id = Text(Get(item, "Id"));
            if (!Guid.TryParse(id, out _)) continue;
            var type = Text(Get(item, "Type"));
            var catalogId = type == "Movie" ? id : type == "Episode" ? Text(Get(item, "SeriesId")) : string.Empty;
            if (!Guid.TryParse(catalogId, out _)) continue;
            var userData = Get(item, "UserData");
            var percentage = Number(Get(userData, "PlayedPercentage"));
            if (percentage <= 0)
            {
                var duration = Number(Get(item, "RunTimeTicks"));
                var position = Number(Get(userData, "PlaybackPositionTicks"));
                if (duration > 0) percentage = 100.0 * position / duration;
            }
            if (percentage <= 0 || percentage >= 100) continue;
            result.Add(new ResumeItem
            {
                id = id,
                catalog_id = catalogId,
                progress_percent = Math.Round(Math.Clamp(percentage, 0, 100), 1)
            });
        }
        return new ResumeResponse(result);
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
        if (type == "Series") candidates.Add(Path.Combine(folder, "tvshow.nfo"));
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
                        .Distinct(StringComparer.OrdinalIgnoreCase).ToList());
            }
            catch (XmlException) { /* Invalid NFO: no guessing */ }
            catch (IOException) { /* File in use: retry next request */ }
            catch (UnauthorizedAccessException) { /* No access to NFO */ }
        }
        return null;
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

    private sealed record LocalNfo(string OriginalTitle, string Year, string Plot, string Kind, List<string> Genres);
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
}

public sealed record ResumeResponse(List<ResumeItem> items);
public sealed class ResumeItem
{
    public string id { get; set; } = string.Empty;
    public string catalog_id { get; set; } = string.Empty;
    public double progress_percent { get; set; }
}
