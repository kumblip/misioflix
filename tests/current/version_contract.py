"""Current release version determined from the C# assembly, not a stale test literal."""
from pathlib import Path
import re
PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROJECT = PROJECT_ROOT / 'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj'

def read_assembly_version():
    xml = PROJECT.read_text(encoding='utf8')
    match = re.search(r'<AssemblyVersion>(\d+\.\d+\.\d+\.\d+)</AssemblyVersion>', xml)
    if not match:
        raise ValueError('AssemblyVersion missing from csproj')
    return match.group(1)

CURRENT_RELEASE = read_assembly_version()
