'use strict';
// v0.4.87: real Jellyfin Web 12.4 toolbar button and deterministic current-episode return.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../src/Jellyfin.Plugin.MisioFlix/Web/player-back.js'), 'utf8');
const E1='a'.repeat(32), E2='b'.repeat(32), SERVER='c'.repeat(32);
const flush = () => new Promise(resolve=>setImmediate(resolve));
function setup({status=200,hasVideo=true,item=E2}={}) {
  const callbacks={}, timers=[];
  const requests=[];
  const win={
    location:{hash:'#/video',reload(){this.reloads=(this.reloads||0)+1;}},
    ApiClient:{deviceId:()=> 'device-1',accessToken:()=> 'secret',serverId:()=>SERVER},
    setTimeout(fn,ms){timers.push({fn,ms});}, scrollTo(){this.scrolled=true;}
  };
  let fallbackClicks=0, prevented=0, stopped=0;
  const back={
    isConnected:true,disabled:false,
    getAttribute:k=>k==='aria-label'?'Wstecz':null,
    querySelector:q=>q==='svg[data-testid="ArrowBackIcon"]'?{}:null,
    click(){fallbackClicks++;callbacks.click({target:icon,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}});}
  };
  const icon={closest:q=>q==='button[aria-label],button[title]'?back:null};
  const video={readyState:4,ended:false,getClientRects:()=>[{}],closest:()=>null};
  const doc={
    addEventListener(name,handler,capture){assert.equal(name,'click');assert.equal(capture,true);callbacks[name]=handler;},
    querySelectorAll:q=>q==='video'&&hasVideo?[video]:[]
  };
  const context={window:win,document:doc,fetch:async(url,opts)=>{
    requests.push({url,opts});return {ok:true,status,json:async()=>({itemId:item,type:'Episode'})};
  },URLSearchParams,console};
  vm.runInNewContext(source,context,{filename:'player-back.js'});
  function click(){ callbacks.click({target:icon,preventDefault(){prevented++;},stopPropagation(){stopped++;},stopImmediatePropagation(){}}); }
  return {win,timers,requests,click,back,get fallbackClicks(){return fallbackClicks;},get prevented(){return prevented;},get stopped(){return stopped;}};
}
(async()=>{
  const ok=setup();ok.click();await flush();await flush();
  assert.equal(ok.prevented,1);assert.equal(ok.stopped,1);
  assert.equal(ok.requests.length,1);
  assert.match(ok.requests[0].url,/current-episode\?deviceId=device-1$/);
  assert.equal(ok.requests[0].opts.headers.Authorization.includes('Token="secret"'),true);
  assert.equal(ok.win.location.hash, '#/details?id='+E2+'&serverId='+SERVER);
  assert.equal(ok.fallbackClicks,0);assert.equal(ok.win.scrolled,true);
  assert.equal(ok.timers.length,1);assert.equal(ok.timers[0].ms>=700,true);
  // Jellyfin onPlaybackStopped may itself navigate back in the meantime.
  ok.win.location.hash='#/home';ok.timers[0].fn();
  assert.equal(ok.win.location.hash, '#/details?id='+E2+'&serverId='+SERVER);
  assert.equal(ok.win.location.reloads,1);
  // No active episode -> replay native React button, no wrong details route.
  const missing=setup({status:204});missing.click();await flush();await flush();
  assert.equal(missing.fallbackClicks,1);
  assert.equal(missing.win.location.hash,'#/video');
  assert.equal(missing.timers.length,0);
  const noVideo=setup({hasVideo:false});noVideo.click();await flush();
  assert.equal(noVideo.prevented,0);assert.equal(noVideo.requests.length,0);
  const repeated=setup();repeated.click();repeated.click();await flush();await flush();
  assert.equal(repeated.requests.length,1,'avoid simultaneous duplicate navigation');
  assert.match(source,/svg\[data-testid="ArrowBackIcon"\]/);
  console.log('PASS v0.4.87 player toolbar: current episode, normal Jellyfin stop, reload, no stale history, fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});
