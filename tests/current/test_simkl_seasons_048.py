"""Scoped Simkl season/episode safeguards (static source guards, not live API tests)."""
from pathlib import Path
import re, unittest
SRC=Path(__file__).resolve().parents[2]/'src/Jellyfin.Plugin.MisioFlix'
C=(SRC/'Controllers/MisioFlixSimklController.cs').read_text('utf8')
S=(SRC/'Services/MisioFlixSimklService.cs').read_text('utf8')
A=(SRC/'Services/MisioFlixCatalogService.cs').read_text('utf8')
UI=(SRC/'Web/simkl.js').read_text('utf8')
CSS=(SRC/'Web/simkl.css').read_text('utf8')

class SeasonHistory048(unittest.TestCase):
 def test_new_scoped_mutation_route(self):
  self.assertIn('[HttpPost("season-history")]',C)
  self.assertIn('AuthorizedSimklTargetAsync(Request,input.CatalogId,input.SeasonId',C)
  self.assertIn('AuthorizedSimklSeasonEpisodeNumbersAsync(Request,input.SeasonId',C)
  self.assertIn('UpdateSeasonAsync(await CurrentUser(cancel)',C)
 def test_no_global_season_edit(self):
  self.assertIn('if(input.SeasonId.HasValue)return BadRequest',C)
  self.assertIn('if(target.SeasonNumber.HasValue)throw new ArgumentException',S)
  self.assertIn('return; // Crucial: never mount whole-show status/rating editor on a season.',UI)
 def test_history_nested_correctly(self):
  scope=S.split('public async Task UpdateSeasonAsync',1)[1].split('public async Task<SimklEntry?> UpdateAsync',1)[0]
  self.assertIn('"seasons",new[]{season}',scope)
  self.assertIn('"number",target.SeasonNumber.Value',scope)
  self.assertIn('"episodes"',scope)
  self.assertIn('"/sync/history"',scope)
  self.assertIn('"/sync/history/remove"',scope)
  self.assertNotIn('"/sync/add-to-list"',scope)
  self.assertNotIn('"/sync/ratings"',scope)
  self.assertNotIn('"/scrobble',scope)
 def test_validation_before_write(self):
  scope=S.split('public async Task UpdateSeasonAsync',1)[1].split('public async Task<SimklEntry?> UpdateAsync',1)[0]
  self.assertIn('target.Kind!="shows"',scope)
  self.assertIn('target.SeasonNumber.HasValue',scope)
  self.assertIn('chosen.Count!=chosen.Distinct().Count()',scope)
  self.assertIn('!allowedEpisodes.Contains(n)',scope)
  self.assertLess(scope.index('!allowedEpisodes.Contains(n)'),scope.index('ApiAsync(user,HttpMethod.Post'))
  self.assertIn('Count(acknowledgment,"episodes")',scope)
  self.assertIn('foreach(var key in new[]{"shows","episodes"})',scope)
 def test_episode_baseline_incremental(self):
  self.assertIn('HasEpisodeDetails',S)
  self.assertIn('"/sync/all-items/shows?extended=full&include_all_episodes=yes"',S)
  self.assertIn('"&extended=full&include_all_episodes=yes"',S)
  self.assertIn('Uri.EscapeDataString(cache.Activity)',S)
  self.assertIn('ParseWatchedSeasons',S)
 def test_episode_numbers_authorized(self):
  self.assertIn('ParentId={seasonId:N}',A)
  self.assertIn('IncludeItemTypes=Episode',A)
  self.assertIn('UserId={Uri.EscapeDataString(userId)}',A)
  self.assertIn('if(items.GetArrayLength()>500)',A)
  self.assertIn('Distinct().OrderBy(n=>n).ToList()',A)
 def test_explicit_ui_buttons_only(self):
  self.assertIn('Oznacz sezon jako obejrzany',UI)
  self.assertIn('Oznacz sezon jako nieobejrzany',UI)
  self.assertIn('Zapisz wybrane odcinki',UI)
  self.assertIn('Odcinek ${n}',UI)
  self.assertIn("request('/season-history','POST'",UI)
  self.assertIn('window.confirm(`Czy na pewno',UI)
  self.assertIn('window.confirm(`Zaktualizować tylko sezon',UI)
  self.assertNotIn('mf-mal-',UI)
  self.assertNotIn('mf-mal-',CSS.split('*/',1)[-1])
 def test_global_edit_unchanged(self):
  self.assertIn("await request('/update','POST'",UI)
  self.assertIn('if(edit.ChangeScore)',S)
  self.assertIn('if(edit.ChangeStatus)',S)
 def test_no_playback_mutations(self):
  self.assertNotIn('scrobble/',S)
  self.assertNotIn('SetPlayed',UI)
  self.assertNotIn('localStorage',UI)

if __name__=='__main__': unittest.main()
