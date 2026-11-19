"""Enforce Simkl exclusion for exact Anime tags, not genre or title guesses."""
from pathlib import Path
import unittest
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[2]
S = ROOT / 'src/Jellyfin.Plugin.MisioFlix'
CAT = (S / 'Services/MisioFlixCatalogService.cs').read_text()
PLAY = (S / 'Services/MisioFlixSimklPlaybackHostedService.cs').read_text()
CTRL = (S / 'Controllers/MisioFlixSimklController.cs').read_text()
WEB = S / 'Web'
JS = (WEB / 'simkl.js').read_text()
CLIENT = (WEB / 'client.js').read_text()
CSS = (WEB / 'simkl.css').read_text()
THEME = (WEB / 'theme.css').read_text()

class AnimeTagGuard104(unittest.TestCase):
    def test_authoritative_nfo_and_jellyfin_tags(self):
        self.assertIn('internal static bool IsSimklAnime(', CAT)
        self.assertIn('Get(item,"Tags")', CAT)
        self.assertIn('GetProperty("Tags")', CAT)
        self.assertIn('ReadNfo(local.Path,type)?.AnimeTag == true', CAT)
        self.assertIn('nfo.Elements("tag")',CAT)
        self.assertIn('string.Equals(t,"Anime",StringComparison.OrdinalIgnoreCase)',CAT)
        self.assertIn('nfo.Element("anime")', CAT)
        self.assertIn('IsSimklAnime(local, kind=="movies"?"Movie":"Series", data)',CAT)
        self.assertIn('return new SimklMediaTarget(false, kind, seasonNumber',CAT)
        self.assertIn('if (AnimeSource(local.Path).Length != 0) return true;',CAT)
        self.assertIn('IsBelowRoot(mediaPath, Path.GetFullPath(config.AnimeRoot))',CAT)
        self.assertIn('IsBelowRoot(mediaPath, Path.GetFullPath(config.AnimeOriginalRoot))',CAT)
    def test_all_simkl_write_paths_are_guarded(self):
        self.assertIn('MisioFlixCatalogService.IsSimklAnime(mediaRoot', PLAY)
        self.assertIn('if(IsAnime(item,root))return null;', PLAY)
        self.assertIn('var target=await _catalog.AuthorizedSimklTargetAsync', CTRL)
        self.assertIn('if(!target.Relevant)', CTRL)
        self.assertIn('var targets=await _catalog.AuthorizedSimklCardTargetsAsync', CTRL)
    def test_simkl_eligibility_gate_and_client_cleanup(self):
        self.assertIn('eligibleIds=targets.Keys.ToArray()',CTRL)
        self.assertIn('const simklEligibleCards=new Set()', JS)
        self.assertIn('if(!simklEligibleCards.has(id))',JS)
        self.assertIn("card.dataset.mfAnime==='1'||card.dataset.mfSimklExcluded==='1'",JS)
        self.assertIn("card.removeAttribute('data-mf-simkl-watch');",CLIENT)
        self.assertIn('if(data.simklExcluded)',CLIENT)
        self.assertIn('data-mf-simkl-excluded',CLIENT)
        self.assertIn("!item.simklExcluded",(WEB/'home.js').read_text())
    def test_anime_does_not_receive_simkl_css(self):
        self.assertIn(':not([data-mf-anime="1"]):not([data-mf-simkl-excluded="1"])',CSS)
        self.assertIn(':not([data-mf-anime="1"]):not([data-mf-simkl-excluded="1"])',THEME)
        self.assertIn('data-mf-watch="watched"', THEME)
        self.assertIn('data-mf-mal-frame="mixed"',THEME)
    def test_non_anime_animation_not_excluded_by_genre(self):
        guard = CAT[CAT.index('internal static bool IsSimklAnime'):CAT.index('private SimklMediaTarget MakeSimklTarget')]
        self.assertNotIn('Genres', guard)
        self.assertNotIn('Category', guard)
        self.assertNotIn('Name', guard)

if __name__=='__main__': unittest.main()
