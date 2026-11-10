"""Manual local Chromium test. NOT a GitHub workflow dependency."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
js=(root/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text()
css=(root/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text()
LIBS=[{'id':(hex(i+10)[2:]*32)[:32],'name':n,'category':cat,'href':'#/movies?topParentId='+str(i)} for i,(n,cat) in enumerate([
 ('AnimePL','anime'),('Filmy ENG','movies'),('Filmy PL','movies'),('Seriale Animowane PL','series'),('Seriale PL','series')])]
source='''window.ApiClient={accessToken:()=>"test-token"};
window.MOCK_CALLS=[];
const libs=__LIBS__;
window.fetch=async (url, opts) => {
 const path=String(url);window.MOCK_CALLS.push(path);
 let data;
 if(path.endsWith('/home/libraries'))data=libs;
 else if(path.endsWith('/home/resume'))data={items:[{item:{id:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',type:'Series',anime:true,title:'Anime testowe',hasPrimary:true},resumeId:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',season:1,episode:3,progress:42,nextUp:false}],hidden:[]};
 else if(path.includes('/home/shelf')){const p=new URL('http://test'+path);let list=[];for(let i=0;i<14;i++){const anime=libs.find(x=>x.id===p.searchParams.get('libraryId'))?.category==='anime';list.push({id:(String(i+1).padStart(32,'0')),anime,type:anime?'Series':'Movie',hasPrimary:true,year:'2026',title:'Przykładowa produkcja numer '+(i+1),description:'Opis testowy. Przekaz zapewnia cztery linie tekstu i proporcje plakatu.',genres:['Fantasy','Dramat','Komedia'],seasons:2,episodes:24,userRating:8.5,watchStatus:i%3===0?'started':i%3===1?'watched':'unwatched'});}data={items:list.slice(0,12),hasMore:true};}
 else if(path.includes('/resume/hide')||path.includes('/resume/restore'))data={success:true};
 else data={};
 return {ok:true,json:async()=>data,status:200};
};'''.replace('__LIBS__',json.dumps(LIBS))
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1550,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><head></head><body style="margin:0;background:#1b0d1f;color:#fff"><header style="height:52px;background:black">Jellyfin — oryginalne menu</header><main></main></body></html>')
 page.evaluate('location.hash="#/home"')
 page.evaluate(source)
 page.add_style_tag(content=css)
 page.evaluate("document.documentElement.classList.add('misioflix-skin')")
 page.add_script_tag(content=js)
 page.wait_for_timeout(1600)
 count=page.locator('.mf-home-shelf').count(); first=page.locator('.mf-home-card').count()
 print('SHELVES',count,'CARDS',first,'RESUME',page.locator('.mf-home-resume-card').count(),'ERRORS',errors)
 assert count==5,count
 assert first>=12,first
 assert not errors,errors
 page.screenshot(path='/mnt/data/misioflix_v0412_preview.png',full_page=True)
 # verify random sends scoped query
 page.locator('.mf-home-shelf').first.locator('.mf-home-shuffle').click()
 page.wait_for_timeout(200)
 print('RANDOM CALLS',page.evaluate('window.MOCK_CALLS.filter(x=>x.includes("mode=random"))'))
 assert page.evaluate('window.MOCK_CALLS.filter(x=>x.includes("mode=random")).length')==1
 # hide item without touching Jellyfin metadata
 page.locator('.mf-home-resume-remove').first.click()
 page.wait_for_timeout(100)
 assert page.locator('.mf-home-hidden-toggle').count()==1
 assert '1' in page.locator('.mf-home-hidden-toggle').inner_text()
 # in-page return via logo should not duplicate root
 page.evaluate('location.hash="#/"')
 page.wait_for_timeout(300)
 assert page.locator('#mf-home-0412').count()==1
 # route away from home hides portal
 page.evaluate('location.hash="#/movies"')
 page.wait_for_timeout(300)
 assert page.locator('#mf-home-0412').count()==0
 print('PASS random, hide, SPA route')
 browser.close()
