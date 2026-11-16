"""NFO classification and per-season count regression for v0.4.75."""
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SERVICE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text('utf8')
HOME=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text('utf8')

class AnimeSeasonDetails073(unittest.TestCase):
 def test_local_nfo_kind_retained_for_season(self):
  self.assertIn('var kind = tags.FirstOrDefault(t => t.StartsWith("Typ:"',SERVICE)
  self.assertIn('kind = local?.Kind ?? string.Empty',SERVICE)
  self.assertIn('if (type == "Season") { candidates.Add(Path.Combine(folder, "season.nfo"))',SERVICE)
  self.assertIn('return label||\'Sezon (brak typu w NFO)\';',HOME)
 def test_episode_count_has_fallback_without_mislabeling_season(self):
  self.assertIn('episode_count = PositiveInt(Get(json, "RecursiveItemCount"))',SERVICE)
  self.assertIn('== "Season" ? PositiveInt(Get(json, "ChildCount")) : null',SERVICE)
  self.assertIn('result.seasons=null;',HOME)
  self.assertIn('if(tile.episodes!=null)',HOME)
  self.assertNotIn("counts.push('Sezon / Specials')",HOME)
 def test_version_and_ui_controls(self):
  self.assertEqual(json.loads((ROOT/'meta.json').read_text('utf8'))['version'],'0.4.80.0')
  self.assertIn('Pokaż osobno sezony/speciale/itd.',HOME)
  self.assertIn('Sezony / OVA / ONA / Specials',HOME)

if __name__=='__main__':unittest.main()
