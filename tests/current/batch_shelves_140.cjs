'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const a=src.indexOf('  function acceptShelfResponse(row,data,mode,start){');
const b=src.indexOf('  async function loadShelf(row,mode,reset){',a);
assert(a>0&&b>a);
const guid=n=>n.toString(16).padStart(32,'0');
function scroll(){return {children:[],scrollLeft:12,replaceChildren(...kids){this.children=kids},appendChild(v){this.children.push(v)},get childElementCount(){return this.children.length}};}
const mkrow=(id)=>({lib:{id},busy:false,offset:0,hasMore:false,section:{isConnected:true},scroll:scroll(),shuffle:{disabled:false,classList:{toggle(){}}},reset:{disabled:false,classList:{toggle(){}}}});
const rows=[mkrow(guid(1)),mkrow(guid(2)),mkrow('collections')];
let requests=[],fallback=[],deny=false,fail=false;
const ctx={epoch:3,isCurrent:serial=>serial===3,makeCard:item=>({item}),
  own:(tag,cls,title)=>({tag,cls,title}),
  validId:id=>/^[0-9a-f]{32}$/.test(id),compactId:id=>id,
  request:async url=>{
    requests.push(url);
    if(fail)throw Error('batch temporarily unavailable');
    const ids=decodeURIComponent(url.split('ids=')[1]).split(',');
    return ids.filter(id=>!deny||id!==guid(2)).map(libraryId=>({libraryId,
      items:Array.from({length:10},(_,index)=>({id:index})),nextStartIndex:10,hasMore:true}));
  },loadShelf:async(row)=>{fallback.push(row.lib.id)}
};
vm.createContext(ctx);
vm.runInContext(src.slice(a,b),ctx);
(async()=>{
  await ctx.loadInitialShelfRowsBatch(rows);
  assert.equal(requests.length,1,'one batch HTTP request for two user-visible libraries');
  assert.equal(rows[0].scroll.children.length,10);
  assert.equal(rows[1].scroll.children.length,10);
  assert.equal(rows[0].offset,10);
  assert.deepEqual(fallback,['collections'],'global collections remain distinct');
  assert.equal(rows[0].busy,false);
  fallback=[];deny=true;
  await ctx.loadInitialShelfRowsBatch(rows);
  assert.deepEqual(fallback,[guid(2),'collections'],'omitted/unauthorized IDs require independent revalidation');
  fallback=[];fail=true;
  await ctx.loadInitialShelfRowsBatch(rows);
  assert.deepEqual(fallback,[guid(1),guid(2),'collections'],'batch API failure preserves original shelf fallback');
  console.log('PASS 0.4.140 batch shelves: first ten, user-scope omissions, fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});
