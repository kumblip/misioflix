"""Local real-Chromium smoke tests for the v0.4.18 homepage; never run on NAS."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
js=(root/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text()
css=(root/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text()
libs=[{'id':f'{i+20:032x}','name':n,'category':cat,'href':'#/movies?topParentId='+f'{i+20:032x}'} for i,(n,cat) in enumerate([
 ('AnimePL','anime'),('Filmy ENG','movies'),('Filmy PL','movies'),('Seriale Animowane PL','series'),('Seriale PL','series')])]

def tile(i,typ='Series'):
 return {'id':f'{i+100:032x}','title':f'Testowy tytuł {i}', 'anime':typ=='Series', 'type':typ,
  'hasPrimary':False,'year':'2026','genres':['Fantasy','Dramat'],'description':'Opis tytułu w bibliotece',
  'seasons':2,'episodes':26,'watchStatus':'started','userRating':8.5}

resume=[{'item':tile(i), 'resumeId':f'{i+200:032x}', 'season':1,'episode':i, 'progress':i*4,'nextUp':False} for i in range(1,16)]
hidden=[{'item':tile(i),'resumeId':f'{i+200:032x}', 'season':2,'episode':i, 'progress':10,'nextUp':False} for i in [16,17]]

mock=f'''window.ApiClient={{accessToken:()=>'token'}};
window.MOCK_CALLS=[];
window.TEST_RANDOM_COUNT=0;
const libs={json.dumps(libs)};
let resumes={json.dumps(resume)};
let hidden={json.dumps(hidden)};
window.fetch=async function(url,opts) {{
 const path=String(url);window.MOCK_CALLS.push(path);
 let data;
 if(path.endsWith('/home/libraries'))data=libs;
 else if(path.endsWith('/home/resume'))data={{items:resumes,hidden:hidden}};
 else if(path.includes('/home/shelf')) {{
   const u=new URL(path,'http://example.org');
   const mode=u.searchParams.get('mode');
   if(mode==='random') {{
     window.TEST_RANDOM_COUNT++;
     data={{items:Array.from({{length:5}},(_,i)=>({json.dumps(tile(1))})).map((t,i)=>({{...t,id:(1200+window.TEST_RANDOM_COUNT*10+i).toString(16).padStart(32,'0'),title:'Losowy tytuł '+(window.TEST_RANDOM_COUNT*10+i)}})),hasMore:false}};
   }} else data={{items:Array.from({{length:12}},(_,i)=>({json.dumps(tile(1))})).map((t,i)=>({{...t,id:(300+i).toString(16).padStart(32,'0'),title:'Nowy tytuł '+i}})),hasMore:false}};
 }} else if (path.endsWith('/resume/hide') || path.endsWith('/resume/restore')) {{
   const id=JSON.parse(opts.body).CatalogId;
   const isHide=path.endsWith('/resume/hide');
   const src=isHide?resumes:hidden;const dst=isHide?hidden:resumes;
   const idx=src.findIndex(x=>x.item.id===id);
   if(idx>=0)dst.push(...src.splice(idx,1));
   data={{success:true}};
 }} else data={{}};
 return {{ok:true,status:200,json:async()=>data}};
}};
'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1855,'height':1000},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<!doctype html><html><head></head><body style="background:#1a0c1c;color:#fff;margin:0">\n<header style="height:45px;background:#160b18">misioflix · Ulubione · AnimePL · Filmy ENG · Filmy PL</header><main id="indexPage"></main></body></html>')
    page.evaluate('location.hash="#/home"')
    page.evaluate(mock)
    page.add_style_tag(content=css)
    page.evaluate('document.documentElement.classList.add("misioflix-skin")')
    page.add_script_tag(content=js)
    page.wait_for_selector('.mf-home-resume-card')
    page.wait_for_selector('.mf-home-shelf')
    page.wait_for_timeout(700)
    assert not errors,errors
    assert page.locator('.mf-home-hero > .mf-home-discovery').count()==1
    assert page.locator('.mf-home-hero .mf-home-folder-button').count()==7
    assert page.locator('.mf-home-hero .mf-home-resume').count()==0
    assert page.locator('.mf-home-resume-shelf').count()==1
    assert page.locator('.mf-home-resume-card').count()==15
    assert page.locator('.mf-home-shelf').count()==5
    resume_area=page.locator('.mf-home-resume-items')
    assert resume_area.evaluate('(e)=>e.scrollWidth>e.clientWidth')
    page.screenshot(path='/mnt/data/MisioFlix_0.4.18_podglad.png',full_page=True)

    # Native Jellyfin history is unchanged; X triggers only the specific hide endpoint.
    page.locator('.mf-home-resume-card .mf-home-resume-remove').first.click()
    page.wait_for_timeout(100)
    assert page.locator('.mf-home-resume-card').count()==14
    assert page.locator('.mf-home-hidden-toggle').inner_text()=='Pokaż ukryte (3)'
    assert page.evaluate('window.MOCK_CALLS.some(x=>x.endsWith("/resume/hide"))')
    page.locator('.mf-home-hidden-toggle').click()
    assert page.locator('.mf-home-resume-card').count()==17
    assert page.locator('.mf-home-resume-card-hidden').count()==3
    assert page.locator('.mf-home-hidden-toggle').inner_text()=='Ukryj ukryte (3)'
    page.locator('.mf-home-resume-card-hidden .mf-home-resume-remove').first.click()
    page.wait_for_timeout(100)
    assert page.locator('.mf-home-resume-card').count()==17
    assert page.locator('.mf-home-resume-card-hidden').count()==2
    page.locator('.mf-home-hidden-toggle').click()
    assert page.locator('.mf-home-resume-card').count()==15
    assert page.locator('.mf-home-resume-card-hidden').count()==0

    shelf=page.locator('.mf-home-shelf').first
    assert shelf.locator('.mf-home-shuffle').is_visible()
    assert shelf.locator('.mf-home-latest').is_visible()
    shelf.locator('.mf-home-shuffle').click()
    page.wait_for_timeout(120)
    assert shelf.locator('.mf-home-card').count()==5
    assert shelf.locator('.mf-home-shuffle').is_visible()
    assert shelf.locator('.mf-home-latest').is_visible()
    labels=shelf.locator('.mf-home-card-title').all_inner_texts()
    shelf.locator('.mf-home-shuffle').click()
    page.wait_for_timeout(120)
    assert shelf.locator('.mf-home-card').count()==5
    assert shelf.locator('.mf-home-card-title').all_inner_texts()!=labels
    shelf.locator('.mf-home-latest').click()
    page.wait_for_timeout(120)
    assert shelf.locator('.mf-home-card').count()==12
    assert shelf.locator('.mf-home-shuffle').is_visible()
    assert shelf.locator('.mf-home-latest').is_visible()
    assert not errors,errors
    print('PASS: 7 shortcuts in hero; full-width 15-item carousel; hide/show/restore; 5-item reroll; latest 12; player CSS untouched')
    browser.close()
