"""Static integration contract: role-based MAL routing across authorized items.
Live Jellyfin and .NET compilation are still required for end-to-end verification.
"""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]/'src/Jellyfin.Plugin.MisioFlix'
S = (ROOT/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf8')
P = (ROOT/'Services/MisioFlixSimklPlaybackHostedService.cs').read_text(encoding='utf8')
W = (ROOT/'Web/home.js').read_text(encoding='utf8')

class MalLibraryRole153(unittest.TestCase):
    def test_stable_id_priority_and_all_three_anime_roles(self):
        roles = S.split('private static string ManagedLibraryRoleForMembership(',1)[1].split('private static string AnimeSourceForLibraryMembership(',1)[0]
        self.assertIn('Guid.TryParse(mapping.LibraryId, out var id) && ids.Contains(id.ToString("N"))',roles)
        self.assertIn('roles.Contains("anime_both") || (roles.Contains("anime_pl") && roles.Contains("anime_eng"))',roles)
        for role in ('anime_pl','anime_eng','simkl'):
            self.assertIn('return "'+role+'";',roles)
        mapping = S.split('private static string AnimeSourceForLibraryMembership(',1)[1].split('private static string AnimeSource(',1)[0]
        for role,source in [('anime_pl','"lektor"'),('anime_eng','"original"'),('anime_both','"both"'),('simkl','string.Empty')]:
            self.assertIn(f'"{role}" => {source}',mapping)
        self.assertIn('_ => AnimeSource(mediaPath)',mapping)
        self.assertIn('library.GetCollectionFolders(item).Select(folder => folder.Id.ToString("N"))',S)
        self.assertIn('AnimeSourceForLibraryMembership(CollectionLibraryIds(library, item), item.Path)',S)

    def test_mal_resolution_requires_authorized_item_and_local_nfo(self):
        resolve=S.split('public async Task<int> AuthorizedMalIdAsync(',1)[1].split('/// <summary>Update per-user',1)[0]
        self.assertLess(resolve.index('found.ValueKind != JsonValueKind.Object'),resolve.index('AnimeSourceForItem(_library, local)'))
        self.assertLess(resolve.index('SameGuid(Text(Get(season.RootElement, "SeriesId")), catalogId)'),resolve.index('ReadNfo(local.Path, type, requireMalId: true)'))
        self.assertLess(resolve.index('if (animeSource.Length == 0)'),resolve.index('ReadNfo(local.Path, type, requireMalId: true)'))
        self.assertIn('AnimeSourceForItem(_library, firstLocal).Length != 0',resolve)
        self.assertNotIn('AnimeSource(local.Path)',resolve)

    def test_cards_overlays_and_filter_share_library_resolution(self):
        for method,end,item in [('ReadHomeRecommendationCardsAsync','ReadRecommendationWatchStatusesAsync','media'),('ReadRecommendationWatchStatusesAsync','ReadHomeResumeAsync','local'),('ReadHomeResumeAsync','ReadOverlaysAsync','local')]:
            # The next method delimiter may be preceded by XML comments, which is harmless.
            section=S.split(method+'(',1)[1].split(end+'(',1)[0]
            self.assertIn(f'AnimeSourceForItem(_library, {item})',section)
        self.assertIn('var anime = AnimeSourceForItem(_library, libItem).Length > 0;',S)
        self.assertIn('v10-confirmed-library-roles',W)

    def test_simkl_guard_uses_same_roles_and_excludes_unknown(self):
        guard=S.split('internal static bool IsSimklAnime(',1)[1].split('private SimklMediaTarget MakeSimklTarget',1)[0]
        self.assertIn('ManagedLibraryRoleForMembership(CollectionLibraryIds(library, local))',guard)
        self.assertIn('if (role.Length == 0) role = ManagedLibraryRoleFromPath(local.Path);',guard)
        self.assertIn('return role != "simkl" && role != "other";',guard)
        self.assertIn('IsSimklAnime(_library, mediaRoot,',P)
        self.assertIn('IsSimklAnime(_library, item,',P)

if __name__=='__main__': unittest.main()
