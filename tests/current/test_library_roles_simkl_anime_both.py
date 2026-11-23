"""Regression for admin-assigned library roles and low-I/O search filters."""
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT/'src/Jellyfin.Plugin.MisioFlix'
CONFIG = (SRC/'Configuration/PluginConfiguration.cs').read_text('utf-8')
CATALOG = (SRC/'Services/MisioFlixCatalogService.cs').read_text('utf-8')
PANEL = (SRC/'Web/configPage.html').read_text('utf-8')
HOME = (SRC/'Web/home.js').read_text('utf-8')
PLAY = (SRC/'Services/MisioFlixSimklPlaybackHostedService.cs').read_text('utf-8')

class LibraryRoles(unittest.TestCase):
    def test_all_four_roles_and_legacy_compatibility(self):
        for key in ('simkl', 'anime_pl', 'anime_eng', 'anime_both'):
            self.assertIn(f"'{key}'", PANEL)
        self.assertIn("saved?.Role==='other'?'simkl'",PANEL)
        self.assertIn('public string Role { get; set; } = "simkl";', CONFIG)

    def test_authoritative_path_map_keeps_library_id_and_renames(self):
        self.assertIn('normalizedId(lib.ItemId)', PANEL)
        self.assertIn('LibraryId:row.id', PANEL)
        self.assertIn('config.LibraryPathsRevision=String(Date.now())',PANEL)
        self.assertIn('ManagedLibraryRoleFromPath(mediaPath)', CATALOG)
        self.assertIn('bestLength = fullRoot.Length', CATALOG)
        self.assertIn('LibraryPathsConfigured', CATALOG)

    def test_pl_eng_library_is_both_without_duplicates(self):
        self.assertIn('"anime_both" => "both"',CATALOG)
        self.assertIn('"anime_both"',CATALOG)
        self.assertIn("source!=='both' && source!==mode",HOME)
        self.assertIn("['lektor','Polski (lektor)']",HOME)
        self.assertIn("['original','Bez lektora (ENG)']",HOME)
        self.assertIn("['all','Wszystkie (PL + ENG)']",HOME)
        self.assertIn("lektor.value='lektor'",HOME)

    def test_library_filters_independent_of_language_filters(self):
        self.assertIn('state.libraryStates',HOME)
        self.assertIn('const libraryOptions=scopedLibraries.map', HOME)
        self.assertIn('if(state.libraryStates && !allowGroup',HOME)
        self.assertIn('scopedLibraries.filter',HOME) if 'scopedLibraries.filter' in HOME else self.assertIn('librariesCache.filter',HOME)

    def test_simkl_skip_tag_io_after_explicit_map(self):
        guard=CATALOG[CATALOG.index('internal static bool IsSimklAnime'):CATALOG.index('private SimklMediaTarget MakeSimklTarget')]
        self.assertLess(guard.index('if (config?.LibraryPathsConfigured == true)'),guard.index('ReadNfo(local.Path,type)?.AnimeTag == true'))
        self.assertIn('return role != "simkl" && role != "other";', guard)
        self.assertIn('MisioFlixCatalogService.IsSimklAnime',PLAY)
        self.assertIn('ReadNfo(local.Path,type)?.AnimeTag == true',guard)  # legacy installations

    def test_unmapped_not_sent_to_simkl_and_anime_nfo_unchanged(self):
        self.assertIn('return role != "simkl" && role != "other";', CATALOG)
        self.assertIn('var local = ReadNfo(mediaPath, Text(Get(json, "Type")));', CATALOG)
        self.assertIn('Fields=Genres,Overview,DateCreated,ChildCount,RecursiveItemCount,ParentId', CATALOG)
        self.assertIn('mal_id = local?.MalId', CATALOG)
        self.assertIn('var mapped = settings?.LibraryPathsConfigured == true',CATALOG)

    def test_search_catalog_is_cached_and_not_fetched_on_home(self):
        self.assertIn("const SEARCH_CATALOG_DB = 'misioflix-search-catalog-v1'",HOME)
        self.assertIn('readCatalogSnapshot(fullKey)',HOME)
        self.assertIn('getCatalogForSearch(lib.id,force)',HOME)
        self.assertIn('CATALOG LOADS ONLY AFTER THE USER OPENS SEARCH',HOME)
        self.assertIn('const SEARCH_CATALOG_FRESH_MS = 24 * 60 * 60 * 1000',HOME)

    def test_jellyfin_paths_not_modified(self):
        self.assertIn("ApiClient.getUrl('Library/VirtualFolders')",PANEL)
        self.assertNotIn('ApiClient.updateVirtualFolder',PANEL)
        self.assertIn('Użyj ścieżek Jellyfina',PANEL)

if __name__=='__main__':unittest.main()
