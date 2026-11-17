"""v0.4.98: read-only collection poster mosaics on shelves, directory and details."""
from pathlib import Path
import subprocess
import json

ROOT = Path(__file__).resolve().parents[2]
HOME = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text(encoding='utf8')
DETAILS = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web/details.js').read_text(encoding='utf8')
THEME = (ROOT / 'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text(encoding='utf8')


def test_home_js_has_lazy_user_scoped_collection_preview_loader():
    assert 'function queueHomeCollectionPreview' in HOME
    assert 'function loadHomeCollectionPreview' in HOME
    assert 'new IntersectionObserver' in HOME
    assert 'homeCollectionPreviewActive<3' in HOME
    assert "currentUserId()===uid && currentToken()===activeToken" in HOME
    assert "const query=new URLSearchParams({ParentId:id,Recursive:'false'" in HOME
    assert "item.type==='BoxSet' && validId(item.id)" in HOME
    assert "for(const node of homeRoot?.querySelectorAll" in HOME


def test_collection_has_native_poster_priority_and_error_fallback():
    assert "link.querySelector(':scope > .mf-home-cover')" in HOME
    assert "img.addEventListener('error'" in HOME
    assert "link.classList.add('mf-home-no-cover')" in HOME
    assert 'mf-home-collection-preview' in HOME


def test_mosaic_has_no_empty_cells_for_one_two_three_or_four_items():
    assert '[data-count="1"]' in THEME
    assert '[data-count="2"]' in THEME
    assert '[data-count="3"] > img:first-child' in THEME
    assert 'grid-row:span 2' in THEME
    assert 'grid-template-columns:repeat(2,minmax(0,1fr))' in THEME
    assert 'grid-template-rows:minmax(0,1fr)' in THEME
    assert 'object-fit:cover' in THEME
    assert 'grid.dataset.count=String(grid.childElementCount)' in HOME


def test_detail_collage_uses_owned_overlay_without_reparenting_native_cards():
    start = DETAILS.index('async function showCollectionDetailPreview(')
    end = DETAILS.index('async function firstEpisode(', start)
    snippet = DETAILS[start:end]
    assert "String(item?.Type)!=='BoxSet'" in snippet
    assert 'item?.ImageTags?.Primary' in snippet
    assert "page.querySelector('.detailPagePrimaryContainer > .detailImageContainer')" in snippet
    assert "const host=container?.querySelector('.cardImageContainer')||container;" in snippet
    assert "host.append(poster)" in snippet
    assert '.mf-detail-collection-preview' in snippet
    assert 'POST' not in snippet and 'DELETE' not in snippet and 'PUT' not in snippet
    assert 'restoreLayout(page);' in DETAILS
    assert "void showCollectionDetailPreview(page,item,itemId,serial)" in DETAILS
    assert "collage.remove()" in DETAILS


def test_version_and_script_syntax():
    version=json.loads((ROOT / 'meta.json').read_text(encoding='utf8'))['version']
    assert (ROOT/'src/Jellyfin.Plugin.MisioFlix/Jellyfin.Plugin.MisioFlix.csproj').read_text(encoding='utf8').find('<AssemblyVersion>'+version+'</AssemblyVersion>')>=0
    for name in ['home.js','details.js']:
        subprocess.run(['node','--check',str(ROOT/'src/Jellyfin.Plugin.MisioFlix/Web'/name)],check=True,capture_output=True)
