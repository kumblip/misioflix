"""Regression tests for ZIP manifest tooling (no .NET needed)."""
from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
import zipfile

SCRIPT = Path(__file__).resolve().parents[1] / 'tools' / 'update_manifest.py'
spec = importlib.util.spec_from_file_location('misioflix_manifest_update', SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

GUID = '97d15b37-b868-492b-83da-eb67b16a0d44'


class TestReleaseManifest(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.meta = self.root / 'meta.json'
        self.metadata = {
            'guid': GUID,
            'name': 'MisioFlix',
            'version': '0.4.0.0',
            'targetAbi': '12.4.0.0',
            'description': 'test',
            'overview': 'test',
        }
        self.meta.write_text(json.dumps(self.metadata))
        self.manifest = self.root / 'manifest.json'
        self.manifest.write_text('[]')
        self.zip = self.root / 'MisioFlix_0.4.0.0_JF12.4.zip'
        with zipfile.ZipFile(self.zip, 'w') as z:
            z.writestr('Jellyfin.Plugin.MisioFlix.dll', b'test-dll')
            z.writestr('meta.json', self.meta.read_text())

    def tearDown(self):
        self.temp.cleanup()

    def test_manifest_expected_metadata_md5_and_url(self):
        data = mod.create_manifest(self.zip, self.meta, self.manifest, 'kumblip/misioflix', 'test', stamp='2026-11-10T00:00:00Z')
        self.assertEqual(data[0]['guid'], GUID)
        v = data[0]['versions'][0]
        self.assertEqual(v['checksum'], hashlib.md5(self.zip.read_bytes()).hexdigest())
        self.assertEqual(len(v['checksum']), 32)
        self.assertEqual(v['version'], '0.4.0.0')
        self.assertEqual(v['targetAbi'], '12.4.0.0')
        self.assertEqual(v['sourceUrl'], 'https://github.com/kumblip/misioflix/releases/download/v0.4.0.0/MisioFlix_0.4.0.0_JF12.4.zip')

    def test_idempotent(self):
        first = mod.create_manifest(self.zip, self.meta, self.manifest, 'kumblip/misioflix', 'test', stamp='2026-11-10T00:00:00Z')
        self.manifest.write_text(json.dumps(first))
        second = mod.create_manifest(self.zip, self.meta, self.manifest, 'kumblip/misioflix', 'later', stamp='2026-11-11T00:00:00Z')
        self.assertEqual(first, second)
        self.assertEqual(len(second[0]['versions']), 1)

    def test_reject_unexpected_zip_layout(self):
        with zipfile.ZipFile(self.zip, 'w') as z:
            z.writestr('folder/Jellyfin.Plugin.MisioFlix.dll', b'test-dll')
            z.writestr('folder/meta.json', self.meta.read_text())
        with self.assertRaises(ValueError):
            mod.create_manifest(self.zip, self.meta, self.manifest, 'kumblip/misioflix', 'test')

    def test_reject_overwrite_published_version(self):
        first = mod.create_manifest(self.zip, self.meta, self.manifest, 'kumblip/misioflix', 'test')
        self.manifest.write_text(json.dumps(first))
        with zipfile.ZipFile(self.zip, 'w') as z:
            z.writestr('Jellyfin.Plugin.MisioFlix.dll', b'DIFFERENT')
            z.writestr('meta.json', self.meta.read_text())
        with self.assertRaises(ValueError):
            mod.create_manifest(self.zip, self.meta, self.manifest, 'kumblip/misioflix', 'test')


if __name__ == '__main__':
    unittest.main()
