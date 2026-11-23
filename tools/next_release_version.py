#!/usr/bin/env python3
"""Choose the next unused MisioFlix release version at publish time.

Uses complete git tags (workflow checkout fetch-depth: 0) and the Jellyfin
manifest, preventing a restored older source tree from reusing old releases.
The build workflow is intentionally unaffected; only release.yml invokes this.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)\.(\d+)$")


def next_version(meta: dict, tags: list[str], manifest: list[dict]) -> str:
    match = VERSION.fullmatch(str(meta['version']))
    if not match:
        raise ValueError('Invalid meta.json version')
    major, minor, patch, build = map(int, match.groups())
    if build != 0:
        raise ValueError('Expected four-component MisioFlix version ending in .0')
    # Existing published versions are authoritative. An explicit, higher
    # meta.json version (e.g. 0.4.139.0) is publishable as-is when unused.
    # Otherwise the next available patch number is chosen automatically.
    highest_published = -1
    # Keep the 0.4 line and only increase its patch number; never roll back.
    for source in list(tags) + [str(v.get('version','')) for entry in manifest for v in entry.get('versions',[])]:
        found = VERSION.fullmatch(source.strip())
        if not found:
            continue
        a,b,c,d = map(int,found.groups())
        if a==major and b==minor:
            highest_published=max(highest_published,c)
    candidate=max(patch,highest_published+1)
    return f'{major}.{minor}.{candidate}.0'


def main() -> None:
    meta_path=ROOT/'meta.json'
    meta=json.loads(meta_path.read_text(encoding='utf-8'))
    manifest_path=ROOT/'manifest.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else []
    if not isinstance(manifest,list):
        raise ValueError('Invalid manifest.json structure')
    tags=subprocess.check_output(['git','tag','--list'],cwd=ROOT,text=True).splitlines()
    new=next_version(meta,tags,manifest)
    old=str(meta['version'])
    meta['version']=new
    # Preserve the source's description except for its release number.
    meta['description']=re.sub(r'(?<!\d)0\.4\.\d+(?:\.0)?(?!\d)', new[:-2],str(meta.get('description','')), count=1)
    meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Automatic release version: {old} -> {new}')


if __name__=='__main__':
    main()
