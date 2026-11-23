"""Static contract checks for collection safety, season membership and per-row library filters.
Runtime Jellyfin/BoxSet tests are still required after publishing this change.
"""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SERVICE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixNfoCollectionsService.cs').read_text('utf8')
CONFIG=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Configuration/PluginConfiguration.cs').read_text('utf8')
PAGE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/configPage.html').read_text('utf8')
HOME=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text('utf8')
CATALOG=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text('utf8')
ROUTER=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixController.cs').read_text('utf8')

class SeasonsAndLibraryProposals(unittest.TestCase):
    def test_all_three_nfo_roots_and_types(self):
        for kind in ('Movie', 'Series', 'Season', 'Folder'):
            self.assertIn('BaseItemKind.'+kind, SERVICE)
        for name in ('movie.nfo', 'tvshow.nfo', 'season.nfo'):
            self.assertIn('"'+name+'"', SERVICE)
        self.assertIn('root.Name.LocalName.Equals("season"',SERVICE)
        self.assertIn('CandidateNfoPath',SERVICE)
        self.assertIn('DistinctBy(pair => pair.nfo.Path',SERVICE)
    def test_season_object_identity_never_parent_series(self):
        self.assertIn('else if (isSeason) seasonIds.Add(item.Id)',SERVICE)
        self.assertIn('ids.Add(item.Id);',SERVICE)
        self.assertIn('expectedSeasons',SERVICE)
        self.assertIn('linkedSeasons',SERVICE)
        self.assertIn('MissingSeasonCount',SERVICE)
    def test_protected_deletion_on_missing_media(self):
        self.assertIn('managedItemIds.Any(id => !scannedIds.Contains(id))', SERVICE)
        self.assertIn('if (canRemove)',SERVICE)
        self.assertIn('if (configured?.LibraryPathsConfigured == true)',SERVICE)
        self.assertIn('!Directory.Exists(root)', SERVICE)
        self.assertIn('if (canRemove)\n                foreach (var id in ledger.NfoCache.Keys',SERVICE)
        self.assertIn('File.Move(tmp, _statePath, true)',SERVICE)
        self.assertIn('DtdProcessing = DtdProcessing.Prohibit',SERVICE)
        self.assertIn('XmlResolver = null',SERVICE)
    def test_detailed_report(self):
        for key in ('NfoCollectionLibraryDiagnostic','SeasonsScanned','TotalJellyfinItems','TotalNfoRead','TotalItemsWithSet','CompleteScan'):
            self.assertIn(key,SERVICE)
        for key in ('Biblioteki Jellyfina','Odczytane NFO','seasonsScanned','missingSeasonCount','completeScan'):
            self.assertIn(key.lower(), PAGE.lower())
    def test_proposals_default_all_including_future(self):
        self.assertIn('AllLibraries { get; set; } = true',CONFIG)
        self.assertIn('List<string> LibraryIds',CONFIG)  # legacy compatibility
        self.assertIn('List<string> ExcludedLibraryIds',CONFIG)
        self.assertIn('allLibraries = x?.AllLibraries != false',ROUTER)
        self.assertIn('libraryIds = (x?.LibraryIds',ROUTER)  # legacy compatibility
        self.assertIn('excludedLibraryIds = (x?.ExcludedLibraryIds',ROUTER)
        self.assertIn('library_ids = libraryIds', CATALOG)
        self.assertIn('GetCollectionFolders(originalItem)',CATALOG)
        self.assertIn('preset.allLibraries===false?new Set(preset.libraryIds)',HOME)  # legacy conversion
        self.assertIn('preset.excludedLibraryIds.length',HOME)
        self.assertIn('item.library_ids.every(id=>excluded.has(compactId(id)))',HOME)
        self.assertIn('item.library_ids.some',HOME)
        self.assertIn('Library/VirtualFolders',PAGE)
        self.assertIn('Nowe biblioteki zawsze otrzymują TAK',PAGE)
        self.assertIn('ExcludedLibraryIds:[...new Set',PAGE)
        self.assertIn('AllLibraries:true,LibraryIds:[]',PAGE)  # new sets never use legacy allowlist

if __name__ == '__main__':unittest.main()
