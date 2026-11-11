"""Targeted MAL ID lookup regression suite: Jellyfin user scoped, NFO only."""
import json
import re
import subprocess
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'src/Jellyfin.Plugin.MisioFlix'
SERVICE = (SRC/'Services/MisioFlixCatalogService.cs').read_text(encoding='utf-8')
CTRL = (SRC/'Controllers/MisioFlixController.cs').read_text(encoding='utf-8')
WEB = (SRC/'Web/mal.js').read_text(encoding='utf-8')

class MalNfo0432(unittest.TestCase):
    def test_current_version(self):
        v=json.loads((ROOT/'meta.json').read_text())['version']
        self.assertGreaterEqual(tuple(map(int,v.split('.'))),(0,4,32,0))
        csproj=(SRC/'Jellyfin.Plugin.MisioFlix.csproj').read_text()
        self.assertIn(f'<AssemblyVersion>{v}</AssemblyVersion>',csproj)
        self.assertIn(f'<FileVersion>{v}</FileVersion>',csproj)

    def test_guid_form_is_normalized(self):
        self.assertIn('Guid.TryParse(value, out var parsed) && parsed == id',SERVICE)
        self.assertIn('Guid.TryParse(x.id, out var foundId) && foundId == id', CTRL)
        self.assertNotIn('x.id.Equals(id.ToString(), StringComparison.OrdinalIgnoreCase)',CTRL)

    def test_user_authorized_only_one_id(self):
        method=SERVICE.split('public async Task<int> AuthorizedMalIdAsync(',1)[1].split('/// <summary>Update per-user',1)[0]
        self.assertIn('AuthenticatedUserAsync(caller, cancel)',method)
        self.assertIn('&Ids={itemId:N}',method)
        self.assertIn('&Limit=2',method)
        self.assertIn('IsBelowRoot(local.Path, root)',method)
        self.assertNotIn('ReadForAuthenticatedUserAsync(caller',method)

    def test_season_parent_verified(self):
        method=SERVICE.split('public async Task<int> AuthorizedMalIdAsync(',1)[1].split('/// <summary>Update per-user',1)[0]
        self.assertIn('SameGuid(Text(Get(season.RootElement, "SeriesId")), catalogId)',method)
        self.assertIn('ReadNfo(local.Path, type, requireMalId: true)',method)
        self.assertIn('Number(Get(x, "IndexNumber")) == 1', method)

    def test_nfo_parses_uploaded_shape(self):
        xml='''<season><title>Zero no Tsukaima</title><uniqueid type="mal">1195</uniqueid><seasonnumber>1</seasonnumber></season>'''
        root=ET.fromstring(xml)
        self.assertEqual(root.find("uniqueid[@type='mal']").text,'1195')
        self.assertIn('string.Equals((string?)e.Attribute("type"), "mal", StringComparison.OrdinalIgnoreCase)',SERVICE)
        self.assertIn('if (requireMalId && !parsed.MalId.HasValue) continue;',SERVICE)

    def test_no_catalog_scan_or_home_mal_queries(self):
        section=WEB.split('function startDetailRead(',1)[1].split('function mountDetails(',1)[0]
        self.assertIn('api/mal/resolve',section)
        self.assertNotIn("'/MisioFlix/api/item/'",section)
        self.assertIn('&refresh=false',section)
        self.assertIn('loadCache(uid,malId)',section)
        self.assertIn('api/mal/resolve',CTRL)

    def test_preserve_nfo_and_player(self):
        nfo_reader=SERVICE.split('private static LocalNfo? ReadNfo(',1)[1].split('private static double? ParseNfoRating(',1)[0]
        self.assertNotIn('File.WriteAllText',nfo_reader)
        self.assertNotIn('playback/set',WEB)
        subprocess.run(['node','--check',str(SRC/'Web/mal.js')],check=True,capture_output=True)

if __name__ == '__main__': unittest.main()
