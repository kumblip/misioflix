"""Regression: untyped Jellyfin anime libraries and empty mixed shelves."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CONFIG=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/configPage.html').read_text(encoding='utf-8')
SERVICE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')
class CarouselVirtualFolders(unittest.TestCase):
    def test_missing_collection_type_is_treated_as_mixed_in_both_panels(self):
        self.assertIn("kind:String(lib.CollectionType||'mixed')", CONFIG)
        self.assertIn("const kind=String(x.CollectionType||'mixed').toLowerCase()", CONFIG)
        self.assertIn("||role.startsWith('anime_')", CONFIG)
        self.assertIn("const id=normalizedId(x.ItemId),entry=mapping.get(id)", CONFIG)
    def test_user_scoped_mixed_library_fallback(self):
        section=SERVICE.split('public async Task<HomeShelfResponse> ReadHomeShelfAsync(',1)[1].split('public async Task<HomeShelfResponse> ReadHomeCollectionsAsync(',1)[0]
        self.assertIn('view.category == "anime" && list.Count == 0', section)
        self.assertIn('Users/{Uri.EscapeDataString(userId)}/Items?', section)
        self.assertIn('ParentId={libraryId:N}&Recursive=false', section)
        self.assertIn('MakeHomeTile(item, "anime") ?? MakeAnimeFolderTile(item)', section)
        self.assertIn('catch (HttpRequestException ex) when (ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest)',section)
        self.assertIn('GetHomeLibrariesAsync(origin, auth, userId, cancel)',section)
    def test_folder_path_and_nfo_guards_remain(self):
        self.assertIn('AnimeSource(local.Path).Length == 0',SERVICE)
        self.assertIn('AnimeFolderMediaType(local.Path)',SERVICE)
        self.assertIn('File.Exists(Path.Combine(path, "tvshow.nfo"))',SERVICE)
        self.assertIn('File.Exists(Path.Combine(path, "movie.nfo"))',SERVICE)
if __name__=='__main__': unittest.main()
