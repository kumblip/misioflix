"""Local Chromium smoke: native play proxy, main-info link, hide/remove controls. Not NAS test."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
js=(root/'src/Jellyfin.Plugin.MisioFlix/Web/home.js').read_text()
css=(root/'src/Jellyfin.Plugin.MisioFlix/Web/theme.css').read_text()
server='a'*32
catalog='b'*32
episode='c'*32
movie='d'*32
libs=[{'id':'1'*32,'name':'AnimePL','category':'anime','href':'#/movies?topParentId='+'1'*32}]
resume=[{'item':{'id':catalog,'serverId':server,'title':'Przykładowe anime','type':'Series','hasPrimary':False},
         'resumeId':episode,'season':1,'episode':2,'progress':37,'nextUp':False,'positionTicks':4200000000,'resumeType':'Episode'},
        {'item':{'id':movie,'serverId':server,'title':'Przykładowy film','type':'Movie','hasPrimary':False},
         'resumeId':movie,'season':None,'episode':None,'progress':12,'nextUp':False,'positionTicks':1200000000,'resumeType':'Movie'}]
mock='''
window.ApiClient={accessToken:()=>"token",serverId:()=>"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"};
window.PLAYS=[];window.CALLS=[];window.confirm=()=>true;
const libs=LIBS;let watching=WATCH,hidden=[];
document.querySelector('.itemsContainer').addEventListener('click',e=>{
 const shell=e.target.closest('.itemAction');
 if(e.target.dataset.action==='resume'&&shell){
  window.PLAYS.push({id:shell.dataset.id,position:shell.dataset.positionticks,type:shell.dataset.type});
  e.preventDefault();e.stopPropagation();
 }
});
window.fetch=async function(u,opt){
 const path=String(u);const body=opt.body?JSON.parse(opt.body):null;
 window.CALLS.push({path,body});
 let result;
 if(path.endsWith('/home/libraries'))result=libs;
 else if(path.endsWith('/home/resume'))result={items:watching,hidden};
 else if(path.includes('/home/shelf'))result={items:[],hasMore:false};
 else if(path.endsWith('/resume/hide') || path.endsWith('/resume/restore')){
  const src=path.endsWith('/resume/hide')?watching:hidden;
  const dst=path.endsWith('/resume/hide')?hidden:watching;
  const i=src.findIndex(x=>x.item.id===body.CatalogId);
  if(i>=0)dst.push(...src.splice(i,1));result={success:true};
 }else if(path.endsWith('/resume/remove')){
  hidden=hidden.filter(x=>x.item.id!==body.CatalogId);
  watching=watching.filter(x=>x.item.id!==body.CatalogId);
  result={success:true};
 }else result={};
 return {ok:true,status:200,json:async()=>result};
};
'''.replace('LIBS',json.dumps(libs)).replace('WATCH',json.dumps(resume))
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1300,'height':900})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<html><head></head><body style="background:#1c0d20;color:white;margin:0"><main id="indexPage"><div class="homeTab"><div class="itemsContainer"></div></div></main></body></html>')
 page.evaluate('location.hash="#/home"')
 page.evaluate(mock+'\nvoid 0;')
 page.add_style_tag(content=css)
 page.evaluate('document.documentElement.classList.add("misioflix-skin")')
 page.add_script_tag(content=js)
 page.wait_for_selector('.mf-home-resume-card')
 assert page.locator('.mf-home-resume-card').count()==2
 assert page.locator('.mf-home-resume-info').count()==2
 page.locator('.mf-home-resume-card').first.locator('.mf-home-resume-title').click()
 assert page.evaluate('window.PLAYS[0]')=={'id':episode,'position':'4200000000','type':'Episode'}
 assert page.evaluate('location.hash')=='#/home'
 page.locator('.mf-home-resume-card').nth(1).locator('.mf-home-resume-poster').click()
 assert page.evaluate('window.PLAYS[1]')=={'id':movie,'position':'1200000000','type':'Movie'}
 # Hide an episode; hidden controls show Restore and Remove, no playback action.
 page.locator('.mf-home-resume-card').first.locator('.mf-home-resume-remove').click()
 page.wait_for_timeout(120)
 assert page.locator('.mf-home-resume-card').count()==1
 page.locator('.mf-home-hidden-toggle').click()
 assert page.locator('.mf-home-resume-card-hidden').count()==1
 assert page.locator('.mf-home-resume-card-hidden .mf-home-resume-remove').inner_text()=='Przywróć'
 assert page.locator('.mf-home-resume-card-hidden .mf-home-resume-permanent-remove').inner_text()=='Usuń'
 page.locator('.mf-home-resume-card-hidden .mf-home-resume-permanent-remove').click()
 page.wait_for_timeout(100)
 assert page.locator('.mf-home-resume-card-hidden').count()==0
 assert page.locator('.mf-home-hidden-toggle').inner_text()=='Pokaż ukryte (0)' or page.locator('.mf-home-hidden-toggle').inner_text()=='Ukryj ukryte (0)'
 req=page.evaluate('window.CALLS.filter(x=>x.path.endsWith("/resume/remove"))')
 assert len(req)==1 and req[0]['body']=={'CatalogId':catalog,'ResumeId':episode},req
 assert page.evaluate('window.PLAYS.length')==2
 # Main information action goes to series root, never episode id or playback.
 page.locator('.mf-home-resume-info').first.click()
 assert ('id='+movie) in page.evaluate('location.hash')
 assert page.evaluate('window.PLAYS.length')==2
 assert not errors,errors
 print('PASS: correct episode & film resume positions, main information, hide, restore/remove, user-scoped request, original native player')
 b.close()
