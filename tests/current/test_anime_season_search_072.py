"""Regressions: catalog has meaningful Season counts, search renders season-only."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SERVICE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text(encoding='utf8')
HOME=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf8')
class AnimeSearch072(unittest.TestCase):
 def test_seasons_are_not_series_with_nested_seasons(self):
  self.assertIn('season_count = itemType == "Series"',SERVICE)
  self.assertIn('episode_count = PositiveInt(Get(json, "RecursiveItemCount"))',SERVICE)
  self.assertIn("if(state.kind==='anime'&&item.type==='Season')",HOME)
  self.assertIn('result.seasons=null;',HOME)
 def test_checkbox_does_not_mix_parent_and_seasons(self):
  self.assertIn("seasonOnly&&kind!=='seasons'",HOME)
  self.assertIn("return seasonOnly?kind==='seasons':kind!=='seasons';",HOME)
  self.assertIn('indexAnimeSeasons(state);',HOME)
 def test_other_modules_unchanged(self):
  self.assertIn("state.kind==='anime'&&Boolean(state.includeSeasons?.checked)",HOME)
if __name__=='__main__':unittest.main()
