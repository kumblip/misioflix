'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/configPage.html'),'utf8');
const match=src.match(/  const permanentCollectionPosters=\(\(\)=>\{[\s\S]*?\n  \}\)\(\);/);
assert(match,'permanent poster module must be embedded in admin page');
new vm.Script(match[0]);
const ID='a'.repeat(32), POSTER='b'.repeat(32), MEMBER='c'.repeat(32), UID='d'.repeat(32);
async function scenario(confirmValue){
  const pictures=new Map([[ID,[]],[POSTER,[{ImageType:'Primary'}]]]);
  let uploaded=0,drawCalls=0,closeCalls=0,click;
  const button={disabled:false,addEventListener(type,fn){assert.equal(type,'click');click=fn}};
  const status={textContent:''};
  const panel={querySelector(selector){return selector==='#mf-native-cover-generate'?button:selector==='#mf-native-cover-status'?status:null}};
  const view={querySelector(selector){return selector==='#mf-native-cover-panel'?panel:null}};
  const ctx={fillRect(){},set fillStyle(x){},drawImage(){drawCalls++}};
  const document={createElement(name){assert.equal(name,'canvas');return {width:0,height:0,getContext(){return ctx},toDataURL(fmt){assert.equal(fmt,'image/jpeg');return 'data:image/jpeg;base64,VEVTVA=='}}}};
  const ApiClient={getUrl:p=>'/'+p,accessToken:()=> 'test-token',getCurrentUserId:()=> UID};
  const calls=[];
  async function fetch(url,opts){
    const u=new URL(url,'http://localhost');calls.push([opts?.method||'GET',u.pathname]);
    const p=u.pathname;
    if(p===`/Users/${UID}/Items` && u.searchParams.has('IncludeItemTypes')){
      return {ok:true,json:async()=>({Items:[{Id:ID,Type:'BoxSet',Name:'Brak grafiki'},{Id:POSTER,Type:'BoxSet',Name:'Ręczny plakat'}],TotalRecordCount:2})};
    }
    if(p===`/Items/${ID}/Images` || p===`/Items/${POSTER}/Images`){
      const id=p.split('/')[2];return {ok:true,json:async()=>pictures.get(id)};
    }
    if(p===`/Users/${UID}/Items/${ID}`)return {ok:true,json:async()=>({Id:ID,Type:'BoxSet'})};
    if(p===`/Users/${UID}/Items` && u.searchParams.get('ParentId')===ID){
      return {ok:true,json:async()=>({Items:[{Id:MEMBER,Type:'Movie',ImageTags:{Primary:'tag'}}]})};
    }
    if(p===`/Items/${MEMBER}/Images/Primary`){
      return {ok:true,blob:async()=>({type:'image/jpeg'})};
    }
    if(p===`/Items/${ID}/Images/Primary` && opts?.method==='POST'){
      assert.equal(opts.headers['Content-Type'],'image/jpeg');
      assert.equal(opts.body,'VEVTVA==');
      assert.match(opts.headers.Authorization,/test-token/);
      uploaded++;pictures.set(ID,[{ImageType:'Primary'}]);return {ok:true,status:204};
    }
    throw Error('unexpected request '+url);
  }
  const sandbox={view,document,ApiClient,fetch,URL,URLSearchParams,Image:function(){},createImageBitmap:async()=>({width:400,height:600,close(){closeCalls++}}),window:{confirm:()=>confirmValue}};
  vm.runInNewContext(match[0],sandbox);
  assert.equal(uploaded,0,'no network/write at initialization');
  click();
  for(let i=0;i<100 && button.disabled;i++)await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(button.disabled,false,`not finished: ${status.textContent}`);
  assert.equal(uploaded,confirmValue?1:0,'manual poster should upload only after confirmation');
  assert.equal(calls.some(([method,p])=>method==='POST' && p===`/Items/${POSTER}/Images/Primary`),false,
    'existing manual poster must remain untouched');
  if(confirmValue){
    assert.equal(drawCalls,1);assert.equal(closeCalls,1);
    assert.match(status.textContent,/Zapisane nowe okładki: 1/);
  }else assert.match(status.textContent,/Anulowano/);
}
(async()=>{await scenario(true);await scenario(false);console.log('PASS v0.4.99: admin-only confirmed native Primary upload; manual artwork never overwritten');})().catch(e=>{console.error(e);process.exitCode=1});
