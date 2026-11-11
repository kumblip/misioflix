#!/usr/bin/env python3
"""Run only maintained MisioFlix tests under tests/current.

Historical test files under tests/ are preserved for reference; many assert
literal versions 0.4.6-0.4.11 and must not be used to validate later releases.
Add new tests to tests/current; workflows remain unchanged.
"""
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
CURRENT = ROOT / "tests" / "current"

def main() -> int:
    if not CURRENT.is_dir():
        print("ERROR: missing tests/current. Upload the CI repair source files.", file=sys.stderr)
        return 2
    python_files = sorted(CURRENT.glob("test_*.py"))
    node_files = sorted(CURRENT.glob("*.cjs"))
    if not python_files or not node_files:
        print("ERROR: active Python / Node test files missing.", file=sys.stderr)
        return 2
    print(f"Active CI tests: {len(python_files)} Python modules, {len(node_files)} Node scripts", flush=True)
    suite = unittest.defaultTestLoader.discover(str(CURRENT), pattern="test_*.py", top_level_dir=str(CURRENT))
    total = suite.countTestCases()
    if total == 0:
        print("ERROR: 0 discovered tests; aborting build", file=sys.stderr)
        return 2
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if not result.wasSuccessful():
        return 1
    print(f"Python tests passed: {result.testsRun}", flush=True)
    for file in node_files:
        print(f"Node test: {file.name}", flush=True)
        completed = subprocess.run(["node", str(file)], cwd=ROOT, check=False)
        if completed.returncode:
            print(f"ERROR: Node test failed: {file.name}", file=sys.stderr)
            return completed.returncode
    print(f"PASS: {result.testsRun} Python tests, {len(node_files)} Node scripts", flush=True)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
