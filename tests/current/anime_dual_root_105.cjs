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
  typeStates:new Map(),genreStates:new Map(),input:{value:''},lektor:{checked:true}};
function sourceMatches(source){return context.fitsSearch({anime:true,anime_source:source,type:'Series'},state)}
assert.equal(sourceMatches('lektor'),true,'PL anime visible by default');
assert.equal(sourceMatches('original'),false,'EN anime hidden by default');
assert.equal(sourceMatches(undefined),true,'legacy cached items remain PL');
state.lektor.checked=false;
assert.equal(sourceMatches('original'),true,'unchecked selects original audio');
assert.equal(sourceMatches('lektor'),false,'unchecked hides PL library');
assert.equal(sourceMatches(undefined),false,'legacy PL never appears as EN');
state.kind='media';
assert.equal(context.fitsSearch({anime:false,anime_source:'',type:'Movie'},state),true,
  'media search must not be constrained by anime audio filter');
assert.match(source,/displaySearchCatalog\(state,data,force && state\.pool\.length>0\)/,
  'manual refresh must keep genre selections and scroll position');
assert.match(source,/lektor\.checked=true/,'default and reset select Polish voice-over');
console.log('PASS v0.4.105: two mutually exclusive anime roots, default PL, media unaffected, manual filters preserved');
