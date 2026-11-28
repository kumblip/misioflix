'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
function between(start,end){const a=src.indexOf(start);assert.ok(a>=0,start);const b=src.indexOf(end,a+start.length);assert.ok(b>=0,end);return src.slice(a,b);}
const clear=between('  function clearRecommendationCardCache(){','  let processedGenreLink =');
const code=between('  let recommendationCardQueue = [];' ,'  // v0.4.110:');
let now=1, calls=[];
const token=(n)=>n.toString(16).padStart(32,'0');
const A=token(1),B=token(2),C=token(3),DENIED=token(99);
const ctx={
  Date:{now:()=>now},
  request:async path=>{
    const ids=decodeURIComponent(path.split('ids=')[1]).split(',');
    calls.push(ids);
    return ids.filter(id=>id!==DENIED).map(id=>({id,title:'Title '+id}));
  },
  validId:id=>/^[0-9a-f]{32}$/.test(id),
  compactId:id=>String(id).toLowerCase().replace(/-/g,''),
};
vm.createContext(ctx);
vm.runInContext(`
 const recommendationCardCache=new Map();
 const recommendationCardInFlight=new Map();
 const RECOMMENDATION_CARD_TTL_MS=45000;
 const RECOMMENDATION_CARD_CACHE_LIMIT=500;
 let recommendationCardGeneration=0;
 ${clear}
 ${code}
 globalThis.api={recommendationCards,clearRecommendationCardCache};
`,ctx);
(async()=>{
  let list=await ctx.api.recommendationCards([A,B]);
  assert.deepEqual(Array.from(list,x=>x.id),[A,B]);
  assert.equal(calls.length,1);
  list=await ctx.api.recommendationCards([B,A]);
  assert.deepEqual(Array.from(list,x=>x.id),[B,A]);
  assert.equal(calls.length,1,'filter changes reuse authorized tiles');
  list=await ctx.api.recommendationCards([A,C]);
  assert.deepEqual(Array.from(calls[1]),[C],'fetch only missing ID');
  assert.equal(list.length,2);
  assert.equal((await ctx.api.recommendationCards([DENIED])).length,0);
  assert.equal((await ctx.api.recommendationCards([DENIED])).length,0);
  assert.equal(calls.length,4,'denied IDs never enter the cache');
  now+=45001;
  await ctx.api.recommendationCards([A]);
  assert.equal(calls.length,5,'stale tiles are fetched again');
  ctx.api.clearRecommendationCardCache();
  await ctx.api.recommendationCards([A]);
  assert.equal(calls.length,6,'user/home reset invalidates the memory cache');
  console.log('PASS 0.4.140 recommendation cache: scoped, bounded, TTL, denied IDs');
})().catch(e=>{console.error(e);process.exitCode=1;});
