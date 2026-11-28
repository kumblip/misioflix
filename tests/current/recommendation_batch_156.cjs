'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const slice=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)+a.length));
const clear=slice('  function clearRecommendationCardCache(){','  let processedGenreLink =');
const code=slice('  let recommendationCardQueue = [];','  // v0.4.110:');
const tick=()=>new Promise(r=>setImmediate(r));
const id=n=>n.toString(16).padStart(32,'0');
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>id(a+i));
function harness(){
  const calls=[];let active=0,peak=0;
  const ctx={validId:x=>/^[0-9a-f]{32}$/.test(x),compactId:x=>String(x??'').replace(/-/g,'').toLowerCase(),request:url=>{
    const ids=decodeURIComponent(url.split('ids=')[1]).split(',');active++;peak=Math.max(peak,active);
    return new Promise((resolve,reject)=>calls.push({ids,ok:(extra=[])=>{active--;resolve([...ids.filter(x=>x!==id(999)).map(id=>({id})),...extra]);},fail:()=>{active--;reject(Error('network'));}}));
  }};
  vm.createContext(ctx);
  vm.runInContext(`const recommendationCardCache=new Map(),recommendationCardInFlight=new Map();const RECOMMENDATION_CARD_TTL_MS=45000,RECOMMENDATION_CARD_CACHE_LIMIT=500;let recommendationCardGeneration=0;${clear}\n${code}\nglobalThis.api={recommendationCards,clearRecommendationCardCache};`,ctx);
  return {api:ctx.api,calls,peak:()=>peak};
}
const ids=items=>Array.from(items,x=>x.id);
(async()=>{
  let h=harness();
  // Six overlapping rails, 60 logical requests but only 35 unique items.
  const rails=Array.from({length:6},(_,i)=>range(1+i*5,10+i*5));
  const ps=rails.map(r=>h.api.recommendationCards(r));await tick();
  assert.equal(h.calls.length,2);assert.deepEqual(h.calls.map(x=>x.ids.length),[25,10]);
  assert.equal(new Set(h.calls.flatMap(x=>x.ids)).size,35);
  const shared=h.api.recommendationCards(range(20,30));await tick();assert.equal(h.calls.length,2);
  h.calls[1].ok([{id:id(1000)}]);h.calls[0].ok();
  const result=await Promise.all(ps);result.forEach((r,i)=>assert.deepEqual(ids(r),rails[i]));
  assert.deepEqual(ids(await shared),range(20,30));assert.equal(h.peak(),2);
  assert.deepEqual(ids(await h.api.recommendationCards(range(1,10))),range(1,10));assert.equal(h.calls.length,2);
  const foreign=h.api.recommendationCards([id(1000),id(999)]);await tick();h.calls[2].ok();assert.deepEqual(ids(await foreign),[id(1000)]);
  // More than two full batches wait, and old generation queued work is discarded.
  h=harness();const old=[range(1,25),range(26,50),range(51,75)].map(r=>h.api.recommendationCards(r));
  const oldSettled=Promise.allSettled(old);await tick();assert.equal(h.calls.length,2);
  h.api.clearRecommendationCardCache();const fresh=h.api.recommendationCards([id(1)]);await tick();assert.equal(h.calls.length,2);
  h.calls[0].ok();await tick();assert.equal(h.calls.length,3);assert.deepEqual(h.calls[2].ids,[id(1)]);
  h.calls[1].ok();h.calls[2].ok();assert.deepEqual(ids(await fresh),[id(1)]);
  assert((await oldSettled).every(x=>x.status==='rejected'));assert.equal(h.peak(),2);
  // All waiters reject on failure; no poisoned in-flight record survives retry.
  h=harness();const err=Promise.allSettled([h.api.recommendationCards([id(1)]),h.api.recommendationCards([id(1),id(2)])]);await tick();h.calls[0].fail();assert((await err).every(x=>x.status==='rejected'));
  const retry=h.api.recommendationCards([id(1),id(2)]);await tick();assert.equal(h.calls.length,2);h.calls[1].ok();assert.deepEqual(ids(await retry),range(1,2));
  console.log('PASS 0.4.156: 6 rails → 2 requests, per-ID coalescing, max 2 active, auth generation, no foreign IDs, retry');
})().catch(e=>{console.error(e);process.exitCode=1;});
