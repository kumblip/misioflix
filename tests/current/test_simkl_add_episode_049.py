"""v0.4.49 Simkl new-item and standalone episode contract checks (not an integration test)."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'src/Jellyfin.Plugin.MisioFlix'
CAT=(SRC/'Services/MisioFlixCatalogService.cs').read_text('utf8')
SVC=(SRC/'Services/MisioFlixSimklService.cs').read_text('utf8')
CTL=(SRC/'Controllers/MisioFlixSimklController.cs').read_text('utf8')
UI=(SRC/'Web/simkl.js').read_text('utf8')
class NewItemsAndEpisodes049(unittest.TestCase):
 def test_auth_validates_episode_and_parent_before_write(self):
  episode=CAT.split('public async Task<(SimklMediaTarget Target,int EpisodeNumber)> AuthorizedSimklEpisodeAsync',1)[1].split('public async Task<List<int>> AuthorizedSimklSeasonEpisodeNumbersAsync',1)[0]
  for value in ['AuthorizedSimklTargetAsync(caller,catalogId,seasonId','IncludeItemTypes=Episode','SameGuid(Text(Get(media,"SeriesId")),catalogId)',
    'SameGuid(Text(Get(media,"SeasonId")),seasonId)','AuthorizedSimklSeasonEpisodeNumbersAsync(caller,seasonId','!episodeNumbers.Contains(episodeNumber)']:
   self.assertIn(value,episode)
  self.assertIn('[HttpPost("episode-history")]',CTL)
  endpoint=CTL.split('[HttpPost("episode-history")]',1)[1].split('public sealed record SeasonHistoryRequest',1)[0]
  self.assertIn('AuthorizedSimklEpisodeAsync',endpoint)
  self.assertIn('new[]{episodeNumber}',endpoint)
  self.assertIn('UpdateSeasonAsync',endpoint)
  self.assertNotIn('UpdateAsync(',endpoint)
 def test_missing_new_item_creation_is_explicit(self):
  self.assertIn("entry===null?'Dodaj do Simkl':'Edytuj Simkl'",UI)
  self.assertIn('createIfMissing:entry==null',UI)
  self.assertIn('CreateIfMissing',CTL)
  update=SVC.split('public async Task<SimklEntry?> UpdateAsync',1)[1]
  self.assertIn('if(edit.CreateIfMissing)',update)
  self.assertIn('if(!edit.ChangeStatus||!ValidStatus(edit.Status,target.Kind))',update)
  self.assertIn('identity["title"]',update)
  self.assertIn('identity["year"]',update)
  self.assertIn('long.Parse(x.Value,CultureInfo.InvariantCulture)',update)
  self.assertLess(update.index('if(edit.CreateIfMissing)'),update.index('if(edit.ChangeScore)'))
 def test_episode_ui_does_not_change_other_levels(self):
  self.assertIn("if(!['Series','Season','Episode','Movie'].includes(media.Type))return;",UI)
  episode=UI.split('if(isEpisode){',1)[1].split('if(isSeason){',1)[0]
  self.assertIn("request('/episode-history','POST'",episode)
  self.assertNotIn("'/update'",episode)
  self.assertNotIn("'/season-history'",episode)
  self.assertIn("status.addEventListener('change'",episode)
  self.assertIn("['false','Nie obejrzany']",episode)
  self.assertIn("['true','Obejrzany']",episode)
  self.assertIn('return;',episode)
 def test_isolation_and_version(self):
  self.assertIn('0.4.54.0',(ROOT/'meta.json').read_text('utf8'))
  self.assertIn('0.4.54.0',(SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text('utf8'))
  self.assertNotIn('/scrobble/',SVC)
  self.assertNotIn('mf-mal-',UI)
  self.assertIn('AnimeRoot',CAT)
if __name__=='__main__':unittest.main()
