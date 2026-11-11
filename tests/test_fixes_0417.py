"""Regression checks for v0.4.17 search controls, resume fallback and video skin isolation.
These checks do not replace building/running Jellyfin 12.4 on the actual NAS.
"""
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'
HOME=(WEB/'home.js').read_text(encoding='utf8')
CLIENT=(WEB/'client.js').read_text(encoding='utf8')
CSS=(WEB/'theme.css').read_text(encoding='utf8')
SERVICE=(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs').read_text(encoding='utf8')

class Fixes0417(unittest.TestCase):
    def test_versions(self):
        meta=json.loads((ROOT/'meta.json').read_text(encoding='utf8'))
        self.assertEqual(meta['version'],'0.4.17.0')
        self.assertIn('home.js?v=0.4.17.0',(ROOT/'src/Jellyfin.Plugin.MisioFlix/Services/ScriptInjection.cs').read_text())

    def test_tristate_library_and_type(self):
        self.assertIn('function renderChoiceGroup(',HOME)
        self.assertIn('const next=(mode+1)%3',HOME)
        self.assertIn("makeFilterGroup('Biblioteki'",HOME)
        self.assertIn("makeFilterGroup('Typy produkcji'",HOME)
        self.assertIn('function allowGroup(value, map)',HOME)
        self.assertIn('function loadScopedCatalog(state)',HOME)
        self.assertIn('lib.id),library_name:lib.name',HOME)
        self.assertIn('mf-home-choice.mf-genre-on',CSS)
        self.assertIn('mf-home-choice.mf-genre-no',CSS)

    def test_suggestions_and_genres(self):
        self.assertIn('mf-home-suggestion-cover',HOME)
        self.assertIn('mf-home-suggestion-facts',HOME)
        self.assertIn('maxHeight=120',HOME)
        self.assertIn('genresExpanded:true',HOME)
        self.assertIn("kind==='anime'",HOME)
        self.assertIn("? ANIME_GENRES.filter",HOME)
        self.assertIn(': [...display.values()].sort',HOME)

    def test_watching_states_in_foreground(self):
        for s in ['data-mf-watch="unwatched"','data-mf-watch="started"','data-mf-watch="watched"']:
            self.assertIn(s,CSS)
        self.assertIn('.mf-home-poster[data-mf-watch]::before',CSS)
        for color in ['#f4a5ce','#e6a23c','#45b879']:
            self.assertIn(color,CSS)

    def test_resume_resilience(self):
        self.assertIn('Recursive=true&IncludeItemTypes=Movie,Episode',SERVICE)
        self.assertIn('Filters=IsResumable&IncludeItemTypes=Movie,Episode',SERVICE)
        self.assertIn('if (result.Count == 0)',SERVICE)
        self.assertIn('GetProperty("SeriesId")',SERVICE)
        self.assertIn('PlaybackPositionTicks',SERVICE)
        self.assertIn('ReadHomeResumeAsync',SERVICE)

    def test_player_style_isolation_without_player_override(self):
        self.assertIn('function playerIsVisible()',CLIENT)
        self.assertIn('function syncPlayerSkin()',CLIENT)
        self.assertIn("classList.toggle('misioflix-skin',!playerIsVisible())",CLIENT)
        self.assertNotIn('video { display:none',CSS)

if __name__=='__main__':unittest.main()
