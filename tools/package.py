#!/usr/bin/env python3
"""Create a flat Jellyfin plugin ZIP and checksum sidecars, without NuGet on NAS."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
META = ROOT / 'meta.json'
PROJECT = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj'
OUTPUT = ROOT / 'build/publish'
DIST = ROOT / 'dist'
PLUGIN_DLL = 'Jellyfin.Plugin.MisioFlix.dll'


def normalized_version(s: str) -> str:
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:\.\d+)?', s):
        raise ValueError(f'Nieprawidłowa wersja: {s}')
    return s if s.count('.') == 3 else s + '.0'


def main():
    meta = json.loads(META.read_text(encoding='utf-8'))
    version = normalized_version(meta['version'])
    project_version = ET.parse(PROJECT).findtext('.//Version')
    if normalized_version(project_version or '') != version:
        raise SystemExit(f'Niezgodne wersje: meta.json={version}, csproj={project_version}')
    if meta['targetAbi'] != '12.4.0.0':
        raise SystemExit('Przerwany build: targetAbi musi odpowiadać Jellyfin 12.4.0.0')
    if meta.get('assemblies') != [PLUGIN_DLL]:
        raise SystemExit('Nieprawidłowa lista assemblies w meta.json')
    dll = OUTPUT / PLUGIN_DLL
    if not dll.is_file() or dll.stat().st_size == 0:
        raise SystemExit(f'Brak pliku DLL: {dll}')
    DIST.mkdir(exist_ok=True, parents=True)
    archive = DIST / f'MisioFlix_{version}_JF12.4.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.write(dll, PLUGIN_DLL)
        z.write(META, 'meta.json')
    # ZIP installed via plugin catalog should contain plugin files at archive root.
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        if sorted(names) != sorted(['meta.json', PLUGIN_DLL]):
            raise SystemExit('ZIP zawiera nieoczekiwane pliki lub dodatkowy katalog')
        embedded = json.loads(z.read('meta.json'))
        if normalized_version(embedded['version']) != version or embedded['guid'] != meta['guid']:
            raise SystemExit('Metadane wewnątrz ZIP są niespójne')
        if z.testzip() is not None:
            raise SystemExit('Uszkodzone archiwum')
    data = archive.read_bytes()
    (archive.with_name(archive.name + '.md5')).write_text(hashlib.md5(data).hexdigest() + '\n', encoding='ascii')
    (archive.with_name(archive.name + '.sha256')).write_text(hashlib.sha256(data).hexdigest() + '\n', encoding='ascii')
    print('ZIP:', archive)
    print('MD5:', hashlib.md5(data).hexdigest(), '(wymagane przez Jellyfin manifest)')
    print('SHA256:', hashlib.sha256(data).hexdigest())
    if os.getenv('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as f:
            f.write(f'version={version}\n')
            f.write(f'tag=v{version}\n')
            f.write(f'archive={archive.relative_to(ROOT).as_posix()}\n')
            f.write(f'archive_name={archive.name}\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
