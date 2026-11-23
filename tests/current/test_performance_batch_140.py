"""Review the strictly scoped first-page batching and caches (not a .NET build)."""
from pathlib import Path
import unittest
R=Path(__file__).resolve().parents[2]
S=(R/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text('utf8')
C=(R/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs').read_text('utf8')
H=(R/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text('utf8')
D=(R/'src/Jellyfin.Plugin.MisioFlix/Web/details.js').read_text('utf8')
class Performance140(unittest.TestCase):
    def test_first_page_only_and_role_safe(self):
        self.assertIn('[HttpGet("api/home/shelves")]',C)
        self.assertIn('[Authorize]\n    public async Task<IActionResult> HomeShelves',C)
        self.assertIn('pieces.Length is < 1 or > 12',C)
        self.assertIn('ReadHomeShelvesAsync(Request, libraryIds, cancel)',C)
        body=S.split('public async Task<List<HomeShelfResponse>> ReadHomeShelvesAsync(',1)[1].split('public async Task<HomeShelfResponse> ReadHomeCollectionsAsync(',1)[0]
        self.assertIn('AuthenticatedUserAsync(caller, cancel)',body)
        self.assertIn('GetHomeLibrariesAsync(origin, auth, userId, cancel)',body)
        self.assertIn('views.FirstOrDefault',body)
        self.assertIn('.Where(x => x.View is not null)',body)
        self.assertIn('new SemaphoreSlim(3, 3)',body)
        self.assertIn('entry.View!, entry.Id, "latest", 0, 10, cancel',body)
        self.assertIn("row.lib.id==='collections'",H)
        self.assertIn("void loadShelf(row,'latest',true)",H)
    def test_memory_only_auth_for_proposals(self):
        self.assertIn('const recommendationCardCache = new Map()',H)
        self.assertIn('RECOMMENDATION_CARD_TTL_MS = 45_000',H)
        self.assertIn('recommendationCardCache.clear()',H)
        self.assertIn('const allowed=new Set(missing)',H)
        self.assertIn('recommendationCards(batch)',H)
        self.assertIn('recommendationCards(ids)',H)
        self.assertIn('recommendationGenresById=new Map(',H)
    def test_one_play_method(self):
        self.assertIn('window.MisioFlixPlayItem = playEpisode;',D)
        self.assertIn('await nativePlay(entry.resumeId)',H)
        self.assertNotIn('tryNativeResume(',H)
        self.assertNotIn('playViaItemDetails(',H)
        self.assertNotIn('Date.now() - start >= 750',D)
if __name__=='__main__':unittest.main()
