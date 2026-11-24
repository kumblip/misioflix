'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {treeMethods,mockRow}=require('./dom_fixture_147.js');
const source=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
class El{constructor(tag='div',cls='',title=''){this.tag=tag;this.className=cls;this.textContent=title;this.dataset={};this.children=[];this.attrs={};this.listeners={};this.hidden=false;this.isConnected=true;this.scrollLeft=0;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,v){this.listeners[k]=v;}}
treeMethods(El);
const id=n=>n.toString(16).padStart(32,'0');
const candidates=[1,2,3,4,17001].map((n,i)=>({id:id(n),type:i%2?'Series':'Movie',pl_audio:i!==3,anime:i===1,genres:['A'],watch_status:'unwatched'}));
const area=new El(); const pending=[];let valid=true;
const ctx={recommendationWatchMode:'all',recommendationWatchSnapshot:null,recommendationWatchPending:null,recommendationWatchError:false,epoch:1,isCurrent:s=>valid&&s===1,validId:x=>/^[a-f0-9]{32}$/.test(x),compactId:x=>x,
  homeRoot:{querySelector:()=>area},recommendationInitialized:true,recommendationCandidates:candidates,recommendationPresets:[{genres:['A'],normalizedGenres:['A'],allLibraries:true,excludedLibraryIds:[]}],recommendationAnimeIds:new Set(),recommendationGenresById:new Map(candidates.map(x=>[x.id,new Set(['A'])])),recommendationRows:new Map(),recommendationObserver:null,recommendationIncludeAnime:true,recommendationAudioMode:'all',recommendationSubtitlesMode:'all',recommendationHasRequestedAudio:x=>ctx.recommendationAudioMode==='all'||x.pl_audio,recommendationHasRequestedSubtitles:()=>true,
  own:(...x)=>new El(...x),append:(p,...x)=>x.forEach(c=>p.appendChild(c)),recommendationShelf:(title,pool,full)=>mockRow(El,title,pool,full),loadRecommendationPage:async row=>{row.needsLoad=false;},IntersectionObserver:undefined,recommendationCardCache:new Map(),RECOMMENDATION_CARD_TTL_MS:45000,SHELF_LIMIT:10,
  request:(url)=>{assert.equal(url,'/home/recommendation-watch-status');return new Promise((resolve,reject)=>pending.push({resolve,reject}));}};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  function normalizeRecommendationWatchStatus(status){'),source.indexOf('  function randomizeRecommendations(pool){')),ctx);
vm.runInContext(source.slice(source.indexOf('  function paintRecommendationSets(){'),source.indexOf('  async function initializeRecommendations(serial){')),ctx);
const btn=ctx.recommendationWatchToggle().children[0],click=()=>btn.listeners.click(), tick=()=>new Promise(r=>setImmediate(r));
const row=()=>ctx.recommendationRows.get('proposal-1');const matches=()=>Array.from(row()?.matching||[],x=>x.id);
(async()=>{
  const label=()=>btn.children[1].textContent;
  ctx.paintRecommendationSets();assert.equal(pending.length,0);assert.deepEqual(matches(),candidates.map(x=>x.id));const first=row();assert.equal(label(),'📹 Wszystkie');
  click();assert.equal(btn.dataset.mfWatchMode,'unwatched');assert.equal(label(),'Stan: Nierozpoczęte');assert.equal(pending.length,1);assert.equal(row(),first);assert.equal(row().section.hidden,true);
  click();assert.equal(btn.dataset.mfWatchMode,'started');assert.equal(label(),'Stan: Rozpoczęte');assert.equal(pending.length,1);
  pending[0].resolve({[id(1)]:'watched',[id(2)]:'started',[id(3)]:'unwatched',[id(17001)]:'started'});await tick();assert.equal(row(),first);assert.deepEqual(matches(),[id(2),id(17001)]);assert.equal(row().section.hidden,false);assert.equal(ctx.recommendationWatchError,false);
  ctx.recommendationIncludeAnime=false;ctx.paintRecommendationSets();assert.deepEqual(matches(),[id(17001)]);ctx.recommendationIncludeAnime=true;
  click();assert.equal(btn.dataset.mfWatchMode,'completed');assert.equal(label(),'Stan: Zakończone');assert.deepEqual(matches(),[id(1)]);assert.equal(pending.length,1);
  click();assert.equal(label(),'📹 Wszystkie');assert.deepEqual(matches(),candidates.map(x=>x.id));assert.equal(pending.length,1);
  click();assert.equal(pending.length,2);pending[1].resolve({[id(1)]:'unwatched',[id(2)]:'started',[id(3)]:'completed',[id(4)]:'unwatched',[id(17001)]:'unwatched'});await tick();assert.deepEqual(matches(),[id(1),id(4),id(17001)]);
  ctx.recommendationAudioMode='pl';ctx.paintRecommendationSets();assert.deepEqual(matches(),[id(1),id(17001)]);ctx.recommendationAudioMode='all';
  click();assert.deepEqual(matches(),[id(2)]);click();assert.deepEqual(matches(),[id(3)]);click();assert.deepEqual(matches(),candidates.map(x=>x.id));
  click();assert.equal(pending.length,3);click();click();click();assert.equal(ctx.recommendationWatchMode,'all');pending[2].resolve({[id(1)]:'started'});await tick();assert.deepEqual(matches(),candidates.map(x=>x.id),'late response cannot change All');
  click();pending[3].reject(Error('network'));await tick();assert.equal(row().section.hidden,true);assert.equal(ctx.recommendationWatchError,true);const retry=area.children.find(x=>x.className==='mf-home-empty').children[0];retry.listeners.click();assert.equal(pending.length,5);valid=false;ctx.resetRecommendationWatchStatuses();pending[4].resolve({[id(1)]:'unwatched'});await tick();assert.equal(ctx.recommendationWatchSnapshot,null,'old user response discarded');
  console.log('PASS four watch modes, full button labels, full pool, other filters, retained rows, retry and stale response guards');
})().catch(e=>{console.error(e);process.exitCode=1;});
