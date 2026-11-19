'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
let source=fs.readFileSync(path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/simkl.js'),'utf8');
source=source.replace('  function tick(){',`  window.__testSetUser=u=>{currentUser=u;};
  window.__testScore=(id,eligible)=>{cardScores.set(id,0);if(eligible)simklEligibleCards.add(id);};
  window.__testDecorate=decorateCardScores;
  function tick(){`);
const id=ch=>ch.repeat(32);
function card(char,kind,attrs={},classes=[]){
  const base={'data-id':id(char),'data-type':'Series','data-mf-watch':'unwatched',...attrs};
  const set=new Set(['card',...classes]);
  return {
    dataset:{mfKind:kind,mfAnime:base['data-mf-anime']||'',mfSimklExcluded:base['data-mf-simkl-excluded']||''},
    classList:{contains:c=>set.has(c),add:c=>set.add(c),remove:(...names)=>names.forEach(c=>set.delete(c))},
    getAttribute:k=>base[k]??null,setAttribute:(k,v)=>{base[k]=String(v);},removeAttribute:k=>{delete base[k];},
    querySelector(){return null;},getBoundingClientRect(){return {top:0,bottom:300};},
    inspect(){return {classes:[...set],attributes:base};}
  };
}
const malWatched=card('a','serial',{'data-mf-anime':'1','data-mf-watch':'watched','data-mf-simkl-watch':'unwatched'},['mf-simkl-native-media']);
const nfoTaggedOutsideRoot=card('b','serial',{'data-mf-simkl-excluded':'1','data-mf-watch':'started','data-mf-simkl-watch':'unwatched'},['mf-simkl-native-media']);
const ordinaryAnimation=card('c','serial',{'data-mf-watch':'started'});
const unclassifiedAnime=card('d','serial');
const cards=[malWatched,nfoTaggedOutsideRoot,ordinaryAnimation,unclassifiedAnime];
const document={readyState:'loading',addEventListener(){},querySelectorAll(){return cards;}};
const window={ApiClient:{getCurrentUserId(){return id('e');},accessToken(){return 'mock';}},location:{hash:'#/home'},setTimeout(){return 1;},clearTimeout(){},addEventListener(){},innerHeight:1080};
vm.runInNewContext(source,{window,document,location:window.location,URLSearchParams,AbortController,console},{filename:'simkl.js',timeout:1000});
window.__testSetUser(id('e'));
window.__testScore(id('a'),true); // even stale/wrong server data must not override MAL
window.__testScore(id('b'),true); // explicit tag veto must win
window.__testScore(id('c'),true); // normal animation remains eligible
window.__testScore(id('d'),false); // unknown anime cannot be colored by Simkl
window.__testDecorate();
for(const c of [malWatched,nfoTaggedOutsideRoot,unclassifiedAnime]){
 const state=c.inspect();
 assert(!state.classes.includes('mf-simkl-native-media'));
 assert(!('data-mf-simkl-watch' in state.attributes));
}
assert.equal(malWatched.inspect().attributes['data-mf-watch'],'watched');
assert(ordinaryAnimation.inspect().classes.includes('mf-simkl-native-media'));
assert.equal(ordinaryAnimation.inspect().attributes['data-mf-simkl-watch'],'started');
console.log('PASS v0.4.104: MAL anime, NFO-tagged outside-root, ordinary animation and pre-hydration isolation');
