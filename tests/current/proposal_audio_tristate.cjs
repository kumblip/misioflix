'use strict';
// New proposal-only three-state filter: check real source functions, no network.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8');
const id=n=>n.toString(16).padStart(32,'0');
const testItems=[
  {id:id(1),anime:true,type:'Series',genres:['Isekai'],pl_audio:true},
  {id:id(2),anime:true,type:'Series',genres:['Isekai'],pl_audio:false},
  {id:id(3),anime:true,type:'Series',genres:['Isekai'],pl_audio:null},
  {id:id(4),anime:false,type:'Movie',genres:['Isekai'],pl_audio:true},
  {id:id(5),anime:true,type:'Series',genres:['Isekai']}
];
class El {
  constructor(tag='div',cls='',label=''){this.tag=tag;this.className=cls;this.textContent=label;this.dataset={};this.attrs={};this.children=[];this.isConnected=true;this.listeners={};}
  appendChild(v){this.children.push(v);return v;}
  replaceChildren(...v){this.children=v;}
  addEventListener(name,listener){this.listeners[name]=listener;}
  setAttribute(name,value){this.attrs[name]=String(value);}
  getAttribute(name){return this.attrs[name]??null;}
}
const {treeMethods,mockRow}=require('./dom_fixture_147.js');treeMethods(El);
const area=new El();
const matches=[];
const context={
  recommendationAudioMode:'pl',recommendationSubtitlesMode:'all',recommendationWatchMode:'all',recommendationHasRequestedWatchStatus:()=>true,recommendationIncludeAnime:true,recommendationInitialized:true,
  recommendationCandidates:testItems,recommendationPresets:[{genres:['Isekai'],normalizedGenres:['isekai'],matchAll:false,allLibraries:true,excludedLibraryIds:[]}],
  recommendationSeasonGenres:new Map(),recommendationRows:new Map(),recommendationObserver:null,
  homeRoot:{querySelector:q=>q==='#mf-home-recommendations'?area:null},
  own:(t,c='',v='')=>new El(t,c,v),append:(p,...x)=>x.forEach(c=>p.appendChild(c)),
  normalized:x=>String(x).toLowerCase(),compactId:x=>x,
  recommendationShelf:(title,pool,full)=>mockRow(El,title,pool,full),
  loadRecommendationPage:async row=>{row.needsLoad=false;},IntersectionObserver:undefined,
  recommendationCardCache:new Map(),RECOMMENDATION_CARD_TTL_MS:45000,SHELF_LIMIT:10
};
context.recommendationAnimeIds=new Set();
context.recommendationGenresById=new Map(testItems.map(item=>[item.id,new Set(['isekai'])]));
vm.createContext(context);
const start=src.indexOf('  function recommendationAudioToggle(){');
const end=src.indexOf('  function randomizeRecommendations(pool){',start);
assert(start>=0&&end>start);
vm.runInContext(src.slice(start,end),context);
const p=src.indexOf('  function paintRecommendationSets(){');
const q=src.indexOf('  async function initializeRecommendations(serial){',p);
assert(p>0&&q>p);
vm.runInContext(src.slice(p,q),context);
const button=context.recommendationAudioToggle().children[0];
assert.equal(button.dataset.mfAudioMode,'pl');
assert.equal(button.children[1].textContent,'Audio PL');
context.paintRecommendationSets();
assert.deepEqual(Array.from(context.recommendationRows.values())[0].matching.map(i=>i.id),[id(1),id(4)],'Polish audio only, exclude unknown and non-PL');
button.listeners.click();
assert.equal(button.dataset.mfAudioMode,'original');
assert.equal(button.children[1].textContent,'Audio nie-PL');
assert.deepEqual(Array.from(context.recommendationRows.values())[0].matching.map(i=>i.id),[id(2)],'original means verified lack of Polish audio');
button.listeners.click();
assert.equal(button.dataset.mfAudioMode,'all');
assert.equal(button.children[1].textContent,'Wszystkie');
assert.deepEqual(Array.from(context.recommendationRows.values())[0].matching.map(i=>i.id),testItems.map(i=>i.id),'all includes unknown audio');
button.listeners.click();
assert.equal(button.dataset.mfAudioMode,'pl');
assert.deepEqual(Array.from(context.recommendationRows.values())[0].matching.map(i=>i.id),[id(1),id(4)]);
assert(css.includes('mf-home-audio-toggle[data-mf-audio-mode="original"]'));
assert(css.includes('mf-home-audio-toggle[data-mf-audio-mode="all"]'));
assert(css.includes('mf-home-audio-toggle[data-mf-audio-mode="pl"]'));
assert(src.includes('switches.appendChild(recommendationAudioToggle())'));
console.log('PASS proposal audio three-state: PL -> original -> all, unknown excluded from both strict audio states');
