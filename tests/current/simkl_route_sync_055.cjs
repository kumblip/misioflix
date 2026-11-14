'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let source=fs.readFileSync(path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/simkl.js'),'utf8');
source=source.replace('  function tick(){',`  window.__testSync055={setUser:(id)=>{currentUser=id;connection={connected:true};},check:maybeScheduledSync};
  function tick(){`);
const user='a'.repeat(32),series='b'.repeat(32);
const doc={readyState:'loading',addEventListener(){},querySelectorAll:()=>[]};
const win={location:{hash:'#/home'},ApiClient:{getCurrentUserId:()=>user,accessToken:()=>'token'},setTimeout:()=>1,clearTimeout(){},addEventListener(){}};
const requests=[];
async function fetch(url){requests.push(String(url));return {ok:true,async json(){return {checkedOk:true,refreshed:true};}};}
vm.runInNewContext(source,{window:win,document:doc,location:win.location,fetch,URLSearchParams,AbortController,console},{timeout:1000});
(async()=>{
 const t=win.__testSync055;t.setUser(user);const flush=()=>new Promise(r=>setImmediate(r));
 t.check();await flush();assert.equal(requests.length,1,'First visit checks freshness');
 t.check();await flush();assert.equal(requests.length,1,'Repeated DOM updates do not poll again');
 win.location.hash='#/details?id='+series;t.check();await flush();
 assert.equal(requests.length,2,'Detail visit checks 72-hour timestamp');
 win.location.hash='#/mixed?collectionType=boxsets';t.check();await flush();
 assert.equal(requests.length,3,'Collection visit checks 72-hour timestamp');
 assert.ok(requests.every(x=>x==='/MisioFlix/api/simkl/sync-check'));
 console.log('PASS v0.4.55: home/details/collections check local sync once per route without blocking navigation');
})().catch(e=>{console.error(e);process.exitCode=1;});
