#!/usr/bin/env python3
"""Fail-closed V100 repair: apply Search Cache or repair an incomplete V100 upload.

This tool touches ONLY a clean, isolated copy of the MisioFlix repository;
not Jellyfin's runtime or the user's NAS. It never publishes releases.
"""
from __future__ import annotations
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

PATCH_DIR = Path(__file__).resolve().parent / 'search_cache_v100'
MARKERS = (
    'misioflix-search-catalog-v1',
    'function catalogScope()',
    'function readCatalogSnapshot(',
    'SEARCH_CATALOG_FRESH_MS',
    'function refreshScopedCatalog(',
)
ALLOWED_VERSIONS = {'0.4.99.0', '0.4.100.0'}


def atomically_save_text(path: Path, text: str) -> None:
    tmp = path.with_suffix(path.suffix + '.v100tmp')
    tmp.write_text(text, encoding='utf-8')
    tmp.replace(path)


def write_if_different(path: Path, data: bytes) -> None:
    if not path.is_file() or path.read_bytes() != data:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)


def upgrade(repo: Path) -> str:
    meta_path = repo / 'meta.json'
    home_path = repo / 'src/Jellyfin.Plugin.MisioFlix/Web/home.js'
    tests = repo / 'tests/current'
    if not meta_path.is_file() or not home_path.is_file() or not tests.is_dir():
        raise ValueError('To nie są kompletne źródła MisioFlixa: brak meta.json, Web/home.js lub tests/current.')
    meta = json.loads(meta_path.read_text(encoding='utf-8'))
    version = str(meta.get('version', ''))
    if version not in ALLOWED_VERSIONS:
        raise ValueError('Niezgodna wersja ' + version + '; wymagane dokładnie 0.4.99.0 lub niedokończona 0.4.100.0.')
    if meta.get('targetAbi') != '12.4.0.0':
        raise ValueError('Nieoczekiwane targetAbi: niczego nie zmieniono.')
    home = home_path.read_text(encoding='utf-8')
    markers = [marker in home for marker in MARKERS]
    if any(markers) and not all(markers):
        raise ValueError('Wykryto niepełną łatkę wyszukiwarki; przerwano bez zmian w kodzie.')
    if not any(markers) and version == '0.4.100.0':
        raise ValueError('Źródła mają numer v0.4.100.0, ale nie zawierają Search Cache. Nie publikuj.')
    if not any(markers):
        if version != '0.4.99.0':
            raise ValueError('Nieznany stan bazowy.')
        result = subprocess.run([sys.executable, str(PATCH_DIR / 'apply_patch.py'), str(repo)], check=False)
        if result.returncode:
            raise ValueError('Nałożenie Search Cache nie powiodło się. Przerwano.')
        status = 'Nałożono oryginalną poprawkę Search Cache v0.4.100.'
    else:
        status = 'Search Cache jest już w home.js; uzupełniono tylko wersję i testy.'
        if version == '0.4.99.0':
            meta['version'] = '0.4.100.0'
            meta['description'] = 'MisioFlix v0.4.100: pamięć katalogu wyszukiwania, oddzielnie dla użytkowników'
            atomically_save_text(meta_path, json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
    # Current GitHub build.yml still runs historical version-pinned tests; the
    # release workflow already uses maintained tests/current via tools/run_tests.py.
    # Change CI selection only. Never alter source behavior or the publish guard.
    workflow = repo / '.github/workflows/build.yml'
    if not workflow.is_file():
        raise ValueError('Brak .github/workflows/build.yml; przerwano, bo testy CI nie będą spójne.')
    flow_text = workflow.read_text(encoding='utf-8')
    old_ci = ("          python3 -m unittest discover -s tests -p 'test_*.py' -v\n"
              "          find tests -maxdepth 1 -name '*.cjs' -type f -print0 | sort -z | xargs -0 -r -n1 node")
    if old_ci in flow_text:
        atomically_save_text(workflow, flow_text.replace(old_ci, '          python3 tools/run_tests.py'))
    elif 'python3 tools/run_tests.py' not in flow_text:
        raise ValueError('Nieznany wariant build.yml. Nie zmieniono testów CI; przerwano.')
    # Ensure supplemental files exist even if a previous GitHub upload was partial.
    write_if_different(tests / 'search_catalog_cache_100.cjs', (PATCH_DIR / 'tests/search_catalog_cache_100.cjs').read_bytes())
    write_if_different(repo / 'CHANGELOG_v0.4.100_SEARCH_CACHE.md', (PATCH_DIR / 'CHANGELOG_v0.4.100_SEARCH_CACHE.md').read_bytes())
    # Older regression hardcoded an upper bound of version 0.4.99.
    legacy = tests / 'test_library_collections_0425.py'
    if legacy.is_file():
        data = legacy.read_text(encoding='utf-8')
        before = r"r'^0\.4\.(?:2[5-9]|[3-9][0-9])\.0$'"
        after = r"r'^0\.4\.[1-9][0-9]*\.0$'"
        if before in data:
            atomically_save_text(legacy, data.replace(before, after))
    after_meta = json.loads(meta_path.read_text(encoding='utf-8'))
    after_home = home_path.read_text(encoding='utf-8')
    if after_meta.get('version') != '0.4.100.0' or not all(m in after_home for m in MARKERS):
        raise ValueError('Błąd wewnętrzny: niepełne postwarunki. Nie publikuj.')
    if not re.fullmatch(r'0\.4\.100\.0', after_meta['version']):
        raise ValueError('Numer wydania nie jest poprawny.')
    return status


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('repository', type=Path)
    args = p.parse_args()
    try:
        state = upgrade(args.repository.resolve())
    except (ValueError, OSError, json.JSONDecodeError) as e:
        print('PRZERWANO: ' + str(e), file=sys.stderr)
        return 1
    print('OK: ' + state)
    print('META VERSION: 0.4.100.0')
    print('Dalej: python tools/sync_version.py, testy, opcjonalnie push na GitHub.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
