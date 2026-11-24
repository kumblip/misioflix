'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const code=src.slice(src.indexOf('  // v0.4.148: only MisioFlix-owned artwork.'),src.indexOf('  function ensureHomeCollectionPreviewObserver(){'));
function harness(observer=true){
  const timers=new Map();let serial=0,io;
  class Observer{
    constructor(fn,opts){this.fn=fn;this.opts=opts;this.targets=new Set();io=this;}
    observe(img){this.targets.add(img);}
    unobserve(img){this.targets.delete(img);}
    emit(entries){this.fn(entries.map(([target,isIntersecting])=>({target,isIntersecting})));}
  }
  const ctx={window:{innerWidth:900,innerHeight:600,devicePixelRatio:1,setTimeout(fn){timers.set(++serial,fn);return serial;},clearTimeout(id){timers.delete(id);}},IntersectionObserver:observer?Observer:undefined,Event:class{constructor(type){this.type=type;} }};
  vm.createContext(ctx);vm.runInContext(code,ctx);
  return {ctx,timers,io:()=>io,waiting:()=>vm.runInContext('posterWaiting.size',ctx),active:()=>vm.runInContext('posterActive.size',ctx)};
}
class Img{
  constructor(x=0,y=0,w=160,h=240){this.isConnected=true;this.listeners=new Map();this.rect={left:x,top:y,right:x+w,bottom:y+h,width:w,height:h};this.src='';this.writes=0;this.errors=0;}
  getBoundingClientRect(){return this.rect;}
  closest(){return this.rail||null;}
  set src(v){this._src=v;this.writes=(this.writes||0)+1;}
  get src(){return this._src;}
  addEventListener(k,fn){if(!this.listeners.has(k))this.listeners.set(k,new Set());this.listeners.get(k).add(fn);}
  removeEventListener(k,fn){this.listeners.get(k)?.delete(fn);}
  dispatchEvent(e){if(e.type==='error')this.errors++;for(const fn of [...(this.listeners.get(e.type)||[])])fn(e);}
  removeAttribute(k){if(k==='src')this._src='';}
}
const url='/Items/'+'a'.repeat(32)+'/Images/Primary?maxHeight=480&quality=84';
const h=harness(),c=h.ctx;
assert.equal(c.posterSizedUrl(url,{width:100,height:150},1),url.replace('480','320'));
assert.equal(c.posterSizedUrl(url,{width:200,height:300},1),url.replace('480','320'));
assert.equal(c.posterSizedUrl(url,{width:200,height:300},2),url.replace('480','640'));
assert.equal(c.posterSizedUrl(url,{width:200,height:300},4),url.replace('480','640'));
assert.equal(c.posterSizedUrl(url,{width:0,height:0},2),url);
assert.equal(c.posterSizedUrl(url,{width:0,height:0},2),url);
const far=new Img(1200),visible=Array.from({length:7},(_,i)=>new Img(i*50)),outside=new Img(0,6000);
const clipped=new Img(700);clipped.rail={getBoundingClientRect:()=>({left:0,right:600,top:0,bottom:400})};
for(const img of [far,clipped,...visible,outside])c.queuePoster(img,url);
assert.equal(h.active(),0);assert.equal(h.waiting(),10);assert.equal(far.src,'');
assert.equal(h.io().opts.scrollMargin,'0px 640px');
h.io().emit([far,clipped,...visible].map(i=>[i,true]));
assert.equal(h.active(),6);assert(visible.slice(0,6).every(i=>i.src.includes('maxHeight=320')));assert.equal(visible[6].src,'');assert.equal(far.src,'');assert.equal(clipped.src,'');
visible[0].dispatchEvent({type:'load'});assert.equal(h.active(),6);assert(visible[6].src);assert.equal(clipped.src,'');
h.io().emit([[far,false]]);visible[1].dispatchEvent({type:'error'});assert(clipped.src);assert.equal(far.src,'');assert.equal(h.active(),6);
// Leaving the near range before a slot opens avoids stale speculative work.
clipped.isConnected=false;outside.isConnected=false;c.prunePosterQueue();assert.equal(clipped.src,'');assert(!h.io().targets.has(outside));assert.equal(h.active(),5);assert.equal(h.waiting(),1);
h.io().emit([[far,true]]);assert(far.src);assert.equal(h.active(),6);
// Moving/reusing an existing connected tile never schedules it again.
const before=visible[2].writes;c.prunePosterQueue();assert.equal(visible[2].writes,before);
// Watchdog releases the slot and invokes the existing artwork error path.
const timer=h.timers.values().next().value;timer();assert.equal(h.active(),5);assert.equal(visible[2].src,'');assert.equal(visible[2].errors,1);
// Native lazy fallback for legacy WebViews without IntersectionObserver.
const legacy=harness(false),old=new Img();legacy.ctx.queuePoster(old,url);assert.equal(old.loading,'lazy');assert.equal(old.src,url);assert.equal(legacy.active(),0);
console.log('PASS 0.4.148: responsive poster URL, six slots, visibility priority, horizontal clip, stale prefetch, detached cancellation, reuse, timeout and legacy fallback');
