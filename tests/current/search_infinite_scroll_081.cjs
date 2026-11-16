// v0.4.81 regression: test real pagination functions, not a reimplementation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
function cut(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert(i>=0&&j>i,`Missing anchors ${a}, ${b}`);return src.slice(i,j)}
const jobs=[];
const make=()=>({children:[],hidden:false,textContent:'',isConnected:true,appendChild(x){this.children.push(x);return x},replaceChildren(...x){this.children=[...x]}});
const overlay=make(), grid=make(), feed=make(), status=make(), scroller={scrollTop:0,scrollHeight:3900,clientHeight:720};
const items=Array.from({length:74},(_,i)=>({id:i,title:`Anime ${i}`,type:'Series'}));
const state={kind:'anime',pool:items,input:{value:'ani'},matches:[],grid,feed,status,overlay,scroller,
  watchMode:0,shown:0,loadQueued:false};
const context={activeSearch:state,requestAnimationFrame:f=>jobs.push(f),fitsSearch:()=>true,
  makeCard:item=>({id:item.id}),searchTile:x=>x,
  own:(tag,cls,text)=>({tag,cls,text}),suggestSearch:()=>{}};
vm.createContext(context);
vm.runInContext(cut('  function paintSearchResults(state){','  // The server reads <tag>Typ:'),context);
context.paintSearchResults(state);
assert.equal(state.shown,30,'first batch size');
assert.equal(grid.children.length,30,'only first 30 cards in DOM');
assert.equal(feed.hidden,false,'more results available');
assert.equal(src.includes('mf-home-search-more\'\,\'Pokaż kolejne'),false,'no manual show-more action');
while(jobs.length)jobs.shift()(); // viewport is not near the bottom
assert.equal(state.shown,30);
scroller.scrollTop=3300;context.queueSearchAutoLoad(state);
assert.equal(jobs.length,1,'scroll event schedules exactly one request');
context.queueSearchAutoLoad(state);
assert.equal(jobs.length,1,'rapid scroll is throttled');
jobs.shift()();
assert.equal(state.shown,60,'scroll loads only next batch');
assert.equal(grid.children.length,60);
// Clear the queued next-frame check: still not near the end after DOM grows.
scroller.scrollHeight=8500;
while(jobs.length)jobs.shift()();
assert.equal(state.shown,60);
scroller.scrollTop=8200;context.queueSearchAutoLoad(state);
while(jobs.length)jobs.shift()();
assert.equal(state.shown,74,'final batch');
assert.equal(grid.children.length,74);
assert.equal(feed.hidden,true,'no sentinel after last result');
context.queueSearchAutoLoad(state);
assert.equal(jobs.length,0,'no further loading when finished');
assert.match(status.textContent,/pokazano 74/);
// Filter mutation rebuilds from the first batch; stale queued callback after close is inert.
items.length=3;context.paintSearchResults(state);
assert.equal(grid.children.length,3);
assert.equal(feed.hidden,true);
console.log('PASS v0.4.81: 30-item lazy batches, scroll threshold, reentrancy protection, exhausted feed and filter reset');
