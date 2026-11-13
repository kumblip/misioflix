'use strict';
// Behavioral frontend smoke test: manual season actions must never call the
// whole-series /update endpoint. All API responses are local fixtures.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/simkl.js'),'utf8');
const user='1234567890abcdef1234567890abcdef',series='a'.repeat(32),seasonId='b'.repeat(32);
class Node{
  constructor(tag){this.tagName=tag;this.className='';this.textContent='';this.children=[];this.listeners={};this.dataset={};this.isConnected=true;this.hidden=false;this.checked=false;}
  append(...nodes){for(const n of nodes){n.isConnected=true;this.children.push(n);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  remove(){this.isConnected=false;}
  setAttribute(k,v){this[k]=v;}
  addEventListener(event,handler){(this.listeners[event]??=[]).push(handler);}
  querySelector(selector){return find(this,n=>n.className.split(' ').includes(selector.slice(1)));}
  closest(selector){return selector==='#itemDetailPage'?page:null;}
  getClientRects(){return [1];}
  async press(){for(const handler of this.listeners.click||[])await handler({target:this,preventDefault(){}});}
}
function find(root,filter){if(filter(root))return root;for(const child of root.children){const found=find(child,filter);if(found)return found;}return null;}
function byLabel(root,label){return find(root,n=>n.textContent===label);}
const page=new Node('div');page.dataset.mfDetailId=seasonId;
const rail=new Node('div');rail.className='mf-detail-poster-rail';page.append(rail);
const body=new Node('body');const jobs=[];let init;const calls=[];
const document={body,readyState:'loading',createElement:t=>new Node(t),addEventListener(event,handler){if(event==='DOMContentLoaded')init=handler;},
 querySelector(sel){if(sel==='.mf-simkl-toast')return null;return null;},
 querySelectorAll(sel){return sel==='#itemDetailPage.mf-detail-compact'?[page]:[];}};
const browser={location:{hash:`#/details?id=${seasonId}`},ApiClient:{getCurrentUserId(){return user;},accessToken(){return 'test-token';}},
 setTimeout(cb){jobs.push(cb);return jobs.length;},clearTimeout(){},addEventListener(){},confirm(){return true;}};
const data={relevant:true,kind:'shows',seasonNumber:2,hasIds:true,connected:true,matched:true,
 entry:{kind:'shows',status:'watching',score:8,watchedEpisodes:24,totalEpisodes:200},
 episodeNumbers:[1,2,3],watchedEpisodeNumbers:[1]};
const fetch=async(url,opt={})=>{
 if(url.startsWith('/Users/'))return {ok:true,async json(){return {Type:'Season',SeriesId:series};}};
 const route=url.replace('/MisioFlix/api/simkl','');
 calls.push({route,body:opt.body?JSON.parse(opt.body):null});
 if(route.startsWith('/item?'))return {ok:true,async json(){return data;}};
 if(route==='/season-history')return {ok:true,async json(){return {saved:true};}};
 throw Error('Unexpected route '+route);
};
class MutationObserver{observe(){}}
const env={window:browser,location:browser.location,document,fetch,MutationObserver,AbortController,URLSearchParams,console};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 vm.runInNewContext(source,env,{filename:'simkl.js',timeout:1000});
 init();jobs.shift()();
 for(let i=0;i<12;i++)await tick();
 const view=find(rail,n=>n.className==='mf-simkl-detail-panel');assert.ok(view);
 const editor=byLabel(view,'Edytuj sezon 2 w Simkl');assert.ok(editor);
 assert.equal(byLabel(view,'Edytuj Simkl'),null,'Season must not inherit global ratings editor');
 const watched=byLabel(view,'Oznacz sezon jako obejrzany');assert.ok(watched);
 await watched.press();for(let i=0;i<10;i++)await tick();
 const posted=calls.find(c=>c.route==='/season-history');assert.ok(posted);
 assert.equal(posted.body.catalogId,series);assert.equal(posted.body.seasonId,seasonId);
 assert.equal(posted.body.watched,true);assert.equal(posted.body.episodeNumbers,null);
 assert.ok(!calls.some(c=>c.route==='/update'),'Season must never write whole-show status/rating');
 assert.equal(calls.filter(c=>c.route==='/season-history').length,1);
 const notWatched=byLabel(view,'Oznacz sezon jako nieobejrzany');
 assert.ok(notWatched,'Bulk unwatch button renders');
 console.log('PASS v0.4.48: season editor bulk write targets season only; whole-series editor absent');
})().catch(error=>{console.error(error);process.exitCode=1;});
