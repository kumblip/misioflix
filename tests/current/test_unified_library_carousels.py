"""Single server-authorized shelf discovery path for every Jellyfin library."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
S=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')
A=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/configPage.html').read_text(encoding='utf-8')
H=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf-8')
class UnifiedCarousels(unittest.TestCase):
    def test_all_accessible_views_in_home_even_without_collection_type(self):
        method=S.split('private async Task<List<HomeLibrary>> GetHomeLibrariesAsync',1)[1].split('ReadCollectionMembershipAsync',1)[0]
        self.assertIn('Users/{Uri.EscapeDataString(userId)}/Views',method)
        self.assertIn('_ => "mixed"',method)
        self.assertNotIn('if (string.IsNullOrEmpty(category)) continue;',method)
    def test_every_virtual_folder_can_be_ordered(self):
        self.assertIn('libraries.filter(x=>normalizedId(x.ItemId)).map(x=>{',A)
        self.assertIn('config.HomeCarouselOrder=rows.map(row=>row.id)',A)
        self.assertIn('config.HiddenHomeCarousels=rows.filter(row=>!row.visible)',A)
    def test_shelf_scoped_to_authenticated_parent_for_all_roles(self):
        block=S.split('public async Task<HomeShelfResponse> ReadHomeShelfAsync(',1)[1].split('public async Task<HomeShelfResponse> ReadHomeCollectionsAsync(',1)[0]
        self.assertIn('if (view is null) throw new UnauthorizedAccessException',block)
        self.assertIn('ParentId={libraryId:N}&Recursive=false',block)
        self.assertIn('MakeHomeTile(item, view.category)',block)
        self.assertIn('MakeLibraryFolderTile(item, view.category)',block)
        self.assertIn('Recursive=true&IncludeItemTypes={types}',block)
        self.assertNotIn('view.category == "anime" && list.Count == 0',block)
        self.assertIn('nextStartIndex',S)
        self.assertIn('data.nextStartIndex',H)
    def test_nfo_metadata_enrichment_must_not_hide_library_card(self):
        block=S.split('private HomeTile? MakeHomeTile(',1)[1].split('private HomeTile? MakeLibraryFolderTile(',1)[0]
        self.assertIn('if (local is not null) nfo = ReadNfo(local.Path, type);',block)
        self.assertNotIn('if (local is null || AnimeSource(local.Path).Length == 0) return null;',block)
        self.assertIn('nfo?.Genres',block)
    def test_flags_and_simkl_still_separate_from_shelf(self):
        self.assertIn('ReadLanguageFlagsForAuthenticatedUserAsync',S)
        self.assertIn('IsSimklAnime(',S)
        self.assertIn('const collectionsShelf=',H)
if __name__=='__main__': unittest.main()
