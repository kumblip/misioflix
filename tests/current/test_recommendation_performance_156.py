"""Source contracts; live .NET/Jellyfin load testing still needed."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]/'src/Jellyfin.Plugin.MisioFlix'
S=(ROOT/'Services/MisioFlixCatalogService.cs').read_text()
H=(ROOT/'Web/home.js').read_text()
class RecommendationPerformance156(unittest.TestCase):
 def test_authorized_items_and_shared_library_membership(self):
  b=S.split('public async Task<List<HomeTile>> ReadHomeRecommendationCardsAsync(',1)[1].split('public async Task<Dictionary<string, RecommendationFrameInput>>',1)[0]
  self.assertIn('AuthenticatedUserAsync(caller, cancel)',b)
  self.assertIn('EnableUserData=true&EnableTotalRecordCount=false',b)
  self.assertLess(b.index('!allowed.Contains(id)'),b.index('_library.GetItemById(id)'))
  self.assertEqual(b.count('CollectionLibraryIds(_library, media)'),1)
  self.assertIn('MakeHomeTile(item, category, media, libraryIds)',b)
  self.assertIn('ReadCollectionMembershipAsync(origin, auth, userId, found.Keys, cancel)',b)
  self.assertIn('ManagedLibraryRoleForMembership(libraryIds ?? CollectionLibraryIds(library, local))',S)
 def test_no_cache_eviction_on_decorating_dom(self):
  self.assertNotIn("window.addEventListener('misioflix-mal-cards-updated',clearRecommendationCardCache)",H)
  self.assertIn("window.addEventListener('misioflix-mal-cache-changed',()=>{\n    clearRecommendationCardCache();",H)
  self.assertIn('RECOMMENDATION_CARD_TTL_MS = 45_000',H)
 def test_count_still_fresh_and_user_scoped(self):
  self.assertIn('GetCollectionsContainingItem(user, itemId)',S)
  self.assertIn('EnableTotalRecordCount=true&EnableUserData=false&EnableImages=false&Limit=1',S)
  self.assertIn('Task.WhenAll(countJobs)',S)
if __name__=='__main__':unittest.main()
