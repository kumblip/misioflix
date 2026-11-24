'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
class El {
  constructor(tag='div',cls='',title=''){this.tag=tag;this.className=cls;this.textContent=title;this.dataset={};this.children=[];this.attrs={};this.listeners={};this.isConnected=true;}
  setAttribute(k,v){this.attrs[k]=String(v)}
  appendChild(x){this.children.push(x);return x}
  addEventListener(evt,fn){this.listeners[evt]=fn}
  replaceChildren(...kids){this.children=[...kids]}
}
const id=n=>n.toString(16).padStart(32,'0');
const items=[
 {id:id(1),anime:true,type:'Series',genres:['Akcja','Komedia']},
 {id:id(2),anime:false,type:'Movie',genres:['Akcja']},
 {id:id(3),anime:false,type:'Series',genres:['Komedia']},
 {id:id(4),anime:false,type:'Movie',genres:['Akcja','Komedia']},
 {id:id(5),anime:true,type:'Movie',genres:['Horror']}
];
const {treeMethods,mockRow}=require('./dom_fixture_147.js');treeMethods(El);
const area=new El();
const created=[];const hydrated=[];
const ctx={
  homeRoot:{querySelector:q=>q==='#mf-home-recommendations'?area:null},
  recommendationAudioMode:'all',recommendationHasRequestedAudio:()=>true,
  recommendationSubtitlesMode:'all',recommendationWatchMode:'all',recommendationHasRequestedWatchStatus:()=>true,recommendationHasRequestedSubtitles:()=>true,
  recommendationInitialized:true,recommendationIncludeAnime:true,
  recommendationPresets:[
    {genres:['Akcja','Komedia'],matchAll:true},
    {genres:['Akcja','Horror'],matchAll:false},
    {genres:['Akcja','Fantasy'],matchAll:true},
    {genres:[],matchAll:false}
  ],
  recommendationCandidates:items,
  recommendationSeasonGenres:new Map([[id(1),['Fantasy']]]),
  recommendationRows:new Map(),recommendationObserver:null,
  normalized:x=>String(x).toLocaleLowerCase('pl'),compactId:x=>x,
  own:(t,c='',v='')=>new El(t,c,v),
  append:(p,...children)=>{for(const kid of children)p.appendChild(kid)},
  recommendationShelf:(genre,matching,full)=>{
    const row=mockRow(El,genre,matching,full);created.push(row);return row;
  },
  loadRecommendationPage:async(row,reset)=>{row.needsLoad=false;hydrated.push([row.genre,reset])},
  recommendationCardCache:new Map(),RECOMMENDATION_CARD_TTL_MS:45000,SHELF_LIMIT:10,
  IntersectionObserver:undefined
};
ctx.recommendationAnimeIds=new Set();
ctx.recommendationGenresById=new Map(items.map(item=>[item.id,
  new Set([...item.genres,...(ctx.recommendationSeasonGenres.get(item.id)||[])].map(ctx.normalized))]));
ctx.recommendationPresets.forEach(p=>{
  p.normalizedGenres=p.genres.map(ctx.normalized);
  p.allLibraries=true;
  p.excludedLibraryIds=[];
});
vm.createContext(ctx);
const a=src.indexOf('  function paintRecommendationSets(){');
const b=src.indexOf('  async function initializeRecommendations(serial){',a);
assert(a>=0&&b>a);
vm.runInContext(src.slice(a,b),ctx);
ctx.paintRecommendationSets();
assert.equal(ctx.recommendationRows.size,3);
assert.equal(ctx.recommendationRows.size,3);
assert.deepEqual(Array.from(ctx.recommendationRows.values(),x=>x.matching.map(y=>y.id)),[[id(1),id(4)],[id(1),id(2),id(4),id(5)],[id(1)]]);
const t1=src.indexOf('  function recommendationAnimeToggle(){');
const t2=src.indexOf('  function randomizeRecommendations(',t1);
vm.runInContext(src.slice(t1,t2),ctx);
const switcher=ctx.recommendationAnimeToggle().children[0];
assert.equal(switcher.attrs['aria-checked'],'true');
switcher.listeners.click();
assert.equal(switcher.attrs['aria-checked'],'false');
assert.equal(ctx.recommendationRows.size,2);
assert.deepEqual(Array.from(ctx.recommendationRows.values(),x=>x.matching.map(y=>y.id)),[[id(4)],[id(2),id(4)]]);
switcher.listeners.click();
assert.equal(switcher.attrs['aria-checked'],'true');
assert.equal(ctx.recommendationRows.size,3);
assert.deepEqual(Array.from(ctx.recommendationRows.values(),x=>x.matching.map(y=>y.id)),[[id(1),id(4)],[id(1),id(2),id(4),id(5)],[id(1)]]);
assert.equal(hydrated.length,8);
assert.equal(created.length,4,"only the row that disappeared is created again");
assert.deepEqual(created.slice(0,3).map(x=>x.genre),['Akcja + Komedia','Akcja / Horror','Akcja + Fantasy']);
assert(!created.some(x=>x.genre.includes('Propozycja')));
// Actual recommendationShelf begins in shuffled (not latest) mode, with the
// full untruncated candidate list; latest is optional.
const s1=src.indexOf('  function randomizeRecommendations(');
const s2=src.indexOf('  async function loadRecommendationPage(',s1);
const more={...ctx,Math,enableShelfDrag:()=>{},loadRecommendationPage:async()=>{}};
vm.createContext(more);
vm.runInContext(src.slice(s1,s2),more);
const shelf=more.recommendationShelf('Akcja',Array.from({length:83},(_,i)=>({id:id(i+1),date_added:String(i)})));
assert.equal(shelf.mode,'random');
assert.equal(shelf.ordered.length,83);
assert.equal(shelf.offset,0);
assert(shelf.shuffle.className.includes('mf-home-view-active'));
console.log('PASS v0.4.108: AND/OR across independent proposal sets; toggle anime ON/OFF; inherited season genres; default unlimited random, latest optional');
