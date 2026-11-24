from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]/'src/Jellyfin.Plugin.MisioFlix'
HOME=(ROOT/'Web/home.js').read_text(); CSS=(ROOT/'Web/theme.css').read_text(); API=(ROOT/'Controllers/MisioFlixController.cs').read_text(); SVC=(ROOT/'Services/MisioFlixCatalogService.cs').read_text()
class ProposalWatchStatus150(unittest.TestCase):
 def test_control_order_and_palette(self):
  self.assertIn('switches.appendChild(recommendationSubtitlesToggle());\n      switches.appendChild(recommendationWatchToggle());',HOME)
  for state in ('all','unwatched','started','completed'): self.assertIn(f'mf-home-watch-toggle[data-mf-watch-mode="{state}"]',CSS)
 def test_authenticated_read_only_no_store(self):
  a=API.split('[HttpGet("api/home/recommendation-watch-status")]',1)[1].split('[HttpGet(',1)[0]
  self.assertIn('[Authorize]',a); self.assertIn('private, no-store',a);self.assertIn('ReadRecommendationWatchStatusesAsync(Request, cancel)',a)
  b=SVC.split('ReadRecommendationWatchStatusesAsync(',1)[1].split('public async Task<HomeResumeResponse>',1)[0]
  for term in ('AuthenticatedUserAsync(caller, cancel)','EnableUserData=true','EnableTotalRecordCount=false','while (true)','offset += count','seen.Count == before','IncludeItemTypes=Movie,Series','Filters=IsResumable','PlaybackPositionTicks','RecommendationWatchStatus(item)'): self.assertIn(term,b)
  for term in ('ReadNfo','PostAsync','PutAsync','File.','16000'): self.assertNotIn(term,b)
 def test_no_search_or_provider_write(self):
  b=HOME.split('function recommendationWatchToggle(){',1)[1].split('function randomizeRecommendations(',1)[0]
  self.assertIn('/home/recommendation-watch-status',b);self.assertIn('isCurrent(serial)',b);self.assertNotIn('getCatalogForSearch',b);self.assertNotIn('localStorage',b);self.assertNotIn('/mal/',b);self.assertNotIn('/simkl/',b)

 def test_existing_card_status_contract_and_proposal_isolation(self):
  shared=SVC.split('private static string WatchStatus(JsonElement item)',1)[1].split('private static string RecommendationWatchStatus',1)[0]
  self.assertIn('return "watched"',shared);self.assertNotIn('return "completed"',shared)
  proposal=SVC.split('private static string RecommendationWatchStatus',1)[1].split('private static bool HasPrimaryImage',1)[0]
  self.assertIn('JsonValueKind.True) return "watched"',proposal)
  self.assertIn('PlaybackPositionTicks',proposal);self.assertIn('PlayedPercentage',proposal)
  self.assertLess(proposal.index('return "watched"'),proposal.index('return "started"'))
  self.assertIn("value==='watched'?'completed':value",HOME)
