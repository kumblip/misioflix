'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {treeMethods,mockRow}=require('./dom_fixture_147.js');
const source=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
class El{constructor(tag='div',cls='',title=''){this.tag=tag;this.className=cls;this.textContent=title;this.dataset={};this.children=[];this.attrs={};this.listeners={};this.hidden=false;this.isConnected=true;this.scrollLeft=0;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,v){this.listeners[k]=v;}}
treeMethods(El);
const id=n=>n.toString(16).padStart(32,'0');
const candidates=[1,2,3,4,17001].map((n,i)=>({id:id(n),type:i%2?'Series':'Movie',pl_audio:i!==3,anime:i===1,genres:['A'],watch_status:'unwatched'}));
const area=new El(); const pending=[];let valid=true;
const simkl=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/simkl.js'),'utf8');
const mal=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/mal.js'),'utf8');
const frameContext={window:{}};vm.createContext(frameContext);
vm.runInContext(simkl.slice(simkl.indexOf('  function simklFrame('),simkl.indexOf('  function clearDetailFrames(')),frameContext);
// The MAL resolver runs against the same local index as the card decorator.
const malContext={window:{},userId:()=>id(99),compact:x=>x,valid:()=>true,token:()=> 'token',indexState:()=>({full:true,entries:{1:{status:'completed'},2:{status:'watching'},3:{status:'plan_to_watch'}}}),loadBindings:()=>({}),loadCache:()=>null,entryFields:x=>x};
vm.createContext(malContext);
vm.runInContext(mal.slice(mal.indexOf('  const statusState='),mal.indexOf('  const statusLabel=')),malContext);
vm.runInContext(mal.slice(mal.indexOf('  function malCardStatus('),mal.indexOf('  function decorateMalCards(')),malContext);
const malFrame=malContext.window.MisioFlixMalProposalFrames();
assert.equal(malFrame(id(2),1,false),'watched');assert.equal(malFrame(id(2),1,true),'mixed');assert.equal(malFrame(id(2),2,false),'started');assert.equal(malFrame(id(2),3,false),'unwatched');assert.equal(malFrame(id(2),4,false),'unwatched');assert.equal(malFrame(id(2),null,false),'unknown');
const native=(watchStatus)=>({anime:false,watchStatus});
const media=(simklStatus,watchStatus,resuming=false)=>({anime:false,simklEligible:true,simklStatus,watchStatus,resuming});
const anime=(malId,resuming=false)=>({anime:true,malId,watchStatus:'unwatched',resuming});

const ctx={window:{MisioFlixMalProposalFrames:malContext.window.MisioFlixMalProposalFrames,MisioFlixSimklProposalFrame:frameContext.window.MisioFlixSimklProposalFrame},recommendationWatchMode:'all',recommendationWatchSnapshot:null,recommendationWatchPending:null,recommendationWatchError:false,epoch:1,isCurrent:s=>valid&&s===1,validId:x=>/^[a-f0-9]{32}$/.test(x),compactId:x=>x,
  homeRoot:{querySelector:()=>area},recommendationInitialized:true,recommendationCandidates:candidates,recommendationPresets:[{genres:['A'],normalizedGenres:['A'],allLibraries:true,excludedLibraryIds:[]}],recommendationAnimeIds:new Set(),recommendationGenresById:new Map(candidates.map(x=>[x.id,new Set(['A'])])),recommendationRows:new Map(),recommendationObserver:null,recommendationIncludeAnime:true,recommendationAudioMode:'all',recommendationSubtitlesMode:'all',recommendationHasRequestedAudio:x=>ctx.recommendationAudioMode==='all'||x.pl_audio,recommendationHasRequestedSubtitles:()=>true,
  own:(...x)=>new El(...x),append:(p,...x)=>x.forEach(c=>p.appendChild(c)),recommendationShelf:(title,pool,full)=>mockRow(El,title,pool,full),loadRecommendationPage:async row=>{row.needsLoad=false;},IntersectionObserver:undefined,recommendationCardCache:new Map(),RECOMMENDATION_CARD_TTL_MS:45000,SHELF_LIMIT:10,
  request:(url)=>{assert.equal(url,'/home/recommendation-watch-status');return new Promise((resolve,reject)=>pending.push({resolve,reject}));}};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  function normalizeRecommendationWatchStatus(status){'),source.indexOf('  function randomizeRecommendations(pool){')),ctx);
vm.runInContext(source.slice(source.indexOf('  function paintRecommendationSets(){'),source.indexOf('  async function initializeRecommendations(serial){')),ctx);
assert.equal(ctx.recommendationFrameStatus(id(1),media('watching','unwatched'),malFrame,frameContext.window.MisioFlixSimklProposalFrame),'started');
assert.equal(ctx.recommendationFrameStatus(id(1),media('completed','unwatched'),malFrame,frameContext.window.MisioFlixSimklProposalFrame),'watched');
assert.equal(ctx.recommendationFrameStatus(id(1),media('completed','unwatched',true),malFrame,frameContext.window.MisioFlixSimklProposalFrame),'mixed');
assert.equal(ctx.recommendationFrameStatus(id(1),anime(null),malFrame,frameContext.window.MisioFlixSimklProposalFrame),'unknown');
assert.equal(ctx.recommendationFrameStatus(id(1),anime(1),malFrame,frameContext.window.MisioFlixSimklProposalFrame),'watched');
assert.equal(ctx.recommendationFrameStatus(id(1),anime(3),malFrame,frameContext.window.MisioFlixSimklProposalFrame),'unwatched');
assert.equal(ctx.normalizeRecommendationWatchStatus('mixed'),'mixed');
assert.equal(ctx.recommendationFrameStatus(id(1),media('completed','started'),malFrame,undefined),'started','disabled SIMKL uses native frame');
assert.equal(ctx.recommendationFrameStatus(id(1),anime(1),undefined,frameContext.window.MisioFlixSimklProposalFrame),'unknown','disabled MAL leaves no frame');
assert.equal(ctx.recommendationFrameStatus(id(1),{...media('plan_to_watch','unwatched'),watchedEpisodes:2},malFrame,frameContext.window.MisioFlixSimklProposalFrame),'started');
malContext.indexState=()=>({full:false,entries:{}});
assert.equal(malContext.window.MisioFlixMalProposalFrames()(id(2),1,false),'unknown','missing data in incomplete MAL index is not pink');
malContext.indexState=()=>({full:true,entries:{1:{status:'completed'},2:{status:'watching'},3:{status:'plan_to_watch'}}});
const btn=ctx.recommendationWatchToggle().children[0],click=()=>btn.listeners.click(), tick=()=>new Promise(r=>setImmediate(r));
const row=()=>ctx.recommendationRows.get('proposal-1');const matches=()=>Array.from(row()?.matching||[],x=>x.id);
(async()=>{
  const label=()=>btn.children[1].textContent;
  ctx.paintRecommendationSets();assert.equal(pending.length,0);assert.deepEqual(matches(),candidates.map(x=>x.id));const first=row();assert.equal(label(),'📹 Wszystkie');
  click();assert.equal(btn.dataset.mfWatchMode,'unwatched');assert.equal(label(),'Stan: Nierozpoczęte');assert.equal(pending.length,1);assert.equal(row(),first);assert.equal(row().section.hidden,true);
  click();assert.equal(btn.dataset.mfWatchMode,'started');assert.equal(label(),'Stan: Rozpoczęte');assert.equal(pending.length,1);
  pending[0].resolve({[id(1)]:media('completed','unwatched'),[id(2)]:anime(1,true),[id(3)]:media('plan_to_watch','unwatched'),[id(4)]:media('completed','unwatched',true),[id(17001)]:media('watching','unwatched')});await tick();assert.equal(row(),first);assert.deepEqual(matches(),[id(2),id(4),id(17001)]);assert.equal(row().section.hidden,false);assert.equal(ctx.recommendationWatchError,false);
  ctx.recommendationIncludeAnime=false;ctx.paintRecommendationSets();assert.deepEqual(matches(),[id(4),id(17001)]);ctx.recommendationIncludeAnime=true;
  click();assert.equal(btn.dataset.mfWatchMode,'completed');assert.equal(label(),'Stan: Zakończone');assert.deepEqual(matches(),[id(1),id(2),id(4)]);
  assert.equal(ctx.recommendationWatchSnapshot.get(id(2)),'mixed');assert.equal(ctx.recommendationWatchSnapshot.get(id(4)),'mixed');
  assert.equal(ctx.recommendationHasRequestedWatchStatus({id:id(99999)}),false);
  ctx.recommendationWatchMode='unwatched';assert.equal(ctx.recommendationHasRequestedWatchStatus({id:id(2)}),false);assert.equal(ctx.recommendationHasRequestedWatchStatus({id:id(4)}),false);ctx.recommendationWatchMode='completed';assert.equal(pending.length,1);
  click();assert.equal(label(),'📹 Wszystkie');assert.deepEqual(matches(),candidates.map(x=>x.id));assert.equal(pending.length,1);
  click();assert.equal(pending.length,2);pending[1].resolve({[id(1)]:native('unwatched'),[id(2)]:anime(2),[id(3)]:media('completed','started'),[id(4)]:native('unwatched'),[id(17001)]:media(null,'unwatched')});await tick();assert.deepEqual(matches(),[id(1),id(4),id(17001)]);
  ctx.recommendationAudioMode='pl';ctx.paintRecommendationSets();assert.deepEqual(matches(),[id(1),id(17001)]);ctx.recommendationAudioMode='all';
  click();assert.deepEqual(matches(),[id(2)]);click();assert.deepEqual(matches(),[id(3)]);click();assert.deepEqual(matches(),candidates.map(x=>x.id));
  click();assert.equal(pending.length,3);click();click();click();assert.equal(ctx.recommendationWatchMode,'all');pending[2].resolve({[id(1)]:media('completed','unwatched',true)});await tick();assert.deepEqual(matches(),candidates.map(x=>x.id),'late response cannot change All');
  click();pending[3].reject(Error('network'));await tick();assert.equal(row().section.hidden,true);assert.equal(ctx.recommendationWatchError,true);const retry=area.children.find(x=>x.className==='mf-home-empty').children[0];retry.listeners.click();assert.equal(pending.length,5);valid=false;ctx.resetRecommendationWatchStatuses();pending[4].resolve({[id(1)]:native('unwatched')});await tick();assert.equal(ctx.recommendationWatchSnapshot,null,'old user response discarded');
  console.log('PASS four watch modes, full button labels, full pool, other filters, retained rows, retry and stale response guards');
})().catch(e=>{console.error(e);process.exitCode=1;});
