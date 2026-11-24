'use strict';
// A second independent filter: ALL -> PL subtitles -> EN subtitles, both from
// the same authorized catalogue used by the PL/non-PL audio filter.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8');
const id=n=>n.toString(16).padStart(32,'0');
const candidates=[
  {id:id(1),anime:true,type:'Series',genres:['Akcja'],pl_audio:true,pl_subtitles:true,en_subtitles:false},
  {id:id(2),anime:true,type:'Series',genres:['Akcja'],pl_audio:false,pl_subtitles:false,en_subtitles:true},
  {id:id(3),anime:true,type:'Series',genres:['Akcja'],pl_audio:true,pl_subtitles:false,en_subtitles:true},
  {id:id(4),anime:true,type:'Series',genres:['Akcja'],pl_audio:false,pl_subtitles:true,en_subtitles:true},
  {id:id(5),anime:true,type:'Series',genres:['Akcja'],pl_audio:null,pl_subtitles:null,en_subtitles:null},
  {id:id(6),anime:true,type:'Series',genres:['Akcja'],pl_audio:true} // unknown subtitles
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
const area=new El(),matches=[];
const ctx={
  recommendationAudioMode:'pl',recommendationSubtitlesMode:'all',recommendationWatchMode:'all',recommendationHasRequestedWatchStatus:()=>true,recommendationIncludeAnime:true,
  recommendationInitialized:true,recommendationCandidates:candidates,recommendationPresets:[{genres:['Akcja'],normalizedGenres:['akcja'],matchAll:false,allLibraries:true,excludedLibraryIds:[]}],
  recommendationSeasonGenres:new Map(),recommendationRows:new Map(),recommendationObserver:null,
  homeRoot:{querySelector:q=>q==='#mf-home-recommendations'?area:null},
  own:(t,c='',v='')=>new El(t,c,v),append:(p,...x)=>x.forEach(c=>p.appendChild(c)),
  normalized:x=>String(x).toLocaleLowerCase('pl'),compactId:x=>x,
  recommendationShelf:(title,pool,full)=>mockRow(El,title,pool,full),
  loadRecommendationPage:async row=>{row.needsLoad=false;},IntersectionObserver:undefined,
  recommendationCardCache:new Map(),RECOMMENDATION_CARD_TTL_MS:45000,SHELF_LIMIT:10
};
ctx.recommendationAnimeIds=new Set();
ctx.recommendationGenresById=new Map(candidates.map(item=>[item.id,new Set(['akcja'])]));
vm.createContext(ctx);
const start=src.indexOf('  function recommendationAudioToggle(){');
const end=src.indexOf('  function randomizeRecommendations(pool){',start);
assert(start>0&&end>start);
vm.runInContext(src.slice(start,end),ctx);
const p=src.indexOf('  function paintRecommendationSets(){');
const q=src.indexOf('  async function initializeRecommendations(serial){',p);
assert(p>0&&q>p);
vm.runInContext(src.slice(p,q),ctx);
const subtitleButton=ctx.recommendationSubtitlesToggle().children[0];
const audioButton=ctx.recommendationAudioToggle().children[0];
function expect(mode, ids, subtitleLabel){
  assert.equal(subtitleButton.dataset.mfSubtitlesMode,mode);
  assert.equal(subtitleButton.children[1].textContent,subtitleLabel);
  ctx.paintRecommendationSets();
  assert.deepEqual(Array.from(ctx.recommendationRows.values())[0].matching.map(i=>i.id),ids.map(id),'both independent filters applied');
}
assert.equal(ctx.recommendationAudioMode,'pl');
assert.equal(audioButton.children[1].textContent,'Audio PL');
expect('all',[1,3,6],'Wszystkie');
subtitleButton.listeners.click();
assert.equal(ctx.recommendationSubtitlesMode,'pl');
assert.deepEqual(Array.from(ctx.recommendationRows.values())[0].matching.map(i=>i.id),[id(1)]);
expect('pl',[1],'Napisy PL');
subtitleButton.listeners.click();
assert.equal(ctx.recommendationSubtitlesMode,'en');
assert.deepEqual(Array.from(ctx.recommendationRows.values())[0].matching.map(i=>i.id),[id(3)]);
expect('en',[3],'Napisy EN');
// Non-PL audio AND EN subtitles, independent filter state.
audioButton.listeners.click();
assert.equal(ctx.recommendationAudioMode,'original');
assert.deepEqual(Array.from(ctx.recommendationRows.values())[0].matching.map(i=>i.id),[id(2),id(4)]);
expect('en',[2,4],'Napisy EN');
// ALL subtitles must include unknown subs, but audio filter still applies.
subtitleButton.listeners.click();
assert.equal(ctx.recommendationSubtitlesMode,'all');
assert.deepEqual(Array.from(ctx.recommendationRows.values())[0].matching.map(i=>i.id),[id(2),id(4)]);
// ALL audio + ALL subtitles allows even unknown indexed media.
audioButton.listeners.click();
assert.equal(ctx.recommendationAudioMode,'all');
assert.deepEqual(Array.from(ctx.recommendationRows.values())[0].matching.map(i=>i.id),candidates.map(item=>item.id));
assert(css.includes('mf-home-subtitles-toggle[data-mf-subtitles-mode="all"]'));
assert(css.includes('mf-home-subtitles-toggle[data-mf-subtitles-mode="all"] .mf-home-libraries-label::before'));
assert(css.includes('content:"CC"'));
assert(css.includes('border:1px solid #caefff'));
assert(!css.includes('content:"📓"'));
assert(!css.includes('mf-home-audio-toggle[data-mf-audio-mode="all"] .mf-home-libraries-label::before'));
assert(css.includes('mf-home-subtitles-toggle[data-mf-subtitles-mode="pl"]'));
assert(css.includes('mf-home-subtitles-toggle[data-mf-subtitles-mode="en"]'));
assert(src.includes('switches.appendChild(recommendationAudioToggle());\n      switches.appendChild(recommendationSubtitlesToggle());'));
console.log('PASS proposal subtitles states and independent audio filter from one durable flags index');
