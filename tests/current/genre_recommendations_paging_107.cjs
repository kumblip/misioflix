const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const start=source.indexOf('  async function loadRecommendationPage(');
const end=source.indexOf('  async function initializeRecommendations(',start);
assert(start>0&&end>start);
const func=source.slice(start,end);
class DummyNode {
  constructor(cls=''){this.className=cls;this.children=[];this.hidden=false;this.isConnected=true;this.scrollLeft=123;this.classList={add:()=>{}};this.listeners={};}
  replaceChildren(...kids){this.children=[...kids];}
  appendChild(node){this.children.push(node);}
  get childElementCount(){return this.children.length;}
  querySelector(selector){return selector==='.mf-home-card'?this.children.find(x=>x.className==='mf-home-card')||null:null;}
  querySelectorAll(cls){return cls==='.mf-home-empty'?this.children.filter(x=>x.className==='mf-home-empty'):[];}
  remove(){this._removed=true;}
  addEventListener(type,fn){this.listeners[type]=fn;}
}
const guid=i=>i.toString(16).padStart(32,'0');
const items=Array.from({length:37},(_,i)=>({id:guid(i+1)}));
let calls=0, fail=false;
const ctx={
  SHELF_LIMIT:10,SHELF_MORE_LIMIT:25,epoch:7,homeRoot:{isConnected:true},
  isCurrent:serial=>serial===7,
  compactId:id=>id,
  own:(tag,cls,txt)=>{const n=new DummyNode(cls);n.textContent=txt;return n;},
  makeCard:()=>{const n=new DummyNode('mf-home-card');n.querySelector=()=>({remove(){}});return n;},
  request:async uri=>{
    calls++;
    if(fail){fail=false;throw Error('network down');}
    const ids=decodeURIComponent(uri.split('ids=')[1]).split(',');
    return ids.map(id=>({id}));
  }
};
vm.createContext(ctx);
vm.runInContext(func,ctx);
function row(data){return {busy:false,hasMore:true,mode:'random',offset:0,ordered:data,scroll:new DummyNode(),section:new DummyNode(),
  shuffle:{disabled:false},reset:{disabled:false}};}
(async()=>{
  const r=row(items);
  await ctx.loadRecommendationPage(r,true);
  assert.equal(r.offset,10);
  await ctx.loadRecommendationPage(r,false);
  assert.equal(r.offset,35);
  await ctx.loadRecommendationPage(r,false);
  assert.equal(r.offset,37);
  assert.equal(r.scroll.children.filter(x=>x.className==='mf-home-card').length,37);
  assert.equal(r.hasMore,false);
  assert.equal(calls,3);
  assert.equal(r.mode,'random'); // random mode can paginate through ALL 37 entries
  const empty=row([]);
  await ctx.loadRecommendationPage(empty,true);
  assert.equal(empty.scroll.children.length,0);
  assert.equal(empty.section.hidden,true,'empty proposal must not render heading or message');
  assert.equal(r.section.hidden,false,'populated proposal remains visible');
  const failed=row(items);
  fail=true;await ctx.loadRecommendationPage(failed,true);
  assert.equal(failed.offset,0,'network failure must not skip the failed batch');
  await ctx.loadRecommendationPage(failed,false);
  assert.equal(failed.offset,25,'retry starts at the same candidate page');
  console.log('PASS v0.4.107: 37 randomized items paginated 10+25+2, empty rows, retry without gaps');
})().catch(e=>{console.error(e);process.exitCode=1;});
