import json, unittest
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
ADMIN=(WEB/'configPage.html').read_text(encoding='utf-8')
HOME=(WEB/'home.js').read_text(encoding='utf-8')
CSS=(WEB/'theme.css').read_text(encoding='utf-8')

class ProposalOrderAndNavigation110(unittest.TestCase):
    def test_version(self):
        meta=json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))
        version=meta['version']
        csproj=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf-8')
        self.assertRegex(version,r'^\d+\.\d+\.\d+\.\d+$')
        self.assertIn(f'<AssemblyVersion>{version}</AssemblyVersion>',csproj)

    def test_drag_reorders_exact_saved_proposal_array(self):
        self.assertIn('function moveProposal(from,to)',ADMIN)
        self.assertIn('const moved=proposals.splice(from,1)[0];proposals.splice(to,0,moved)',ADMIN)
        self.assertIn('render(opened)',ADMIN)
        self.assertIn("grip.addEventListener('dragstart'",ADMIN)
        self.assertIn("outer.addEventListener('dragover'",ADMIN)
        self.assertIn("outer.addEventListener('drop'",ADMIN)
        self.assertIn("grip.addEventListener('pointerdown'",ADMIN)
        self.assertIn("grip.addEventListener('pointermove'",ADMIN)
        self.assertIn("grip.addEventListener('keydown'",ADMIN)
        self.assertIn('cfg.RecommendationSets=proposals.map(',ADMIN)
        self.assertIn('Zapisz propozycje',ADMIN)

    def test_only_admin_navigation_uses_current_web_origin(self):
        self.assertIn('id="mf-plugin-overview-return"',ADMIN)
        self.assertIn('href="#/dashboard/plugins/97d15b37b868492b83daeb67b16a0d44?name=MisioFlix"',ADMIN)
        self.assertNotIn('http://kumadlaneko:8096/web/',ADMIN)

    def test_heading_click_opens_full_grid_without_changing_search(self):
        self.assertIn('function openRecommendationListing(row)',HOME)
        self.assertIn("headingButton.addEventListener('click',()=>openRecommendationListing(row))",HOME)
        self.assertIn('aria-label\',\'Zobacz wszystkie propozycje: ',HOME)
        self.assertIn('const ordered=[...row.ordered]',HOME)
        self.assertIn("const ids=ordered.slice(offset,offset+24)",HOME)
        self.assertIn("request('/home/recommendation-cards?ids='",HOME)
        self.assertIn("if(!alive())return",HOME)
        self.assertIn('root:scroller,rootMargin:',HOME)
        self.assertIn("card.querySelector('.mf-home-card-desc')?.remove()",HOME)
        self.assertIn('mf-home-recommendation-dialog',CSS)
        self.assertIn('mf-home-genre-heading-link',CSS)

if __name__=='__main__':unittest.main()
