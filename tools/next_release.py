#!/usr/bin/env python3
"""Determine a free MisioFlix version from published Git tags, not from manual edits.

Use only inside the release workflow, *before* sync_version.py and compilation.
This script never deletes or changes existing releases/tags.
"""
from __future__ import annotations

import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
META = ROOT / "meta.json"
TAG_PATTERN = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)\.(\d+)$")


def parse_version(text: str) -> tuple[int, int, int, int] | None:
    match = TAG_PATTERN.fullmatch(text.strip())
    return tuple(int(x) for x in match.groups()) if match else None


def next_version(current: str, tag_names: list[str]) -> str:
    parsed_current = parse_version(current)
    if parsed_current is None:
        raise ValueError(f"meta.json zawiera niepoprawny numer wersji: {current!r}")
    published = {v for x in tag_names if (v := parse_version(x)) is not None}
    latest = max(published) if published else None
    # Respect an explicitly advanced metadata version if it has never been released.
    if latest is None or (parsed_current > latest and parsed_current not in published):
        result = parsed_current
    else:
        # MisioFlix's normal line is v0.4.121.0 -> v0.4.122.0.
        major, minor, patch, _build = max(latest, parsed_current)
        result = (major, minor, patch + 1, 0)
    # Defensive check (do not reuse an already published tag).
    while result in published:
        major, minor, patch, _build = result
        result = (major, minor, patch + 1, 0)
    return '.'.join(map(str, result))


def main() -> None:
    meta = json.loads(META.read_text(encoding="utf-8"))
    if meta.get("targetAbi") != "12.4.0.0":
        raise SystemExit("Nieprawidłowe targetAbi; oczekiwano 12.4.0.0")
    # actions/checkout fetch-depth:0 plus git fetch --tags includes published tags.
    completed = subprocess.run(["git", "tag", "--list", "v*"], cwd=ROOT,
                               check=True, text=True, capture_output=True)
    tags = completed.stdout.splitlines()
    old = meta["version"]
    new = next_version(old, tags)
    meta["version"] = new
    META.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"MisioFlix: meta.json={old}, istniejące tagi={len(tags)} -> następne wydanie v{new}")
    # Fail only if caller has a genuine conflict; do not mutate a published tag.


if __name__ == "__main__":
    main()
