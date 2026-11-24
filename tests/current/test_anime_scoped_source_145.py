"""Static guards for C# scope classification; requires live Jellyfin for integration."""
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
S = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text()
C = S.split('public async Task<CatalogResponse> ReadForAuthenticatedUserAsync(',1)[1].split('// An unknown/incomplete index',1)[0]

class ScopedAnimeSource145(unittest.TestCase):
    def test_scope_is_verified_before_using_configured_role(self):
        self.assertLess(C.index('if (selected is null) throw new UnauthorizedAccessException'), C.index('scopedAnimeSource = AnimeSourceForLibraryMembership(new[] { selected.id }, null)'))
        self.assertIn('if (includeAnimeFolders)\n                scopedAnimeSource', C)
        self.assertIn('ParentId={libraryId.Value:N}', C)
    def test_scope_wins_over_ambiguous_membership_and_legacy_falls_back(self):
        self.assertIn('var scopedAnimeSource = string.Empty;', C)
        self.assertIn('if (includeAnimeFolders) inAnimeLibrary = true;', C)
        self.assertIn('var animeSource = scopedAnimeSource.Length != 0\n                    ? scopedAnimeSource\n                    : AnimeSourceForLibraryMembership(libraryIds, mediaPath);', C)
        self.assertIn('anime_source = animeSource', C)
        self.assertIn('if (roles.Contains("anime_pl")) return "anime_pl";', S)
        self.assertIn('if (roles.Contains("anime_eng")) return "anime_eng";', S)
        self.assertIn('if (roles.Contains("anime_both")', S)
