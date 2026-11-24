"""v0.4.105: opt-in second root, unchanged original semantics, no Simkl on anime."""
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'

class DualAnimeSource105(unittest.TestCase):
    def test_two_exact_physical_roots(self):
        cfg=(SRC/'Configuration/PluginConfiguration.cs').read_text(encoding='utf-8')
        service=(SRC/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')
        self.assertIn('AnimeRoot { get; set; } = "/media/raid/animelektor"',cfg)
        self.assertIn('AnimeOriginalRoot { get; set; } = "/media/raid/anime"',cfg)
        self.assertIn('IsBelowRoot(mediaPath, Path.GetFullPath(config.AnimeRoot))) return "lektor"',service)
        self.assertIn('IsBelowRoot(mediaPath, Path.GetFullPath(config.AnimeOriginalRoot))) return "original"',service)
        self.assertIn('AnimeSourceForLibraryMembership(libraryIds, mediaPath)',service)
        self.assertIn('anime_source = animeSource',service)
        self.assertIn('var animeSource = local is null ? string.Empty : AnimeSourceForItem(_library, local)',service)
        self.assertIn('AnimeSourceForItem(_library, firstLocal).Length != 0',service)
        self.assertIn('if (AnimeSource(local.Path).Length != 0) return true;',service)
        self.assertIn('var anime = AnimeSourceForItem(_library, libItem).Length > 0;',service)

    def test_search_filter_default_and_refresh(self):
        home=(SRC/'Web/home.js').read_text(encoding='utf-8')
        self.assertIn("lektor.value='lektor'",home)
        self.assertIn("lektor.addEventListener('change',()=>paintSearchResults(state))",home)
        self.assertIn("item.anime_source||'lektor'",home)
        self.assertIn("state.lektor?.value||'lektor'",home)
        self.assertIn("lektor.value='lektor'",home)
        self.assertIn('displaySearchCatalog(state,data,force && state.pool.length>0)',home)
        self.assertIn("const catalogSchemaVersion = 'v10-confirmed-library-roles'",home)
        self.assertIn('const previousScroll=preserveFilters?state.scroller.scrollTop:0',home)
        self.assertIn('state.genreStates.set(genre,mode)',home)

    def test_diag_and_original_release_mechanism(self):
        ctrl=(SRC/'Controllers/MisioFlixController.cs').read_text(encoding='utf-8')
        self.assertIn('typeof(Plugin).Assembly.GetName().Version?.ToString()',ctrl)
        self.assertNotIn('version = "0.4.30"',ctrl)
        meta=json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))
        self.assertRegex(meta['version'],r'^\d+\.\d+\.\d+\.\d+$')
        project=(SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf-8')
        self.assertIn(f"<AssemblyVersion>{meta['version']}</AssemblyVersion>",project)
        for name in ['tools/sync_version.py','tools/package.py','.github/workflows/build.yml','.github/workflows/release.yml']:
            self.assertTrue((ROOT/name).is_file())

if __name__=='__main__':unittest.main()
