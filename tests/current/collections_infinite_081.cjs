// v0.4.81: run the actual Collections lazy loader with a fake Jellyfin backend.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const i=source.indexOf('  function createCollectionsPage(){');
const j=source.indexOf('  function hero(shortcuts){',i);
assert(i>=0 && j>i,'Real Collections methods found');
const create=(tag,cls='',label='')=>({tag,cls,textContent:String(label),hidden:false,isConnected:true,children:[],listeners:{},
  appendChild(e){this.children.push(e);return e},append(...e){this.children.push(...e)},
  replaceChildren(...e){this.children=[...e]},addEventListener(type,callback){this.listeners[type]=callback},
  setAttribute(k,v){this[k]=v},getBoundingClientRect(){return {top:10000}},get childElementCount(){return this.children.length}});
let requests=[], calls=0, observer;
const ctx={own:create,set:(n,k,v)=>{n[k]=v;return n},append:(n,...xs)=>{n.append(...xs);return n},
  collectionsRoute:()=>true,homeRoot:{isConnected:true},collectionsLoad:{busy:false,loaded:false,offset:0,hasMore:true,requestId:0},
  collectionsPage:null,isCurrent:()=>true,epoch:1,
  request:async url=>{calls++;requests.push(url);const start=Number(new URLSearchParams(url.split('?')[1]).get('startIndex'));
    const count=Math.min(24,53-start);
    return {items:Array.from({length:count},(_,i)=>({type:'BoxSet',id:start+i})),hasMore:start+count<53};},
  makeCard:item=>({card:item.id}),window:{innerHeight:900},requestAnimationFrame:()=>{},
  IntersectionObserver:class{constructor(cb){this.cb=cb;observer=this}observe(element){this.element=element}disconnect(){this.disconnected=true}}};
vm.createContext(ctx);vm.runInContext(source.slice(i,j),ctx);
ctx.collectionsPage=ctx.createCollectionsPage();ctx.observeCollectionsFeed();
assert(observer.element===ctx.collectionsPage.feed,'Observer watches directory sentinel');
(async()=>{
 await ctx.loadCollectionsPage(true);
 assert.equal(ctx.collectionsLoad.offset,24);
 assert.equal(ctx.collectionsPage.grid.children.length,24);
 assert.equal(ctx.collectionsLoad.hasMore,true);
 assert.equal(ctx.collectionsPage.feed.hidden,false);
 assert.equal(ctx.collectionsPage.retry.hidden,true);
 // Two concurrent calls must not fetch the same page twice.
 await Promise.all([ctx.loadCollectionsPage(false),ctx.loadCollectionsPage(false)]);
 assert.equal(ctx.collectionsLoad.offset,48);
 assert.equal(ctx.collectionsPage.grid.children.length,48);
 assert.equal(calls,2,'only two network pages requested');
 await ctx.loadCollectionsPage(false);
 assert.equal(ctx.collectionsLoad.offset,53);
 assert.equal(ctx.collectionsPage.grid.children.length,53);
 assert.equal(ctx.collectionsPage.feed.hidden,true,'sentinel hidden after exhaustion');
 await ctx.loadCollectionsPage(false);
 assert.equal(calls,3,'exhausted directory must not request more');
 assert(requests.every(q=>q.includes('limit=24')),'server-side paging retained');
 console.log('PASS v0.4.81: Collections paged 24+24+5, no duplicate requests, stops correctly');
})().catch(e=>{console.error(e);process.exitCode=1});
