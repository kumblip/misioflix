'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
function slice(from,to){
 const a=source.indexOf(from),b=source.indexOf(to,a+from.length);
 assert(a>=0&&b>a,`missing ${from}`);return source.slice(a,b);
}
const filter=slice('  function fitsSearch(item,state,withText=true){','  function closeWhenNavigate(state){');
const context={
 allowGroup:()=>true,searchByType:()=>true,watchModeMatches:()=>true,compactId:v=>String(v||""),
 termsForFilter:()=>new Set(),normalized:()=>'',titleMatches:()=>true,
};vm.createContext(context);vm.runInContext(filter,context);
const state={kind:'anime',unmatchedGenre:'',libraryStates:new Map(),
  typeStates:new Map(),genreStates:new Map(),input:{value:''},lektor:{value:'lektor'}};
function sourceMatches(source){return context.fitsSearch({anime:true,anime_source:source,type:'Series'},state)}
assert.equal(sourceMatches('lektor'),true,'PL anime visible by default');
assert.equal(sourceMatches('original'),false,'EN anime hidden by default');
assert.equal(sourceMatches('both'),true,'PL+ENG is visible in PL mode');
assert.equal(sourceMatches(undefined),true,'legacy cached items remain PL');
state.lektor.value='original';
assert.equal(sourceMatches('original'),true,'English mode selects original audio');
assert.equal(sourceMatches('lektor'),false,'English mode hides PL-only library');
assert.equal(sourceMatches('both'),true,'PL+ENG is visible in ENG mode');
assert.equal(sourceMatches(undefined),false,'legacy PL never appears as ENG');
state.lektor.value='all';
assert.equal(sourceMatches('original'),true,'all mode includes ENG');
assert.equal(sourceMatches('lektor'),true,'all mode includes PL');
assert.equal(sourceMatches('both'),true,'all mode includes dual-language libraries');
state.kind='media';
assert.equal(context.fitsSearch({anime:false,anime_source:'',type:'Movie'},state),true,
  'media search must not be constrained by anime audio filter');
assert.match(source,/displaySearchCatalog\(state,data,force && state\.pool\.length>0\)/,
  'manual refresh must keep genre selections and scroll position');
assert.match(source,/lektor\.value='lektor'/,'default and reset select Polish voice-over');
console.log('PASS v0.4.105: three audio modes and dual-role anime, default PL, media unaffected, manual filters preserved');
