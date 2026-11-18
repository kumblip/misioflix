"""Contract tests: no changes to user-facing API, files, playback and provider modules."""
import json
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT/'src/Jellyfin.Plugin.MisioFlix'

class SafePerformance100(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.service = (SRC/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')
        cls.ctrl = (SRC/'Controllers/MisioFlixController.cs').read_text(encoding='utf-8')
        cls.home = (SRC/'Web/home.js').read_text(encoding='utf-8')

    def test_nfo_only_successful_read_cache(self):
        self.assertIn('ParsedNfoCache.TryGetValue(file',self.service)
        self.assertIn('after.LastWriteTimeUtc == stamp',self.service)
        self.assertIn('after.Length == length',self.service)
        self.assertIn('catch (XmlException)',self.service)
        self.assertIn('catch (IOException)',self.service)
        self.assertIn('requireMalId && !parsed.MalId.HasValue',self.service)
        self.assertIn('Genres = new List<string>(cached.Parsed.Genres)',self.service)
        self.assertIn('DTD',self.service.upper())

    def test_fresh_user_collection_counts(self):
        self.assertIn('new SemaphoreSlim(3, 3)',self.service)
        self.assertIn('Task.WhenAll(countJobs)',self.service)
        self.assertNotIn('_collectionCountCache',self.service)
        self.assertIn('GetCollectionsContainingItem(user, itemId)',self.service)
        self.assertIn('Uri.EscapeDataString(userId)',self.service)
        self.assertIn('CollapseBoxSetItems=false',self.service)

    def test_assets_versioned_only(self):
        self.assertIn('requestedVersion == actualVersion',self.ctrl)
        self.assertIn('public, max-age=604800, immutable',self.ctrl)
        self.assertIn('public, max-age=3600',self.ctrl)
        self.assertIn('private, no-store',self.ctrl)

    def test_search_scope_and_manual_refresh(self):
        self.assertIn('catalogScope()', self.home)
        self.assertIn('catalogFullKey(libraryId)', self.home)
        self.assertIn('refreshScopedCatalog(state)', self.home)
        self.assertIn('clearCatalogSnapshots()', self.home)
        self.assertIn('catalogCache.clear();catalogFetchedAt.clear()', self.home)

    def test_no_unintended_sources_touched(self):
        self.assertTrue((SRC/'Web/mal.js').is_file())
        self.assertTrue((SRC/'Web/simkl.js').is_file())
        self.assertTrue((SRC/'Web/library-scroll.js').is_file())

if __name__ == '__main__': unittest.main()
