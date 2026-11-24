'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {treeMethods}=require('./dom_fixture_147.js');
const source=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const code=source.slice(source.indexOf('  function randomizeRecommendations(pool){'),source.indexOf('  async function initializeRecommendations(serial){'));
class El{
  constructor(tag='div',cls='',text=''){
    this.tag=tag;this.className=cls;this.textContent=text;this.children=[];this.dataset={};this.listeners={};this.attrs={};this.hidden=false;this.isConnected=true;this.scrollLeft=0;
    this.classList={add:n=>this.className+=' '+n,toggle:(n,on)=>{this.attrs[n]=on;}};
  }
  addEventListener(n,fn){this.listeners[n]=fn;}
  setAttribute(n,v){this.attrs[n]=v;}
  get childElementCount(){return this.children.length;}
  scrollBy(){}
}
treeMethods(El);
const id=n=>n.toString(16).padStart(32,'0');
const items=Array.from({length:43},(_,i)=>({id:id(i+1),type:'Movie',date_added:String(i+1).padStart(3,'0'),pl_audio:i>=40||i%2===0,genres:[i>=40?'B':'A']}));
const preset=g=>({genres:[g],normalizedGenres:[g],matchAll:false,allLibraries:true,excludedLibraryIds:[]});
const tick=()=>new Promise(r=>setImmediate(r));
function harness(withObserver=false){
  const area=new El();let now=1,random=0.999999,created=0,hold=false;const calls=[],pending=[],observers=[];
  class Observer{constructor(fn){this.fn=fn;this.targets=new Set();observers.push(this);}observe(target){this.targets.add(target);}unobserve(t){this.targets.delete(t);}disconnect(){this.targets.clear();}}
  const cache=new Map();
  const ctx={homeRoot:{isConnected:true,querySelector:()=>area},epoch:1,isCurrent:s=>s===1,
    recommendationInitialized:true,recommendationIncludeAnime:true,recommendationAudioMode:'all',recommendationSubtitlesMode:'all',
    recommendationPresets:[preset('A'),preset('B')],recommendationCandidates:items,
    recommendationAnimeIds:new Set(),recommendationGenresById:new Map(items.map(i=>[i.id,new Set(i.genres)])),
    recommendationRows:new Map(),recommendationObserver:null,
    recommendationCardCache:cache,recommendationCardInFlight:new Map(),recommendationCardGeneration:0,
    RECOMMENDATION_CARD_TTL_MS:45000,RECOMMENDATION_CARD_CACHE_LIMIT:500,SHELF_LIMIT:10,SHELF_MORE_LIMIT:25,
    recommendationHasRequestedAudio:i=>ctx.recommendationAudioMode==='all'||i.pl_audio===(ctx.recommendationAudioMode==='pl'),recommendationHasRequestedSubtitles:()=>true,
    own:(...x)=>new El(...x),append:(p,...nodes)=>nodes.forEach(n=>p.appendChild(n)),
    enableShelfDrag:()=>{},compactId:x=>x,validId:x=>typeof x==='string'&&x.length===32,
    Date:{now:()=>now},Math:{floor:Math.floor,random:()=>random},IntersectionObserver:withObserver?Observer:undefined,
    makeCard:i=>{created++;const n=new El('article','mf-home-card');n.item=i;return n;},
    request:async url=>{
      const ids=decodeURIComponent(url.split('ids=')[1]).split(',');calls.push(ids);
      const data=()=>ids.map(x=>({id:x,title:'tile '+x}));
      if(!hold)return data();
      return new Promise((resolve,reject)=>pending.push({ids,resolve:()=>resolve(data()),reject}));
    }
  };
  vm.createContext(ctx);vm.runInContext(code,ctx);
  return {ctx,area,calls,cache,pending,observers,created:()=>created,setNow:x=>now=x,setRandom:x=>random=x,setHold:x=>hold=x,
    row:(n=1)=>ctx.recommendationRows.get('proposal-'+n),mode:m=>{ctx.recommendationAudioMode=m;ctx.paintRecommendationSets();}};
}
const ids=r=>Array.from(r.scroll.children).filter(n=>n.item).map(n=>n.item.id);
(async()=>{
  const h=harness();h.mode('all');await tick();
  const a=h.row(),b=h.row(2),first=a.scroll.children.slice(),other=b.scroll.children.slice();
  assert.equal(a.offset,10);assert.equal(a.ordered.length,40);assert.equal(h.calls.length,2);
  assert.equal(h.created(),13);
  h.mode('pl'); // synchronous removal of any ineligible tiles BEFORE the request resolves
  assert.equal(h.row(),a);assert.equal(h.row(2),b);assert.deepEqual(ids(a),[1,3,5,7,9].map(id));
  await tick();
  assert.deepEqual(ids(a),[1,3,5,7,9,11,13,15,17,19].map(id));
  for(let i=0;i<5;i++)assert.equal(a.scroll.children[i],first[i*2],'same cached card node reused');
  assert.deepEqual(b.scroll.children,other,'unchanged shelf has no DOM changes');
  assert.deepEqual(h.calls[2],[11,13,15,17,19].map(id),'only missing tiles are fetched');
  assert.equal(h.calls.length,3);assert.equal(h.created(),18);
  h.mode('pl');await tick();assert.equal(h.calls.length,3);assert.equal(h.created(),18);
  await h.ctx.loadRecommendationPage(a,false);assert.equal(a.offset,20);assert.equal(ids(a).length,20);assert.equal(a.hasMore,false);
  // A stale response must not append old cards, overwrite offsets or release a newer request.
  h.cache.clear();h.setHold(true);h.mode('original');
  const old=h.pending.find(p=>p.ids[0]===id(2));assert(old);
  assert.equal(h.row(2),undefined,'empty row removed');assert.equal(b.section.isConnected,false);
  assert.equal(ids(a).length,0,'stale and nonmatching cards removed immediately');
  h.mode('pl');const fresh=h.pending.find(p=>p.ids[0]===id(1));assert(fresh);
  assert.equal(a.busy,true);old.resolve();await tick();
  assert.equal(a.busy,true,'old finally must not release newer request');assert.equal(ids(a).length,0);
  fresh.resolve();for(const p of h.pending)if(p!==old&&p!==fresh)p.resolve();await tick();
  assert.equal(a.busy,false);assert.equal(a.offset,10);assert(ids(a).every(x=>Number.parseInt(x,16)%2===1));
  // Cache expiry must replace stale objects even if the eligible IDs did not change.
  const stale=a.scroll.children[0];h.setHold(false);h.setNow(45002);h.mode('pl');await tick();
  assert.notEqual(a.scroll.children[0],stale,'expired authorization is revalidated and card rebuilt');
  assert.equal(ids(a).length,10);
  // Explicit sorting and shuffle still work on the full eligible pool.
  a.reset.listeners.click();await tick();assert.equal(a.mode,'latest');assert.equal(a.ordered[0].id,id(39));
  h.mode('all');await tick();assert.equal(a.mode,'latest');assert.equal(a.ordered[0].id,id(40));
  h.setRandom(0);a.shuffle.listeners.click();await tick();assert.equal(a.mode,'random');assert.equal(a.ordered.length,40);
  assert.equal(new Set(Array.from(a.ordered,x=>x.id)).size,40);
  // Observer callbacks already queued before a filter change must be ignored.
  const lazy=harness(true);lazy.mode('all');const prev=lazy.observers[0],target=lazy.row().section;
  assert.equal(lazy.calls.length,0);lazy.mode('original');const next=lazy.observers[1];
  prev.fn([{isIntersecting:true,target}]);await tick();assert.equal(lazy.calls.length,0);
  next.fn([{isIntersecting:true,target}]);await tick();assert.equal(lazy.calls.length,1);assert.equal(lazy.row().offset,10);
  assert(ids(lazy.row()).every(x=>Number.parseInt(x,16)%2===0));
  console.log('PASS 0.4.147: keyed DOM/card reuse, missing-only requests, unchanged rows, 10/25 paging, empty rows, stale responses, TTL, full-pool shuffle, stable sort, lazy observer');
})().catch(e=>{console.error(e);process.exitCode=1;});
