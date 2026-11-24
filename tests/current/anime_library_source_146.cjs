'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require.resolve('../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
function slice(a,b){const i=source.indexOf(a),j=source.indexOf(b,i+a.length);assert.ok(i>=0&&j>i);return source.slice(i,j);}
const id=n=>n.toString(16).padStart(32,'0');
// Reproduce the real failure: every incoming row is marked "both", even PL/ENG.
// In a named library the flags must not override the library's explicit role.
const specs=[
 ['Anime PL','anime_pl',false,'lektor'],
 ['Anime ENG','anime_eng',true,'original'],
 ['Dowolna nazwa','anime_both',true,'both'],
 ['Zmieniona nazwa PL','anime_pl',null,'lektor'],
 ['Zmieniona nazwa ENG','anime_eng',null,'original'],
 ['AnimePL','',false,'lektor'],
 ['Anime ENG','',true,'original'],
 ['Anime PL + ENG','',null,'both'],
 ['Anime — nieznana A','',true,'lektor'],
 ['Anime — nieznana B','',false,'original'],
 ['Anime — nieznana C','',null,'unknown'],
 ['Anime — nieznana D','',undefined,'unknown'],
];
const libs=specs.map(([name,animeRole],i)=>({id:id(i+1),name,animeRole,category:'anime'}));
const catalogs=new Map(libs.map((lib,i)=>[lib.id,{items:['Series','Movie','Season'].map((type,j)=>({id:id(100+i*3+j),type,anime:true,anime_source:'both',pl_audio:specs[i][2],pl_subtitles:true,en_subtitles:true,library_ids:[libs[0].id,libs[1].id]}))}]));
let calls=0;
const ctx={compactId:x=>String(x||'').replace(/-/g,'').toLowerCase(),getCatalogForSearch:async lib=>{calls++;return catalogs.get(lib)},catalogFetchedAt:new Map(),catalogFullKey:x=>x,SEARCH_CATALOG_FRESH_MS:60000,watchModeMatches:()=>true,termsForFilter:()=>new Set(),normalized:x=>String(x||'').toLowerCase(),titleMatches:()=>true};
vm.createContext(ctx);
for(const [a,b] of [['  function filterChoice(map, key){','  function makeFilterGroup('],['  async function loadScopedCatalog(state){','  function closeSearch(){'],['  function searchByType(item,state){','  // Source priority for each Jellyfin user:'],['  function fitsSearch(item,state,withText=true){','  function closeWhenNavigate(state){']])vm.runInContext(slice(a,b),ctx);
(async()=>{
 const state={kind:'anime',scopedLibraries:libs,includeSeasons:{checked:false},lektor:{value:'lektor'},libraryStates:new Map(),typeStates:new Map(),genreStates:new Map(),input:{value:''}};
 const {items}=await ctx.loadScopedCatalog(state);
 assert.equal(items.length,specs.length*3);
 for(let i=0;i<specs.length;i++)for(let j=0;j<3;j++)assert.equal(items[i*3+j].search_anime_source,specs[i][3]);
 for(const seasons of [false,true]){
  state.includeSeasons.checked=seasons;
  for(const mode of ['lektor','original','all']){
   state.lektor.value=mode;
   const actual=Array.from(items.filter(x=>ctx.fitsSearch(x,state)),x=>x.id);
   const expected=specs.flatMap((spec,i)=>mode==='all'||spec[3]==='both'||spec[3]===mode?(seasons?[id(102+i*3)]:[id(100+i*3),id(101+i*3)]):[]);
   assert.deepEqual(actual,expected,`${mode}, seasons=${seasons}`);
  }
 }
 assert.equal(calls,libs.length,'switching filters uses loaded data, no additional calls');
 state.includeSeasons.checked=false;state.lektor.value='original';state.libraryStates.set(libs[0].id,1);
 assert.equal(items.filter(x=>ctx.fitsSearch(x,state)).length,0,'PL-only library selection intersects ENG filter');
 state.libraryStates.clear();state.libraryStates.set(libs[2].id,1);
 assert.equal(items.filter(x=>ctx.fitsSearch(x,state)).length,2,'both role visible in ENG');
 state.lektor.value='lektor';assert.equal(items.filter(x=>ctx.fitsSearch(x,state)).length,2,'both role visible in PL');
 assert.equal(catalogs.get(libs[0].id).items[0].search_anime_source,undefined,'raw shared catalog unmodified');
 state.kind='media';const media=await ctx.loadScopedCatalog(state);assert.equal(media.items[0].search_anime_source,undefined,'other searches untouched');
 console.log('PASS 146: ambiguous both payload, explicit roles, legacy names, shared flag fallback, unknown audio, seasons, library intersection, no extra calls');
})().catch(error=>{console.error(error);process.exitCode=1;});
