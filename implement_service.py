from pathlib import Path
p=Path('src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs')
s=p.read_text()
needle='    /// <summary>\n    /// Small, permission-filtered batch of overlay metadata.'
assert needle in s
block='''    // Home shelves are small, server-side filtered queries, NEVER a second catalogue scan.
    // User /Views scopes the allowed ParentId to libraries actually visible to the caller.
    public async Task<List<HomeLibrary>> ReadHomeLibrariesAsync(HttpRequest caller, CancellationToken cancel)
    {
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        return await GetHomeLibrariesAsync(origin, auth, userId, cancel).ConfigureAwait(false);
    }

    private async Task<List<HomeLibrary>> GetHomeLibrariesAsync(Uri origin, string auth, string userId, CancellationToken cancel)
    {
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
            var isAnime = name.Contains("anime", StringComparison.OrdinalIgnoreCase);
            // No arbitrary view types, no top-level global search, no special collections.
            var category = isAnime ? "anime" : collection switch
            {
                "movies" => "movies",
                "tvshows" => "series",
                _ => ""
            };
            if (string.IsNullOrEmpty(category)) continue;
            var kind = collection switch
            {
                "movies" => "movies",
                "tvshows" => "tv",
                _ => "mixed"
            };
            var href = $"#/" + kind + $"?topParentId={guid:N}&collectionType={Uri.EscapeDataString(collection)}";
            // The user's home page should be library-specific, not alphabetically mixed.
            result.Add(new HomeLibrary(guid.ToString("N"), name, category, href));
        }
        return result;
    }

    public async Task<HomeShelfResponse> ReadHomeShelfAsync(HttpRequest caller, Guid libraryId,
        string? mode, int startIndex, int limit, CancellationToken cancel)
    {
        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        var views = await GetHomeLibrariesAsync(origin, auth, userId, cancel).ConfigureAwait(false);
        var view = views.FirstOrDefault(v => v.id.Equals(libraryId.ToString("N"), StringComparison.OrdinalIgnoreCase));
        if (view is null) throw new UnauthorizedAccessException("Library is not accessible to this user");
        if (startIndex < 0 || startIndex > 40000) throw new ArgumentOutOfRangeException(nameof(startIndex));
        if (limit < 1 || limit > 24) throw new ArgumentOutOfRangeException(nameof(limit));
        var random = string.Equals(mode, "random", StringComparison.OrdinalIgnoreCase);
        var types = view.category switch
        {
            "movies" => "Movie",
            "series" => "Series",
            _ => "Series,Movie"
        };
        // The series filter excludes Season and Episode: Arifureta gets ONE series
        // parent with all seasons, not an arbitrary recently added season.
        // Random is executed against the ENTIRE scoped library, not shuffled page one.
        var path = $"Items?UserId={Uri.EscapeDataString(userId)}" +
                   $"&ParentId={libraryId:N}&Recursive=true&IncludeItemTypes={types}" +
                   $"&SortBy={(random ? "Random" : "DateCreated")}" +
                   "&SortOrder=Descending&EnableUserData=true" +
                   "&EnableTotalRecordCount=false" +
                   "&Fields=Genres,Overview,DateCreated,ChildCount,RecursiveItemCount" +
                   $"&StartIndex={(random ? 0 : startIndex)}&Limit={limit + 1}";
        using var doc = await GetJsonAsync(origin, path, auth, cancel).ConfigureAwait(false);
        var items = Get(doc.RootElement, "Items");
        var list = new List<HomeTile>();
        if (items.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in items.EnumerateArray())
            {
                if (list.Count >= limit) break;
                var tile = MakeHomeTile(item, view.category);
                if (tile is not null) list.Add(tile);
            }
        }
        var hasMore = !random && items.ValueKind == JsonValueKind.Array && items.GetArrayLength() > limit;
        return new HomeShelfResponse(view.id, view.name, random ? "random" : "latest", startIndex, hasMore, list);
    }

    private HomeTile? MakeHomeTile(JsonElement item, string category)
    {
        var id = Text(Get(item, "Id"));
        if (!Guid.TryParse(id, out var guid)) return null;
        var type = Text(Get(item, "Type"));
        if (type != "Series" && type != "Movie") return null;
        var isAnime = category == "anime";
        LocalNfo? nfo = null;
        if (isAnime)
        {
            var local = _library.GetItemById(guid);
            var root = Path.GetFullPath(Plugin.Instance?.Configuration.AnimeRoot
                ?? throw new InvalidOperationException("Anime NFO root is not configured"));
            if (local is null || !IsBelowRoot(local.Path, root)) return null;
            nfo = ReadNfo(local.Path, type);
        }
        var title = isAnime
            ? (!string.IsNullOrWhiteSpace(nfo?.OriginalTitle) ? nfo.OriginalTitle : "Brak tytułu w NFO")
            : Text(Get(item, "Name"));
        return new HomeTile
        {
            id = guid.ToString("N"),
            type = type,
            anime = isAnime,
            title = title,
            year = isAnime ? nfo?.Year ?? "" : Text(Get(item, "ProductionYear")),
            format = isAnime ? nfo?.Kind ?? "" : "",
            description = isAnime ? nfo?.Plot ?? "" : Text(Get(item, "Overview")),
            genres = (isAnime ? nfo?.Genres ?? new List<string>() : Strings(Get(item, "Genres"))).Take(3).ToList(),
            hasPrimary = HasPrimaryImage(item),
            seasons = type == "Series" ? PositiveInt(Get(item, "ChildCount")) : null,
            episodes = type == "Series" ? PositiveInt(Get(item, "RecursiveItemCount")) : null,
            userRating = PersonalRating(item),
            watchStatus = WatchStatus(item)
        };
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
                var root = Path.GetFullPath(Plugin.Instance?.Configuration.AnimeRoot
                    ?? throw new InvalidOperationException("Anime NFO root is not configured"));
                var category = local is not null && IsBelowRoot(local.Path, root) ? "anime" : "movies";
                var tile = MakeHomeTile(json, category);
                if (tile is not null) cards[id] = tile;
            }
        }
        HomeResumeTile? Project(ResumeItem entry)
        {
            if (!cards.TryGetValue(entry.catalog_id, out var tile)) return null;
            return new HomeResumeTile(tile, entry.id, entry.progress_percent,
                entry.season, entry.episode, entry.next_up);
        }
        return new HomeResumeResponse(
            entries.items.Select(Project).Where(e => e is not null).Cast<HomeResumeTile>().ToList(),
            entries.hidden.Select(Project).Where(e => e is not null).Cast<HomeResumeTile>().ToList());
    }

'''
s=s.replace(needle,block+needle)
# optimize hide validation
old='''        var (_, _, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        // Only currently visible Jellyfin media can be hidden: never accept arbitrary item IDs.
        var catalog = await ReadForAuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
        if (!catalog.items.Any(x => x.id.Equals(catalogId.ToString(), StringComparison.OrdinalIgnoreCase)))
            throw new UnauthorizedAccessException("Item is not accessible to this user");
'''
new='''        var (origin, auth, userId) = await AuthenticatedUserAsync(caller, cancel).ConfigureAwait(false);
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
'''
assert old in s;s=s.replace(old,new)
# Add types
s += '''
// Personal home rows; every instance is derived from an allowed user-scoped Jellyfin item.
public sealed record HomeLibrary(string id, string name, string category, string href);
public sealed record HomeShelfResponse(string libraryId, string libraryName, string mode,
    int startIndex, bool hasMore, List<HomeTile> items);
public sealed class HomeTile
{
    public string id { get; set; } = string.Empty;
    public string type { get; set; } = string.Empty;
    public bool anime { get; set; }
    public string title { get; set; } = string.Empty;
    public string year { get; set; } = string.Empty;
    public string format { get; set; } = string.Empty;
    public string description { get; set; } = string.Empty;
    public List<string> genres { get; set; } = new();
    public bool hasPrimary { get; set; }
    public int? seasons { get; set; }
    public int? episodes { get; set; }
    public double? userRating { get; set; }
    public string watchStatus { get; set; } = string.Empty;
}
public sealed record HomeResumeTile(HomeTile item, string resumeId, double progress,
    int? season, int? episode, bool nextUp);
public sealed record HomeResumeResponse(List<HomeResumeTile> items, List<HomeResumeTile> hidden);
'''
p.write_text(s)
print('service lines:', len(s.splitlines()))
