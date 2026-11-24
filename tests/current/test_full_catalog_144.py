"""Source-level guards for server pagination; live Jellyfin is tested in deployment."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'src/Jellyfin.Plugin.MisioFlix'
SERVICE = (SRC / 'Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')
CATALOG = SERVICE.split('public async Task<CatalogResponse> ReadForAuthenticatedUserAsync(', 1)[1].split('// An unknown/incomplete index', 1)[0]
HOME = (SRC / 'Web/home.js').read_text(encoding='utf-8')

class FullCatalog144(unittest.TestCase):
    def test_no_fixed_ceiling_and_no_repeated_total_count(self):
        self.assertNotIn('maxItems', CATALOG)
        self.assertNotIn('16000', CATALOG)
        self.assertIn('const int pageSize = 400;', CATALOG)
        self.assertIn('while (true)', CATALOG)
        self.assertIn('EnableTotalRecordCount=false', CATALOG)
        self.assertIn('SortBy=SortName&SortOrder=Ascending', CATALOG)

    def test_advance_raw_length_and_not_filtered_output_or_page_limit(self):
        self.assertIn('var received = items.GetArrayLength();', CATALOG)
        self.assertIn('if (received == 0) break;', CATALOG)
        self.assertNotIn('received < pageSize', CATALOG)
        self.assertIn('start = checked(start + received);', CATALOG)
        self.assertIn('StartIndex={start}&Limit={pageSize}', CATALOG)

    def test_malformed_or_repeated_page_fails_instead_of_saving_partial_results(self):
        self.assertIn('items.ValueKind != JsonValueKind.Array)\n                throw new HttpRequestException', CATALOG)
        self.assertIn('var seen = new HashSet<Guid>();', CATALOG)
        self.assertIn('!seen.Add(guid)', CATALOG)
        self.assertIn('if (seen.Count == seenBefore)\n                throw new HttpRequestException', CATALOG)
        self.assertGreaterEqual(CATALOG.count('cancel.ThrowIfCancellationRequested()'), 2)

    def test_user_visibility_and_season_nfo_are_retained(self):
        for fragment in ['Users/Me', 'GetHomeLibrariesAsync(origin, auth, userId, cancel)',
                         'Requested library is not accessible', 'Items?UserId=',
                         'ParentId={libraryId.Value:N}', 'IncludeItemTypes=Movie,Series,Season',
                         'GetJsonAsync(origin, path, auth, cancel)', '_library.GetItemById(guid)',
                         'AnimeSourceForLibraryMembership(libraryIds, mediaPath)', 'ReadNfo(mediaPath, itemType)',
                         'NormalizeCatalogGuid(Get(json, "SeriesId"), Get(json, "ParentId"))']:
            self.assertIn(fragment, CATALOG)
        self.assertLess(CATALOG.index('!seen.Add(guid)'), CATALOG.index('_library.GetItemById(guid)'))

    def test_old_truncated_cache_is_invalidated_with_identity_scope_unchanged(self):
        self.assertIn("catalogSchemaVersion = 'v9-anime-mal-library-role'", HOME)
        self.assertIn("compactId(serverId) + ':' + compactId(userId) + ':' + catalogSchemaVersion + ':' + libraryPathsRevision", HOME)
        self.assertIn("capturedToken===currentToken() && fullKey===catalogFullKey(libraryId)", HOME)
        self.assertIn('const data=await getCatalogForSearch()', HOME)
