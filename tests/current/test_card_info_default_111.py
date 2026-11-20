"""MisioFlix v0.4.111: proposals visible on Home and complete tile info popup."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web'
HOME = (WEB / 'home.js').read_text('utf-8')
CSS = (WEB / 'theme.css').read_text('utf-8')
SERVICE = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text('utf-8')

class CardInfoAndVisibleProposals111(unittest.TestCase):
    def test_default_proposals_on_libraries_off(self):
        mount = HOME.split('function mount(host){',1)[1].split('function unmountHome(){',1)[0]
        toggle=HOME.split('function recommendationToggle(){',1)[1].split('function recommendationAnimeToggle(){',1)[0]
        self.assertIn("rowsArea.hidden=true",mount)
        self.assertIn("genreArea.hidden=false",mount)
        self.assertIn("button.setAttribute('aria-checked','true')",toggle)
        self.assertIn("const label=own('span','mf-home-libraries-label','Ukryj propozycje')",toggle)
        self.assertIn("void initializeRecommendations(serial)",mount)
        self.assertIn("area.hidden=!show",toggle)
        self.assertIn("if(show&&!recommendationInitialized)void initializeRecommendations(epoch)",toggle)

    def test_all_home_cards_use_one_info_dialog(self):
        card=HOME.split('function makeCard(item){',1)[1].split('function enableShelfDrag(',1)[0]
        for marker in ["mf-home-card-title-row", "mf-home-card-title", "mf-home-card-info-button", "openCardInfo(item,info)", "append(titleRow,title,info)"]:
            self.assertIn(marker,card)
        for marker in ['row.scroll.appendChild(makeCard(item))',
                       'state.grid.appendChild(makeCard(searchTile(item,state)))',
                       'collectionsPage.grid.appendChild(makeCard(item))',
                       'const card=makeCard(item)']:
            self.assertIn(marker,HOME)
        self.assertIn("card.querySelector('.mf-home-card-desc')?.remove()",HOME)
        self.assertIn('function openCardInfo(item,opener)',HOME)
        for marker in ['mf-home-card-info-title', 'mf-home-card-info-description', 'mf-home-card-info-genres',
                       "'Zamknij'", "'Otwórz'", "nativeDetails(item.id,item.serverId)",
                       "dialog.setAttribute('aria-modal','true')"]:
            self.assertIn(marker,HOME)
        self.assertIn("if(event.key==='Escape' && cardInfoModal)",HOME)
        self.assertIn("if(event.target===overlay)closeCardInfo()",HOME)
        self.assertIn("cardInfoModal=overlay",HOME)

    def test_all_genres_pass_through_without_touching_poster_three_chips(self):
        self.assertIn("genres = (isAnime ? nfo?.Genres ?? new List<string>() : Strings(Get(item, \"Genres\"))).ToList()",SERVICE)
        self.assertIn("item.genres.slice(0,3)",HOME)
        self.assertIn("const names=[...new Set((Array.isArray(item.genres)?item.genres:[])",HOME)
        self.assertIn("item.description.trim()",HOME)
        self.assertIn("item.title||'Brak tytułu'",HOME)
        self.assertIn('mf-home-card-info-dialog',CSS)
        self.assertIn('.mf-home-card-title-row',CSS)
        self.assertIn('z-index:100002',CSS)
        self.assertNotIn('window.location.reload()',HOME.split('function openCardInfo(item,opener)',1)[1].split('function sortCatalog(',1)[0])

    def test_version_and_unchanged_release(self):
        version=json.loads((ROOT/'meta.json').read_text('utf-8'))['version']
        # Feature test must remain valid for later releases.
        self.assertRegex(version, r'^0\.4\.\d+\.0$')
        self.assertEqual((ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text('utf-8').split('<AssemblyVersion>')[1].split('</AssemblyVersion>')[0],version)
        for file in ['build.yml','release.yml']:
            self.assertTrue((ROOT/'.github/workflows'/file).is_file())

if __name__=='__main__':unittest.main()
