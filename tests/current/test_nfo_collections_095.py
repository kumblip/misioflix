"""Source-contract regression for v0.4.95 native NFO collections (no .NET runtime in test environment)."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SERVICE = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixNfoCollectionsService.cs').read_text('utf-8')
ROUTER = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixNfoCollectionsController.cs').read_text('utf-8')
REGISTRAR = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/ScriptInjection.cs').read_text('utf-8')
CONFIG = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Configuration/PluginConfiguration.cs').read_text('utf-8')
PAGE = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/configPage.html').read_text('utf-8')

class NfoCollections095(unittest.TestCase):
    def test_current_release_uses_same_version_everywhere(self):
        version = json.loads((ROOT/'meta.json').read_text())['version']
        project = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text()
        self.assertEqual(version, '0.4.'+project.split('<AssemblyVersion>0.4.',1)[1].split('</AssemblyVersion>')[0])

    def test_native_collections_not_parallel_custom_catalog(self):
        self.assertIn('_collections.CreateCollectionAsync(new CollectionCreationOptions', SERVICE)
        self.assertIn('_collections.AddToCollectionAsync(box.Id, missing)', SERVICE)
        self.assertIn('box.ContainsLinkedChildByItemId(id)', SERVICE)
        self.assertIn('GroupBy(box =>', SERVICE)
        self.assertIn('StringComparer.OrdinalIgnoreCase', SERVICE)
        self.assertIn('BaseItemKind.Movie, BaseItemKind.Series', SERVICE)
        self.assertIn('BaseItemKind.BoxSet', SERVICE)

    def test_multiple_set_tags_and_no_guessed_string_collections(self):
        self.assertIn('root.Elements()', SERVICE)
        self.assertIn('e.Name.LocalName.Equals("set"', SERVICE)
        self.assertIn('Distinct(StringComparer.OrdinalIgnoreCase)', SERVICE)
        self.assertIn('Path.Combine(directory, series ? "tvshow.nfo" : "movie.nfo")', SERVICE)
        self.assertIn('Path.GetFileNameWithoutExtension(mediaPath) + ".nfo"', SERVICE)
        self.assertNotIn('GetProperty("Tag")', SERVICE)

    def test_readonly_nfo_and_guarded_deletions(self):
        for prohibited in ('File.WriteAllText(', 'Directory.Delete(', 'DeleteCollectionAsync(',
                           'SortName =', 'SetSortName('):
            self.assertNotIn(prohibited, SERVICE)
        self.assertIn('RemoveFromCollectionAsync(boxId, actual)', SERVICE)
        self.assertIn('ledger.CreatedBoxSetIds.Contains(box.Id.ToString("N"))', SERVICE)
        self.assertIn('XmlResolver = null', SERVICE)
        self.assertIn('DtdProcessing = DtdProcessing.Prohibit', SERVICE)
        self.assertIn('MaxCharactersInDocument = 2_000_000', SERVICE)
        self.assertIn('MaxCollectionNames = 500', SERVICE)
        self.assertIn('MaxMediaItems = 20000', SERVICE)

    def test_scheduler_and_permanent_admin_configuration(self):
        self.assertIn('services.AddSingleton<MisioFlixNfoCollectionsService>();', REGISTRAR)
        self.assertIn('AddHostedService<MisioFlixNfoCollectionsService>', REGISTRAR)
        self.assertIn('AutoSyncNfoCollections { get; set; } = true;', CONFIG)
        self.assertIn('TimeSpan.FromMinutes(2)', SERVICE)
        self.assertIn('TimeSpan.FromMinutes(30)', SERVICE)
        self.assertIn('SemaphoreSlim _runGate', SERVICE)
        self.assertIn('Policies.RequiresElevation', ROUTER)
        self.assertIn('[HttpPost("sync")]', ROUTER)
        self.assertIn('[HttpGet("status")]', ROUTER)
        self.assertIn('mf-nfo-collections-sync', PAGE)
        self.assertIn('mf-nfo-collections-auto', PAGE)
        self.assertIn('MisioFlix/api/nfo-collections/sync', PAGE)

if __name__=='__main__': unittest.main()
