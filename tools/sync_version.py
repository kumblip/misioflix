#!/usr/bin/env python3
"""Single version source for build/release: meta.json; update csproj in CI."""
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
META = ROOT / 'meta.json'
PROJECT = ROOT / 'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj'

def sync_version():
    meta=json.loads(META.read_text(encoding='utf-8'))
    version=meta['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+\.\d+', version):
        raise SystemExit('meta.json: invalid four-part version')
    if meta['targetAbi'] != '12.4.0.0':
        raise SystemExit('meta.json: incompatible Jellyfin ABI')
    text=PROJECT.read_text(encoding='utf-8')
    for tag,value in [('Version',version.removesuffix('.0')),
                      ('AssemblyVersion',version),('FileVersion',version)]:
        pattern=r'(<'+tag+r'>)[^<]*(</'+tag+r'>)'
        updated, count=re.subn(pattern, lambda m: m.group(1)+value+m.group(2), text, count=1)
        if count!=1: raise SystemExit('csproj: missing or repeated '+tag)
        text=updated
    ET.fromstring(text)
    PROJECT.write_text(text,encoding='utf-8')
    print('MisioFlix build version:',version)
    return version

if __name__=='__main__': sync_version()
