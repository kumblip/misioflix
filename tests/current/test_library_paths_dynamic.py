import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
CONFIG=(SRC/'Configuration/PluginConfiguration.cs').read_text(encoding='utf-8')
CATALOG=(SRC/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')
PANEL=(SRC/'Web/configPage.html').read_text(encoding='utf-8')
HOME=(SRC/'Web/home.js').read_text(encoding='utf-8')

class DynamicLibraryPaths(unittest.TestCase):
    def test_real_jellyfin_library_enumeration_and_manual_save_only(self):
        self.assertIn("ApiClient.getUrl('Library/VirtualFolders')",PANEL)
        self.assertIn("ApiClient.updatePluginConfiguration(pluginId,config)",PANEL)
        self.assertIn('config.LibraryPathsConfigured=true',PANEL)
        self.assertNotIn("fetch(api('Library/VirtualFolders'),{method:'POST'",PANEL)
        self.assertIn('Użyj ścieżek Jellyfina',PANEL)
        self.assertIn('mf-library-reload',PANEL)
        self.assertIn('mf-library-save',PANEL)

    def test_stable_library_id_roles_and_multiple_roots(self):
        for value in ['LibraryPathsConfigured','LibraryPathsRevision','MisioFlixLibraryPath',
                      'LibraryId','JellyfinPaths','Paths','AudioLanguage']:
            self.assertIn(value,CONFIG)
        self.assertIn('mapped.Role is "anime_pl" or "anime_eng" or "anime_both"',CATALOG)
        self.assertIn('foreach (var entry in config.LibraryPaths ?? new())',CATALOG)
        self.assertIn('foreach (var path in entry.Paths ?? new())',CATALOG)
        self.assertIn('if (config?.LibraryPathsConfigured == true)',CATALOG)
        self.assertIn('return string.Empty;',CATALOG)
        self.assertIn('config.AnimeRoot=pl?pl.paths[0]',PANEL)
        self.assertIn('config.AnimeOriginalRoot=en?en.paths[0]',PANEL)

    def test_cache_revision_invalidation_on_all_devices(self):
        self.assertIn('config.LibraryPathsRevision=String(Date.now())',PANEL)
        self.assertIn('new HomeLibrary(guid.ToString("N"), name, category, href, revision)',CATALOG)
        self.assertIn('let libraryPathsRevision',HOME)
        self.assertIn('libs[0].catalogRevision',HOME)
        self.assertIn('catalogCache.clear();catalogFetchedAt.clear()',HOME)
        self.assertIn("catalogSchemaVersion = 'v5-library-id-anime-audio-confidence'",HOME)

    def test_no_media_write_or_library_changes(self):
        self.assertIn('never writes media files',CONFIG)
        self.assertIn('Library/VirtualFolders',PANEL)
        self.assertNotIn("ApiClient.updateVirtualFolder",PANEL)
        self.assertNotIn("method:'DELETE'",PANEL)
