// v0.4.76: status selection must prefer MAL, then user's archive, then Jellyfin.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8');
const begin=source.indexOf('  function watchClassification(item,state){');
const end=source.indexOf('  function fitsSearch(item,state,withText=true){',begin);
assert(begin>=0&&end>begin);
let activeSearch;
const requests=[];
const ctx={
 own:(t,c,txt)=>({tagName:t,className:c,textContent:txt||'',attributes:{},setAttribute(k,v){this.attributes[k]=v},addEventListener(){},replaceChildren(){}}),
 activeSearch:undefined,
 request:async path=>{requests.push(path); if(path.includes('/mal/status'))return {connected:false};if(path.includes('/archive/watch-status'))return {available:true,entries:{42:'completed',99:'plan_to_watch'},exportedAtUtc:'2026-11-16T00:00:00Z'};throw Error('Unexpected '+path)},
 paintSearchResults:()=>{},
};
vm.createContext(ctx);
vm.runInContext(source.slice(begin,end),ctx);
const state={kind:'anime',watchSnapshot:null,watchMode:1,watchLoading:false,watchRequestId:0,overlay:{isConnected:true},watchChoices:null};
ctx.activeSearch=state;
const online={id:'a',mal_id:42,watchStatus:'unwatched'};
const planned={id:'b',mal_id:99,watchStatus:'watched'};
const missing={id:'c',mal_id:300,watchStatus:'watched'};
assert.equal(ctx.watchClassification(online,{kind:'anime',watchSnapshot:{connected:true,source:'mal',entries:{42:{status:'completed'}}}}),'watched');
assert.equal(ctx.watchClassification(online,{kind:'anime',watchSnapshot:{connected:true,source:'archive',entries:{42:'completed'}}}),'watched');
assert.equal(ctx.watchClassification(planned,{kind:'anime',watchSnapshot:{connected:true,source:'archive',entries:{99:'plan_to_watch'}}}),'unwatched');
assert.equal(ctx.watchClassification(missing,{kind:'anime',watchSnapshot:{connected:true,source:'archive',entries:{}}}),'unwatched');
assert.equal(ctx.watchClassification({watchStatus:'watched'},{kind:'anime',watchSnapshot:{connected:false}}),'watched');
assert.equal(ctx.watchClassification({watchStatus:'watched'},{kind:'anime',watchSnapshot:{connected:true,entries:{}}}),'unknown');
(async()=>{
 await ctx.loadWatchStatusSnapshot(state);
 assert.equal(state.watchSnapshot.source,'archive');
 assert.equal(state.watchSnapshot.entries[42],'completed');
 assert.equal(ctx.watchClassification(online,state),'watched');
 assert.deepEqual(requests,['/mal/status?refresh=false','/mal/archive/watch-status']);
 // User-specific status content is never persisted in the browser.
 assert(!source.slice(begin,end).includes('localStorage.setItem('), 'MAL watch status is never persisted; Smart Downloads preferences are separate');
 assert(source.includes('.slice(0,18);'),'Search suggestions expanded 8 to 18');
 assert(css.includes('max-height:min(55dvh,540px)'),'Scrollable expanded suggestions');
 assert(css.includes('overflow-wrap:anywhere!important'),'Long detail titles wrap without clipping');
 console.log('PASS v0.4.76: archive fallback, MAL statuses, 18 suggestions, full detail titles');
})().catch(e=>{console.error(e);process.exitCode=1});
