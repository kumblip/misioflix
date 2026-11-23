'use strict';
// Regression: a proposal with no eligible catalog titles, or no accessible
// hydrated cards, must not leave an empty heading/rail. Network errors retain
// their retry affordance; successful cards keep their original rendering.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
class El {
  constructor(tag='div',klass='',text='') {
    this.tag=tag;this.className=klass;this.textContent=text;this.children=[];
    this.hidden=false;this.isConnected=true;this.dataset={};this.disabled=false;
    this.classList={add:(name)=>{this.className+=' '+name}};
  }
  appendChild(el){this.children.push(el);return el}
  replaceChildren(...els){this.children=[...els]}
  querySelector(selector){return selector==='.mf-home-card'?this.children.find(x=>x.className.split(' ').includes('mf-home-card'))||null:null}
  querySelectorAll(selector){return selector==='.mf-home-empty'?this.children.filter(x=>x.className.split(' ').includes('mf-home-empty')):[]}
  addEventListener(){}
  remove(){this.isConnected=false}
  get childElementCount(){return this.children.length}
}
const own=(tag,klass='',label='')=>new El(tag,klass,label);
const area=new El();
const ctx={
  homeRoot:{isConnected:true,querySelector:q=>q==='#mf-home-recommendations'?area:null},
  recommendationAudioMode:'all',recommendationHasRequestedAudio:()=>true,
  recommendationSubtitlesMode:'all',recommendationHasRequestedSubtitles:()=>true,
  recommendationInitialized:true,recommendationIncludeAnime:false,
  recommendationPresets:[{genres:['Isekai'],normalizedGenres:['isekai'],matchAll:false,allLibraries:true,excludedLibraryIds:[]}],
  recommendationCandidates:[{id:'a'.repeat(32),anime:true,type:'Series',genres:['Isekai']}],
  recommendationSeasonGenres:new Map(),recommendationRows:new Map(),recommendationObserver:null,
  normalized:x=>String(x).toLocaleLowerCase('pl'),compactId:x=>x,
  own,epoch:1,SHELF_LIMIT:12,isCurrent:()=>true,
  recommendationShelf:()=>{throw Error('No shelf should be constructed for 0 matches')},
  loadRecommendationPage:async()=>{},IntersectionObserver:undefined
};
ctx.recommendationAnimeIds=new Set();
ctx.recommendationGenresById=new Map([['a'.repeat(32),new Set(['isekai'])]]);
vm.createContext(ctx);
const a=src.indexOf('  function paintRecommendationSets(){');
const b=src.indexOf('  async function initializeRecommendations(serial){',a);
assert(a>=0&&b>a);
vm.runInContext(src.slice(a,b),ctx);
ctx.paintRecommendationSets();
assert.equal(ctx.recommendationRows.size,0);
assert.equal(area.childElementCount,0,'no heading, message or blank rail');

const loaderSrc=src.slice(src.indexOf('  async function loadRecommendationPage(row,reset){'),a);
assert(loaderSrc.startsWith('  async function loadRecommendationPage'));
const hydration={
  ...ctx,recommendationCards:async()=>[],makeCard:()=>new El('article','mf-home-card'),
};
vm.createContext(hydration);
vm.runInContext(loaderSrc,hydration);
const row=()=>({
  busy:false,shuffle:new El('button'),reset:new El('button'),
  section:new El('section','mf-home-genre-shelf'),scroll:new El('div','mf-home-shelf-scroll'),
  ordered:[{id:'a'.repeat(32)},{id:'b'.repeat(32)}],offset:0,hasMore:true
});
(async()=>{
  const empty=row();
  await hydration.loadRecommendationPage(empty,true);
  assert.equal(empty.section.hidden,true,'Jellyfin returned zero accessible tiles');
  assert.equal(empty.scroll.childElementCount,0,'no empty message or title placeholder');

  const real=row();
  hydration.recommendationCards=async()=>[{id:'a'.repeat(32)}];
  await hydration.loadRecommendationPage(real,true);
  assert.equal(real.section.hidden,false,'populated rail must remain visible');
  assert.equal(real.scroll.querySelectorAll('.mf-home-empty').length,0);
  assert.equal(real.scroll.querySelector('.mf-home-card')?.tag,'article');

  const failed=row();
  hydration.recommendationCards=async()=>{throw new Error('temporary network fault')};
  await hydration.loadRecommendationPage(failed,true);
  assert.equal(failed.section.hidden,false,'network failure is not an empty genre');
  assert.equal(failed.scroll.children[0].textContent,'Nie udało się wczytać propozycji. ');

  assert(src.includes('const heading=preset.genres.join('));
  assert(!src.includes("const heading='Propozycja '+index"));
  const css=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8');
  assert(css.includes('.mf-home-recommendations .mf-home-genre-shelf[hidden]{display:none!important}'));
  console.log('PASS v0.4.109: titles are genre-only, no candidate/no hydrated title hidden, successful tile and network retry remain');
})().catch(e=>{console.error(e);process.exitCode=1});
