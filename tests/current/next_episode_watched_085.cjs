'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/next-episode-watch.js'),'utf8');
function test({playing=true,paused=false,disabled=false,mode='next',key=false}={}){
  const listeners={};const requests=[];
  const video={ended:false,paused,readyState:playing?4:0,getClientRects:()=>[{}]};
  const button={disabled,getAttribute:(n)=>n==='title'?(mode==='next'?'Następny':'Stop'):null,
    matches:(q)=>mode==='next'&&q.includes('.btnNextTrack'),
    closest:()=>null,querySelector:()=>null};
  const target={closest:()=>button};
  const document={querySelectorAll:(q)=>q==='video'?[video]:[],addEventListener:(event,cb)=>{listeners[event]=cb;}};
  const window={ApiClient:{accessToken:()=> 'test-local-token',deviceId:()=> 'test-device'}};
  const sandbox={window,document,fetch:(url,opts)=>{requests.push({url,opts});return Promise.resolve({ok:true});},
    console:{warn:()=>{}}};
  vm.runInNewContext(src,sandbox,{filename:'next-episode-watch.js'});
  if(key){listeners.keydown({key:'n',shiftKey:true,repeat:false,ctrlKey:false,altKey:false,metaKey:false,defaultPrevented:false,
    target:{closest:()=>false}});}
  else listeners.click({target});
  return requests;
}
assert.equal(test().length,1,'active player clicking NEXT arms watch marking');
assert.equal(test({playing:false}).length,0,'no playing video: no action');
assert.equal(test({disabled:true}).length,0,'disabled Next never marks watched');
assert.equal(test({mode:'other'}).length,0,'other control never marks watched');
assert.equal(test({paused:true}).length,1,'paused video NEXT is intentional');
assert.equal(test({key:true}).length,1,'keyboard Next shortcut is intentional');
const request=test()[0];
assert.equal(request.url,'/MisioFlix/api/playback/next-episode-intent');
assert.equal(JSON.parse(request.opts.body).deviceId,'test-device');
assert.equal(request.opts.method,'POST');
assert.match(request.opts.headers.Authorization,/Token="test-local-token"/);
console.log('next_episode_watched_085: 8 checks passed');
