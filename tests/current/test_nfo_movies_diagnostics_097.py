"""v0.4.97: keep movie and series reconciliation observable; protect against lost movie NFOs."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SERVICE = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixNfoCollectionsService.cs').read_text(encoding='utf8')
CONTROLLER = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Controllers/MisioFlixNfoCollectionsController.cs').read_text(encoding='utf8')
CONFIG = (ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/configPage.html').read_text(encoding='utf8')

class NfoMovies097(unittest.TestCase):
    def test_independent_movie_and_series_query(self):
        self.assertIn('IncludeItemTypes = new[] { BaseItemKind.Movie }', SERVICE)
        self.assertIn('IncludeItemTypes = new[] { BaseItemKind.Series }', SERVICE)
        self.assertIn('movies.Concat(series).DistinctBy(item => item.Id)', SERVICE)
        self.assertIn('movies.Count > MaxMediaItems', SERVICE)
        self.assertIn('series.Count > MaxMediaItems', SERVICE)
    def test_windows_case_nfo_names_work_on_linux_and_no_unrelated_file(self):
        self.assertIn('FindNfoIgnoringCase(directory, series ? "tvshow.nfo" : "movie.nfo")', SERVICE)
        self.assertIn('Path.GetFileNameWithoutExtension(mediaPath) + ".nfo"', SERVICE)
        self.assertIn('StringComparison.OrdinalIgnoreCase', SERVICE)
        self.assertIn('return matches.Length == 1 ? matches[0] : null;', SERVICE)
        self.assertNotIn('Directory.EnumerateFiles(directory, "*.nfo").First()', SERVICE)
    def test_no_deletions_if_nfo_disappeared_or_movie_query_empty(self):
        self.assertIn('ledger.NfoCache.ContainsKey(id) || managedItemIds.Contains(id)', SERVICE)
        self.assertIn('if (movies.Count == 0 && managedItemIds.Count > 0)', SERVICE)
        self.assertIn('entry.Value.Any(id => !actualBox.ContainsLinkedChildByItemId(id))', SERVICE)
        self.assertIn('if (canRemove)', SERVICE)
        self.assertNotIn('File.Delete(nfo)', SERVICE)
    def test_admin_report_measures_actual_boxset_not_just_metadata(self):
        self.assertIn('var resolved = currentBox.GetLinkedChildren();', SERVICE)
        self.assertIn('var linkedMovies = resolved.Count(item => item.GetBaseItemKind() == BaseItemKind.Movie);', SERVICE)
        self.assertIn('NfoCollectionGroupDiagnostic', SERVICE)
        self.assertIn('MoviesWithoutNfoExamples', SERVICE)
        self.assertIn('MoviesWithoutSetExamples', SERVICE)
        self.assertIn('[HttpGet("report")]', CONTROLLER)
        self.assertIn('Policies.RequiresElevation', CONTROLLER)
        self.assertIn('mf-nfo-collections-report', CONFIG)
        self.assertIn('MisioFlix/api/nfo-collections/report', CONFIG)
    def test_version_metadata(self):
        version=json.loads((ROOT/'meta.json').read_text(encoding='utf8'))['version']
        csproj=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf8')
        self.assertEqual(version,'0.4.97.0')
        self.assertIn('<AssemblyVersion>'+version+'</AssemblyVersion>',csproj)
if __name__=='__main__': unittest.main()
