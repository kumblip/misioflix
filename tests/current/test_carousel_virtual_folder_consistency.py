"""Regression: untyped Jellyfin anime libraries and empty mixed shelves."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CONFIG=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/configPage.html').read_text(encoding='utf-8')
SERVICE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')
class CarouselVirtualFolders(unittest.TestCase):
    def test_all_virtual_folders_are_listed_without_type_or_role_filter(self):
        self.assertIn("kind:String(lib.CollectionType||'mixed')", CONFIG)
        self.assertIn('libraries.filter(x=>normalizedId(x.ItemId)).map(x=>{', CONFIG)
        self.assertNotIn("||role.startsWith('anime_')",CONFIG)
        self.assertIn('const id=normalizedId(x.ItemId),entry=mapping.get(id)', CONFIG)
    def test_same_authenticated_shelf_query_for_every_role(self):
        section=SERVICE.split('public async Task<HomeShelfResponse> ReadHomeShelfAsync(',1)[1].split('public async Task<HomeShelfResponse> ReadHomeCollectionsAsync(',1)[0]
        self.assertIn('GetHomeLibrariesAsync(origin, auth, userId, cancel)',section)
        self.assertIn('ParentId={libraryId:N}&Recursive=false',section)
        self.assertIn('MakeHomeTile(item, view.category)',section)
        self.assertIn('MakeLibraryFolderTile(item, view.category)',section)
        self.assertIn('Users/{Uri.EscapeDataString(userId)}/Items?',section)
        self.assertNotIn('view.category == "anime" && list.Count == 0',section)
        self.assertIn('catch (HttpRequestException ex) when (ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest)',section)
    def test_folder_media_identity_is_from_local_nfo_not_library_name(self):
        self.assertIn('AnimeFolderMediaType(local.Path)',SERVICE)
        self.assertIn('File.Exists(Path.Combine(path, "tvshow.nfo"))',SERVICE)
        self.assertIn('File.Exists(Path.Combine(path, "movie.nfo"))',SERVICE)
        folder=SERVICE.split('private HomeTile? MakeLibraryFolderTile(',1)[1].split('Only returns item IDs',1)[0]
        self.assertNotIn('AnimeSource(local.Path).Length == 0',folder)
if __name__=='__main__': unittest.main()
