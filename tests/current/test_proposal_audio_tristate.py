import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web/home.js'
SERVICE=ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs'

class ProposalAudioTristate(unittest.TestCase):
    def setUp(self):
        self.web=WEB.read_text(encoding='utf-8')
        self.server=SERVICE.read_text(encoding='utf-8')

    def test_catalog_uses_only_manual_index_and_authorized_items(self):
        method=self.server.split('public async Task<CatalogResponse> ReadForAuthenticatedUserAsync(',1)[1].split('// Home shelves are small',1)[0]
        self.assertIn('await EnsureLanguageIndexAsync(cancel)',method)
        self.assertIn('pl_audio = KnownPolishAudio(itemId)',method)
        self.assertIn('LanguageFlagsCache.TryGetValue(id.ToString("N"), out var flags)',method)
        self.assertIn('flags.pl is "audio" or "both"',method)
        self.assertIn('return flags.partial ? null : false',method)
        self.assertNotIn('RefreshLanguageFlagsIndexAsync(',method)
        self.assertIn('public bool? pl_audio { get; set; }',self.server)

    def test_manual_refresh_invalidates_catalog_snapshot(self):
        self.assertIn('v7-full-catalog-scoped-anime-source',self.web)
        self.assertIn('librariesReadyPromise=loadLibraries(serial)',self.web)
        self.assertIn('if(librariesReadyPromise)await librariesReadyPromise;',self.web)
        self.assertIn('_languageFlagsUpdatedUtc?.UtcDateTime.Ticks',self.server)

    def test_same_index_as_language_flags_admin_refresh(self):
        # Proposals only read the exact persistent store populated by the admin
        # "Flagi PL / ENG — dźwięk i napisy" refresh; no separate scanner.
        self.assertIn('Path.Combine(applicationPaths.DataPath, "misioflix", "language-flags-index.json")',self.server)
        self.assertIn('LanguageFlagsCache.TryGetValue(id.ToString("N"), out var flags)',self.server)
        self.assertIn('public async Task<LanguageFlagIndexStatus> RefreshLanguageFlagsIndexAsync(',self.server)
        self.assertIn('LanguageFlagsCache.Clear()',self.server)
        self.assertIn('await SaveLanguageIndexUnderGateAsync(cancel',self.server)
        self.assertIn('pl_audio = KnownPolishAudio(itemId)',self.server)
        self.assertIn('if(typeof item?.pl_audio!==\'boolean\')return false;',self.web)
        self.assertNotIn('fetch(\'/MisioFlix/api/language-flags',self.web)

    def test_labels_are_the_requested_polish_phrases(self):
        self.assertIn("pl:'Audio PL'",self.web)
        self.assertIn("original:'Audio nie-PL'",self.web)
        self.assertIn("all:'Wszystkie'",self.web)
        self.assertNotIn("pl:'Tylko polskie'",self.web)
        self.assertNotIn("original:'Tylko oryginał'",self.web)

    def test_proposal_only_and_three_states(self):
        self.assertIn("recommendationAudioMode='pl'",self.web)
        self.assertIn("recommendationAudioMode==='pl'?'original'",self.web)
        self.assertIn("recommendationAudioMode==='original'?'all':'pl'",self.web)
        self.assertIn('if(!recommendationHasRequestedAudio(item))return false;',self.web)
        self.assertIn("if(recommendationAudioMode==='all')return true;",self.web)
        self.assertIn("typeof item?.pl_audio!=='boolean'",self.web)
        self.assertIn('switches.appendChild(recommendationAudioToggle())',self.web)

if __name__=='__main__': unittest.main()
