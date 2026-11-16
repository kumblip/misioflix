'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../src/Jellyfin.Plugin.MisioFlix/Web/player-back.js'),'utf8');
const EP='b'.repeat(32), SEASON='d'.repeat(32), SERVER='c'.repeat(32), USER='e'.repeat(32);
const flush = () => new Promise(resolve=>setImmediate(resolve));
function setup({hasVideo=true, episode=EP, season=SEASON, status=200, delayed=false}={}){
  const callbacks={}, requests=[], timers=[];let fallbackClicks=0, prevented=0, stops=0;
  let hash='#/video';let changes=0, reloads=0;
  const location={get hash(){return hash;},set hash(value){hash=value;changes++;},reload(){reloads++;}};
  const client={deviceId:()=> 'device-1',accessToken:()=> 'secret',serverId:()=>SERVER,
    getCurrentUserId:()=>USER,getUrl:p=>`http://fake.local/${p}`,
    getJSON:async()=>({Id:EP,Type:'Episode',SeasonId:season})};
  const window={location,ApiClient:client,scrollTo(){this.scrolled=true;},
    setTimeout(fn,ms){timers.push({fn,ms});}};
  const back={isConnected:true,disabled:false,getAttribute:k=>k==='aria-label'?'Wstecz':null,
    querySelector:q=>q==='svg[data-testid="ArrowBackIcon"]'?{}:null,
    click(){fallbackClicks++;callbacks.click({target:icon,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}});}};
  const icon={closest:q=>q==='button[aria-label],button[title]'?back:null};
  const video={readyState:4,ended:false,getClientRects:()=>[{}],closest:()=>null};
  const document={addEventListener(name,fn,capture){assert.equal(name,'click');assert.equal(capture,true);callbacks[name]=fn;},
    querySelectorAll:q=>q==='video'&&hasVideo?[video]:[]};
  let finishFetch;
  const fetch=async(url,opts)=>{
    requests.push({url,opts});
    if(delayed)await new Promise(resolve=>{finishFetch=resolve;});
    return {ok:status===200,status,json:async()=>({itemId:episode,type:'Episode'})};
  };
  vm.runInNewContext(source,{window,document,fetch,console},{filename:'player-back.js'});
  const click=()=>callbacks.click({target:icon,preventDefault(){prevented++;},stopPropagation(){stops++;},stopImmediatePropagation(){}});
  return {location,requests,window,timers,click,release:()=>finishFetch?.(),
    get fallbackClicks(){return fallbackClicks;},get prevented(){return prevented;},get stops(){return stops;},
    get changes(){return changes;},get reloads(){return reloads;}};
}
(async()=>{
  const ok=setup();ok.click();await flush();await flush();
  assert.equal(ok.prevented,1);assert.equal(ok.stops,1);
  assert.equal(ok.requests.length,1);
  assert.match(ok.requests[0].url,/current-episode\?deviceId=device-1$/);
  assert.equal(ok.location.hash,'#/details?id='+SEASON+'&serverId='+SERVER);
  assert.equal(ok.changes,1,'exactly one route change to season');
  assert.equal(ok.reloads,0,'never force a full reload');
  assert.equal(ok.timers.length,0,'no delayed route repair');
  assert.equal(ok.fallbackClicks,0);
  assert.equal(ok.window.scrolled,true);
  const missing=setup({status:204});missing.click();await flush();await flush();
  assert.equal(missing.fallbackClicks,1,'native fallback if no current episode is known');
  assert.equal(missing.changes,0);
  const noVideo=setup({hasVideo:false});noVideo.click();await flush();
  assert.equal(noVideo.prevented,0);assert.equal(noVideo.requests.length,0);
  const repeated=setup({delayed:true});repeated.click();repeated.click();await flush();
  assert.equal(repeated.requests.length,1,'prevent parallel navigation attempts');
  repeated.release();await flush();await flush();
  assert.equal(repeated.changes,1);
  assert.match(source,/svg\[data-testid="ArrowBackIcon"\]/);
  console.log('PASS v0.4.88: direct season navigation, no history or reload, native fallback, no duplicates');
})().catch(e=>{console.error(e);process.exitCode=1;});
