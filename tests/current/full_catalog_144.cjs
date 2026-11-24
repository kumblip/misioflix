'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(require.resolve('../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const id=n=>n.toString(16).padStart(32,'0');
const validId=x=>/^[0-9a-f]{32}$/i.test(String(x||'').replace(/-/g,''));
const compactId=x=>String(x||'').replace(/-/g,'').toLowerCase();
function extract(start,end){const a=src.indexOf(start),b=src.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return src.slice(a,b);}
test('real Home initialization retains candidates beyond 16000 and inherits anime season genres',async()=>{
  const lib=id(80000), parent=id(20001), nativeParent=id(20002), unseenParent=id(20003);
  const items=Array.from({length:17000},(_,i)=>({id:id(i+1),type:'Movie',anime:false,genres:['Akcja']}));
  items.push({id:parent,type:'Series',anime:false,library_ids:[lib],genres:['Akcja']},
    {id:id(30001),type:'Season',anime:false,library_ids:[lib],parent_series_id:parent,genres:['Fantasy']},
    {id:nativeParent,type:'Series',anime:false,genres:['Komedia']},
    {id:id(30002),type:'Season',anime:false,parent_series_id:nativeParent,genres:['Fantasy']},
    {id:id(30003),type:'Season',anime:true,parent_series_id:unseenParent,genres:['Horror']},
    {id:id(30004),type:'Folder',anime:true,genres:['Horror']});
  const area={isConnected:true,replaceChildren(){}};let paints=0;
  const ctx={homeRoot:{querySelector:()=>area},recommendationInitialized:false,
    recommendationPresets:[],recommendationCandidates:[],recommendationSeasonGenres:new Map(),
    recommendationAnimeIds:new Set(),recommendationGenresById:new Map(),
    librariesCache:[{id:lib,category:'anime'}],librariesReadyPromise:Promise.resolve(),
    validId,compactId,normalized:x=>String(x).toLowerCase(),own:()=>({}),isCurrent:()=>true,
    request:async()=>({proposals:[{genres:['Fantasy']}]}),getCatalogForSearch:async()=>({items}),
    paintRecommendationSets:()=>paints++};
  vm.createContext(ctx);
  vm.runInContext(extract('  function recommendationIsAnime(item){','  // Filter the existing authorized catalog'),ctx);
  vm.runInContext(extract('  async function initializeRecommendations(serial){','  async function loadLibraries(serial){'),ctx);
  await ctx.initializeRecommendations(1);
  assert.equal(paints,1);assert.equal(ctx.recommendationCandidates.length,17002);
  assert.ok(ctx.recommendationCandidates.some(x=>x.id===id(17000)));
  assert.ok(ctx.recommendationGenresById.get(parent).has('fantasy'));
  assert.ok(!ctx.recommendationGenresById.get(nativeParent).has('fantasy'));
  assert.ok(!ctx.recommendationGenresById.has(unseenParent));
  assert.ok(ctx.recommendationCandidates.every(x=>x.type==='Movie'||x.type==='Series'));
});
