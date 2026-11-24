"""Static contract for the server-side role fallback (not a live Jellyfin test)."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/'src/Jellyfin.Plugin.MisioFlix'
S=(ROOT/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf8')
class LibraryRoots154(unittest.TestCase):
 def test_real_and_custom_roots_in_saved_mapping(self):
  section=S.split('private static string ManagedLibraryRoleFromPath(',1)[1].split('private static IEnumerable<string> CollectionLibraryIds',1)[0]
  self.assertIn('entry.JellyfinPaths ?? new()',section)
  self.assertIn('entry.Paths ?? new()',section)
  self.assertIn('IsBelowRoot(mediaPath, fullRoot)',section)
  self.assertIn('fullRoot.Length == bestLength && bestLive && !live',section)
  self.assertNotIn('config.AnimeRoot',section)
 def test_explicit_role_before_path_and_no_legacy_roots_after_save(self):
  section=S.split('private static string AnimeSourceForLibraryMembership(',1)[1].split('private static bool IsBelowRoot(',1)[0]
  self.assertLess(section.index('ManagedLibraryRoleForMembership(libraryIds)'),section.index('_ => AnimeSource(mediaPath)'))
  self.assertLess(section.index('config?.LibraryPathsConfigured == true'),section.index('config?.AnimeRoot'))
  self.assertIn('"simkl" => string.Empty',section)
