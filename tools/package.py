#!/usr/bin/env python3
"""Package only the plugin DLL and its exact Jellyfin 12.4 manifest."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "meta.json").read_text(encoding="utf-8"))
assert manifest["targetAbi"] == "12.4.0.0"
assert manifest["assemblies"] == ["Jellyfin.Plugin.MisioFlix.dll"]
source = ROOT / "build" / "publish" / "Jellyfin.Plugin.MisioFlix.dll"
if not source.exists():
    raise SystemExit("Brak skompilowanej DLL. Najpierw wykonaj dotnet publish (lub GitHub Actions).")
folder = ROOT / "dist" / "MisioFlix_0.4.0"
folder.mkdir(parents=True, exist_ok=True)
shutil.copy2(source, folder / source.name)
shutil.copy2(ROOT / "meta.json", folder / "meta.json")
archive = shutil.make_archive(str(ROOT / "dist" / "MisioFlix_0.4.0_JF12.4"), "zip", ROOT / "dist", "MisioFlix_0.4.0")
print("Spakowano:", archive)
