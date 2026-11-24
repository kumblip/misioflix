'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require.resolve('../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
function slice(a,b){const i=source.indexOf(a),j=source.indexOf(b,i+a.length);assert.ok(i>=0&&j>i);return source.slice(i,j);}
// Fixtures model the scoped server contract. Execute the real client catalog
// loader and filter, including the independent type and library selections.
const id=n=>n.toString(16).padStart(32,'0');
const pl=id(1),en=id(2),both=id(3);
const libs=[{id:pl,name:'PL renamed',animeRole:'anime_pl'},{id:en,name:'ENG renamed',animeRole:'anime_eng'},{id:both,name:'Both',animeRole:'anime_both'}];
const catalogs=new Map(libs.map((lib,i)=>[lib.id,{items:['Series','Season','Movie'].map((type,j)=>({
 id:id(10+i*3+j),anime:true,anime_source:['lektor','original','both'][i],type,
 // An ambiguous physical membership must not override the scoped source.
 library_ids:[pl,en],genres:['Akcja']
}))}]));
const ctx={compactId:x=>String(x||'').replace(/-/g,'').toLowerCase(),
 getCatalogForSearch:async(id,force)=>catalogs.get(id),catalogFetchedAt:new Map(),catalogFullKey:x=>x,
 SEARCH_CATALOG_FRESH_MS:60000,watchModeMatches:()=>true,termsForFilter:()=>new Set(['akcja']),
 normalized:x=>String(x||'').toLowerCase(),titleMatches:()=>true};
vm.createContext(ctx);
for(const [a,b] of [['  function filterChoice(map, key){','  function makeFilterGroup('],
 ['  async function loadScopedCatalog(state){','  function closeSearch(){'],
 ['  function searchByType(item,state){','  // Source priority for each Jellyfin user:'],
 ['  function fitsSearch(item,state,withText=true){','  function closeWhenNavigate(state){']])vm.runInContext(slice(a,b),ctx);
(async()=>{
 const state={kind:'anime',scopedLibraries:libs,includeSeasons:{checked:true},lektor:{value:'lektor'},
  libraryStates:new Map(),typeStates:new Map(),genreStates:new Map(),input:{value:''}};
 const {items}=await ctx.loadScopedCatalog(state);
 const matches=()=>Array.from(items.filter(x=>ctx.fitsSearch(x,state)),x=>x.id);
 assert.deepEqual(matches(),[id(11),id(17)]);
 state.lektor.value='original';assert.deepEqual(matches(),[id(14),id(17)]);
 state.lektor.value='all';assert.deepEqual(matches(),[id(11),id(14),id(17)]);
 state.libraryStates.set(en,1);assert.deepEqual(matches(),[id(14)]);
 state.lektor.value='lektor';assert.deepEqual(matches(),[]);
 state.libraryStates.clear();state.includeSeasons.checked=false;
 assert.deepEqual(matches(),[id(10),id(12),id(16),id(18)]);
 state.lektor.value='original';assert.deepEqual(matches(),[id(13),id(15),id(16),id(18)]);
 state.lektor.value='all';assert.equal(matches().length,6);
 const refreshed=await ctx.refreshScopedCatalog(state);assert.equal(refreshed.items.length,9);
 console.log('PASS 145: scoped PL/ENG/both, season-only and ordinary results, independent library filters, refresh');
})().catch(error=>{console.error(error);process.exitCode=1;});
