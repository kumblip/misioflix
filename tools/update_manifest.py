#!/usr/bin/env python3
"""Update Jellyfin repository manifest from a verified release ZIP; standard library only."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import re
from urllib.parse import quote
import zipfile


def version4(value: str) -> str:
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:\.\d+)?', value):
        raise ValueError(f'Nieprawidłowa wersja: {value}')
    return value if value.count('.') == 3 else value + '.0'


def version_tuple(v: str):
    return tuple(map(int, version4(v).split('.')))


def create_manifest(archive: Path, metadata_path: Path, manifest_path: Path, repo: str, changelog: str, stamp=None):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo):
        raise ValueError('Nieprawidłowe owner/repo')
    metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
    version = version4(metadata['version'])
    if metadata['targetAbi'] != '12.4.0.0':
        raise ValueError('Nieprawidłowe targetAbi')
    if not archive.is_file():
        raise FileNotFoundError(archive)
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        if sorted(names) != sorted(['Jellyfin.Plugin.MisioFlix.dll', 'meta.json']):
            raise ValueError('Release ZIP musi mieć DLL oraz meta.json w katalogu głównym')
        if z.testzip() is not None:
            raise ValueError('ZIP nie przeszedł testu integralności')
        installed = json.loads(z.read('meta.json'))
        if version4(installed['version']) != version or installed['guid'].lower() != metadata['guid'].lower():
            raise ValueError('ZIP zawiera meta.json innej wtyczki/wersji')
    expected_name = f'MisioFlix_{version}_JF12.4.zip'
    if archive.name != expected_name:
        raise ValueError(f'Nieoczekiwana nazwa archiwum: {archive.name}, wymagane: {expected_name}')
    raw = archive.read_bytes()
    # Jellyfin repo manifest uses MD5, NOT SHA-256 for `checksum`.
    checksum = hashlib.md5(raw).hexdigest()
    timestamp = stamp or datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    source_url = (f'https://github.com/{repo}/releases/download/'
                  f'v{quote(version)}/{quote(archive.name)}')
    release = {
        'version': version,
        'changelog': changelog,
        'targetAbi': metadata['targetAbi'],
        'sourceUrl': source_url,
        'checksum': checksum,
        'timestamp': timestamp,
    }
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.is_file() else []
    if not isinstance(manifest, list):
        raise ValueError('manifest.json musi być tablicą JSON')
    entry = next((x for x in manifest if x.get('guid', '').lower() == metadata['guid'].lower()), None)
    if entry is None:
        entry = {
            'guid': metadata['guid'],
            'name': metadata['name'],
            'description': metadata.get('description', ''),
            'overview': metadata.get('overview', ''),
            'owner': repo.split('/')[0],
            'category': metadata.get('category', 'General'),
            'imageUrl': f'https://raw.githubusercontent.com/{repo}/main/src/Jellyfin.Plugin.MisioFlix/Web/assets/mark.png',
            'versions': [],
        }
        manifest.append(entry)
    else:
        if entry.get('name') != metadata['name']:
            raise ValueError('Istniejący wpis GUID ma inną nazwę')
    for prior in entry['versions']:
        if version4(prior['version']) == version:
            if prior.get('checksum', '').lower() != checksum or prior.get('sourceUrl') != source_url:
                raise ValueError('Ta wersja została już opublikowana z inną paczką — zwiększ numer wersji')
            print('Wersja już istnieje; zachowano poprzednią datę publikacji')
            return manifest
    entry['versions'].append(release)
    entry['versions'].sort(key=lambda x: version_tuple(x['version']), reverse=True)
    return manifest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--archive', type=Path, required=True)
    ap.add_argument('--meta', type=Path, default=Path('meta.json'))
    ap.add_argument('--manifest', type=Path, default=Path('manifest.json'))
    ap.add_argument('--repo', default='kumblip/misioflix')
    ap.add_argument('--changelog', default='Wydanie MisioFlix dla Jellyfin 12.4.')
    args = ap.parse_args()
    out = create_manifest(args.archive, args.meta, args.manifest, args.repo, args.changelog)
    args.manifest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Zapisano {args.manifest}. Pozycje: {len(out)}')


if __name__ == '__main__':
    main()
