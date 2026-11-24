'use strict';
// Regression for the real Anime PL case: stale catalog anime:false despite the
// live library-ID role being anime. Both switches must still behave correctly.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const id=n=>n.toString(16).padStart(32,'0');
const animeId=id(500),mediaId=id(501);
class El{
  constructor(tag='div',className='',textContent=''){
    this.tag=tag;this.className=className;this.textContent=textContent;this.dataset={};
    this.children=[];this.attrs={};this.listeners={};this.isConnected=true;
  }
  appendChild(x){this.children.push(x);return x;}
  replaceChildren(...kids){this.children=kids;}
  addEventListener(evt,fn){this.listeners[evt]=fn;}
  setAttribute(k,v){this.attrs[k]=String(v);}
}
const {treeMethods,mockRow}=require('./dom_fixture_147.js');treeMethods(El);
const area=new El(),seen=[];
const ctx={
  librariesCache:[{id:animeId,category:'anime',name:'Anime PL'},
                  {id:mediaId,category:'series',name:'Seriale PL'}],
  recommendationIncludeAnime:true,recommendationAudioMode:'pl',recommendationSubtitlesMode:'all',recommendationWatchMode:'all',recommendationHasRequestedWatchStatus:()=>true,
  recommendationInitialized:true,
  recommendationCandidates:[
    {id:id(1),anime:false,library_ids:[animeId],type:'Series',genres:['Isekai'],pl_audio:true},
    {id:id(2),anime:true,library_ids:[animeId],type:'Series',genres:['Isekai'],pl_audio:true},
    {id:id(3),anime:false,library_ids:[mediaId],type:'Series',genres:['Isekai'],pl_audio:true},
    {id:id(4),anime:false,library_ids:[animeId],type:'Series',genres:['Isekai'],pl_audio:false}
  ],
  recommendationPresets:[{genres:['Isekai'],normalizedGenres:['isekai'],matchAll:false,allLibraries:true,excludedLibraryIds:[]}],
  recommendationSeasonGenres:new Map(),recommendationRows:new Map(),recommendationObserver:null,
  homeRoot:{querySelector:q=>q==='#mf-home-recommendations'?area:null},
  own:(...x)=>new El(...x),append:(p,...children)=>children.forEach(v=>p.appendChild(v)),
  normalized:x=>String(x).toLowerCase(),compactId:x=>String(x).toLowerCase(),
  recommendationShelf:(title,matching,full)=>mockRow(El,title,matching,full),
  loadRecommendationPage:async row=>{row.needsLoad=false;},IntersectionObserver:undefined,
  recommendationCardCache:new Map(),RECOMMENDATION_CARD_TTL_MS:45000,SHELF_LIMIT:10
};
ctx.recommendationAnimeIds=new Set([animeId]);
ctx.recommendationGenresById=new Map(ctx.recommendationCandidates.map(item=>[item.id,new Set(['isekai'])]));
vm.createContext(ctx);
const a=src.indexOf('  function recommendationAnimeToggle(){');
const b=src.indexOf('  function randomizeRecommendations(',a);
vm.runInContext(src.slice(a,b),ctx);
const p=src.indexOf('  function paintRecommendationSets(){');
const q=src.indexOf('  async function initializeRecommendations(serial){',p);
vm.runInContext(src.slice(p,q),ctx);
const animeToggle=ctx.recommendationAnimeToggle().children[0];
ctx.paintRecommendationSets();
assert.deepEqual(Array.from(ctx.recommendationRows.values())[0].matching.map(i=>i.id),[id(1),id(2),id(3)]);
animeToggle.listeners.click();
assert.equal(animeToggle.attrs['aria-checked'],'false');
assert.deepEqual(Array.from(ctx.recommendationRows.values())[0].matching.map(i=>i.id),[id(3)],'the misclassified Anime PL ID must be filtered out');
const audioToggle=ctx.recommendationAudioToggle().children[0];
audioToggle.listeners.click(); // PL -> non-PL, with anime hidden
assert.equal(audioToggle.dataset.mfAudioMode,'original');
assert.equal(ctx.recommendationRows.size,0,'the non-PL anime must remain hidden');
animeToggle.listeners.click();
assert.equal(animeToggle.attrs['aria-checked'],'true');
assert.deepEqual(Array.from(ctx.recommendationRows.values())[0].matching.map(i=>i.id),[id(4)],'anime comes back only when requested');
console.log('PASS: anime exclusion based on live library ID + independent Polish/non-Polish audio');
