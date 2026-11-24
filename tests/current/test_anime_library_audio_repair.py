import unittest
from pathlib import Path
root=Path(__file__).resolve().parents[2]
s=(root/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text(encoding='utf8')
h=(root/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf8')

class AnimeLibraryAudioRepair(unittest.TestCase):
    def test_uses_same_authorized_library_role_for_catalog_as_home(self):
        catalog=s.split('public async Task<CatalogResponse> ReadForAuthenticatedUserAsync(',1)[1].split('// Home shelves are small',1)[0]
        for code in ['GetHomeLibrariesAsync(origin, auth, userId, cancel)',
                     'var animeLibraryIds = allowed.Where(view => view.category == "anime")',
                     'var inAnimeLibrary = libraryIds.Any(animeLibraryIds.Contains)',
                     'var isAnime = inAnimeLibrary || animeSource.Length != 0',
                     'AnimeSourceForLibraryMembership(libraryIds, mediaPath)',
                     'anime = true']:
            self.assertIn(code,catalog)
    def test_language_flag_index_is_shared_and_unknown_is_not_non_pl(self):
        for code in ['"language-flags-index.json"','private string LibraryAudioHint(Guid itemId)',
                     '"anime_pl" => "pl"', '"anime_eng" => "en"',
                     'public bool AudioClassificationComplete => _sawAudioTrack && !_unclassifiedAudio',
                     '!flags.AudioClassificationComplete',
                     'incomplete.Contains(key) || !union.AudioClassificationComplete',
                     'foreach (var (seasonId,seriesId) in seasonToSeries)',
                     'seriesFlags.Merge(seasonFlags)']:
            self.assertIn(code,s)
        self.assertIn('return flags.partial ? null : false',s)
        self.assertIn("if(typeof item?.pl_audio!=='boolean')return false",h)
    def test_cached_old_classifications_are_invalidated(self):
        self.assertIn('v10-confirmed-library-roles',h)
        self.assertIn('if(!recommendationIncludeAnime&&isAnime(item))return false',h)
        self.assertIn("lib.category==='anime'",h)
    def test_release_version_remains_user_controlled(self):
        import json
        meta=json.loads((root/'meta.json').read_text(encoding='utf8'))
        self.assertRegex(meta['version'],r'^0\.4\.\d+\.0$')

if __name__=='__main__':unittest.main()
