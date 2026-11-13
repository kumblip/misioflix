"""v0.4.40: compact authenticated MAL summary, direct saved-state notification, mobile native anime cards."""
from pathlib import Path
import json,subprocess,unittest,re
ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
MAL=(WEB/'mal.js').read_text(encoding='utf-8')
CLIENT=(WEB/'client.js').read_text(encoding='utf-8')
CSS=(WEB/'theme.css').read_text(encoding='utf-8')
class MalMobile0440(unittest.TestCase):
    def test_version(self):
        version=json.loads((ROOT/'meta.json').read_text(encoding='utf-8'))['version']
        self.assertGreaterEqual(tuple(map(int,version.split('.'))),(0,4,40,0))
        project=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text()
        self.assertIn(f'<AssemblyVersion>{version}</AssemblyVersion>',project)
        self.assertIn(f'<Version>{version.removesuffix(".0")}</Version>',project)
    def test_removed_diagnostic_ui_but_preserves_authorized_backend(self):
        self.assertNotIn("el('summary','','Diagnostyka MAL')",MAL)
        self.assertNotIn('request(`/diagnostics?',MAL)
        self.assertNotIn("diagRun.addEventListener('click'",MAL)
        self.assertIn('request(`/item?catalogId=${catalogId}',MAL)
        self.assertIn('const rewatchCount=data?.timesRewatched ?? null;',MAL)
    def test_mal_panel_after_quick_watch_and_no_visible_id(self):
        self.assertIn("const rail=page.querySelector('.mf-detail-poster-rail')",MAL)
        self.assertIn('if(rail)rail.append(panel)',MAL)
        self.assertNotIn('panel.querySelector(\'.mf-mal-detail-caption\')',MAL)
        self.assertIn("el('button','mf-mal-mobile-toggle','MAL')",MAL)
        self.assertIn("mobileToggle.setAttribute('aria-expanded'",MAL)
        self.assertIn("panel.dataset.mfExpanded=String(expanded)",MAL)
        self.assertIn('.mf-mal-detail-panel:not([data-mf-expanded="true"]) > .mf-mal-content',CSS)
    def test_success_notice_is_after_true_post_only(self):
        save=MAL.split("form.addEventListener('submit',async event=>",1)[1].split("refresh.addEventListener('click',async()=>",1)[0]
        self.assertIn("await request('/update','POST'",save)
        self.assertIn('if(isSame()){',save)
        self.assertIn("showMalSaveToast('✓ Zapisano zmiany w MyAnimeList')",save)
        self.assertLess(save.index('await request('),save.index('showMalSaveToast('))
        self.assertIn("toast.setAttribute('role','status')",MAL)
        self.assertIn('renderEntry(panel,result,ctx,false,false,',save)
    def test_detail_poster_colors_from_mal_only(self):
        self.assertIn("page.setAttribute('data-mf-mal-watch',entry==null?'unwatched':statusState(entry))",MAL)
        self.assertIn("p.removeAttribute('data-mf-mal-watch')",MAL)
        for status,color in [('watched','#45b879'),('started','#e6a23c'),('unwatched','#f4a5ce')]:
            self.assertIn(f'[data-mf-mal-watch="{status}"]',CSS)
            self.assertIn(color,CSS)
        self.assertIn('>.detailImageContainer'.replace('>','> '),CSS)
    def test_home_and_search_personal_score_as_pink_paw(self):
        self.assertIn("label.replaceChildren(el('span','mf-mal-score-number',text),malRatingPaw())",MAL)
        self.assertIn("svg.style.color='#ee9fc9'",MAL)
        self.assertNotIn('`${score}/10`',MAL)
        self.assertIn('.mf-home-mal-score .mf-mal-rating-paw',CSS)
        self.assertIn("const rawRating=card.getAttribute('data-mf-user-rating')",CLIENT)
        self.assertIn('Number.isInteger(Number(rawRating))',CLIENT)
    def test_mobile_cards_keep_original_jellyfin_link_and_mal_watch(self):
        self.assertIn("surface.appendChild(overlay)",CLIENT)
        self.assertIn("window.dispatchEvent(new Event('misioflix-mal-cards-updated'))",MAL)
        self.assertIn('.mf-native-kind {display:none!important}',CSS)
        self.assertIn('.mf-native-format {display:none!important}',CSS)
        self.assertIn('font-size:11px!important;line-height:1.23',CSS)
        self.assertIn('font-size:10px;line-height:1.34',CSS)
        self.assertIn('data-mf-watch="watched"',CSS)
        self.assertNotIn('addScrollEventListener',CLIENT)
    def test_node_syntax(self):
        for script in ['client.js','home.js','mal.js','details.js']:
            subprocess.run(['node','--check',str(WEB/script)],check=True,capture_output=True)
if __name__=='__main__':unittest.main()
