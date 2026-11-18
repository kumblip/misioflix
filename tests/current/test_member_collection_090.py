"""Regression: BoxSet membership count comes from Jellyfin, and CSS backup stays external."""
from version_contract import CURRENT_RELEASE
from pathlib import Path
import json,re,unittest
R=Path(__file__).resolve().parents[2]
S=(R/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text()
H=(R/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text()
C=(R/'src/Jellyfin.Plugin.MisioFlix/Web/client.js').read_text()
CSS=(R/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text()
class MemberCollection090(unittest.TestCase):
 def test_user_permission_and_real_membership(self):
  self.assertIn('GetCollectionsContainingItem(user, itemId)',S)
  self.assertIn('_users.GetUserById(userGuid)',S)
  self.assertIn('ParentId={collectionId:N}',S)
  self.assertIn('TotalRecordCount',S)
  self.assertIn('Uri.EscapeDataString(userId)',S)
  self.assertIn('new SemaphoreSlim(3, 3)',S)
  self.assertNotIn('_collectionCountCache',S)
 def test_both_home_and_native_overlay_enriched(self):
  self.assertGreaterEqual(S.count('ReadCollectionMembershipAsync('),3)
  self.assertIn('tile.memberCollectionCount = details.Count',S)
  self.assertIn('info.memberCollectionCount = details.Count',S)
  self.assertIn("item.type==='Movie'||item.type==='Series'",H)
  self.assertIn("own('span','mf-home-box-icon','📦')",H)
  self.assertIn("mf-native-collection-member",C)
  self.assertIn("makeEl('span','mf-native-box-icon','📦')",C)
 def test_not_based_on_unplayed_indicator_or_text_matching(self):
  self.assertNotIn('UnplayedItemCount',S[S.index('private async Task<Dictionary<Guid, (int Count, string Name)>>'):S.index('public async Task<HomeShelfResponse>')])
  self.assertIn('if(pawStats.length||collectionSize)',C)
  self.assertIn("'data-mf-member-collection-count'",C)
  self.assertIn('data-mf-member-collection-name',C)
 def test_css_export_is_separate(self):
  x=(R/'Jellyfin_Wlasny_CSS.txt').read_text()
  for k in ['.starRatingContainer','.mediaInfoCriticRating','.mediaInfoOfficialRating','.itemExternalLinks','.itemTags','.itemDetailsGroup']:
   self.assertIn(k,x)
  self.assertIn('Gatunki',x)
  self.assertIn('nie przesłał pełnej',x)
  self.assertNotIn('/* Standardowe oceny Jellyfina: gwiazdka',CSS)
  self.assertTrue((R/'zrobionepozamisioflixem.txt').exists())
 def test_version(self):
  self.assertEqual(json.loads((R/'meta.json').read_text())['version'],CURRENT_RELEASE)
if __name__=='__main__':unittest.main()
