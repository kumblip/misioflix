import unittest
"""Guard against API regressions causing v0.4.85 CI compilation failure."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SERVICE = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixNextEpisodeWatchService.cs'



class NextEpisodeRegression(unittest.TestCase):
    def test_explicit_user_entity_from_jellyfin_database_namespace(self):
        code = SERVICE.read_text(encoding='utf-8')
        assert 'using User = Jellyfin.Database.Implementations.Entities.User;' in code
        assert 'ActiveEpisode(Episode Item, User User,' in code


    def test_markplayed_uses_actual_jellyfin_12_4_signature(self):
        code = SERVICE.read_text(encoding='utf-8')
        assert 'previous.Item.MarkPlayed(previous.User, playedDate, resetPosition: true);' in code
        assert 'previous.Item.MarkPlayed(previous.User);' not in code
        assert 'if (data is null || !data.Played || data.PlaybackPositionTicks != 0)' in code


    def test_project_keeps_supported_jellyfin_abi(self):
        project = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf-8')
        assert '<TargetFramework>net10.0</TargetFramework>' in project
        for dependency in ('Jellyfin.Controller', 'Jellyfin.Common', 'Jellyfin.Model'):
            assert f'<PackageReference Include="{dependency}" Version="12.4.0"' in project
