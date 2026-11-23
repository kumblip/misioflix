'use strict';
// Dynamic regression: Home libraries and collection shelves load 10 once, then 25
// per scroll request. The existing five-title shuffle stays unchanged.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync('src/Jellyfin.Plugin.MisioFlix/Web/home.js','utf8');
const a=src.indexOf('  async function loadShelf(row,mode,reset){');
const b=src.indexOf('  // v0.4.22:',a);
assert(a>0&&b>a);
class Box {
  constructor(){this.isConnected=true;this.children=[];this.childElementCount=0;this.scrollLeft=7;}
  replaceChildren(...kids){this.children=kids;this.childElementCount=this.children.length;}
  appendChild(child){this.children.push(child);this.childElementCount=this.children.length;}
}
const calls=[];
const ctx={
  SHELF_LIMIT:10,SHELF_MORE_LIMIT:25,RANDOM_LIMIT:5,epoch:10,
  homeRoot:{isConnected:true},isCurrent:serial=>serial===10,
  own:(tag,cls,label)=>({tag,cls,label,appendChild(){},addEventListener(){}}),
  makeCard:item=>({item}),
  request:async url=>{
    const qs=new URLSearchParams(url.split('?')[1]);
    const start=Number(qs.get('startIndex'));
    const limit=Number(qs.get('limit'));
    const random=qs.get('mode')==='random';
    calls.push({start,limit,random,url});
    const n=random?5:Math.min(limit,90-start);
    return {items:Array.from({length:n},(_,i)=>({id:start+i})),hasMore:!random&&start+n<90};
  }
};
vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
const row=(category='anime',id='a'.repeat(32))=>({lib:{id,category},mode:'latest',offset:0,hasMore:false,busy:false,
  scroll:new Box(),section:{isConnected:true},shuffle:{disabled:false,classList:{toggle(){}}},reset:{disabled:false,classList:{toggle(){}}}});
(async()=>{
  for(const category of ['anime','collections']){
    const r=row(category,category==='collections'?'collections':'a'.repeat(32));const begin=calls.length;
    await ctx.loadShelf(r,'latest',true);
    assert.equal(r.scroll.children.length,10);
    assert.equal(r.offset,10);
    await ctx.loadShelf(r,'latest',false);
    assert.equal(r.scroll.children.length,35);
    assert.equal(r.offset,35);
    await ctx.loadShelf(r,'latest',false);
    assert.equal(r.scroll.children.length,60);
    assert.equal(r.offset,60);
    assert.deepEqual(calls.slice(begin).map(x=>[x.start,x.limit]),[[0,10],[10,25],[35,25]]);
    if(category==='collections')assert(calls.at(-1).url.startsWith('/home/collections?'));
    else assert(calls[begin].url.startsWith('/home/shelf?'));
    const c=calls.length;
    await ctx.loadShelf(r,'random',true);
    assert.deepEqual(calls.slice(c).map(x=>[x.start,x.limit]),[[0,5]]);
    assert.equal(r.scroll.children.length,5);
  }
  // The real Jellyfin BoxSets library must not be redirected to global collections.
  const physical=row('collections','f'.repeat(32));
  await ctx.loadShelf(physical,'latest',true);
  assert(calls.at(-1).url.startsWith('/home/shelf?libraryId='+'f'.repeat(32)),
         'Physical collections use their own scoped library ID');
  console.log('PASS: library, global collections and physical collection shelves route independently');
})().catch(err=>{console.error(err);process.exitCode=1});
