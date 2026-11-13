'use strict';
// Behavioral browser fixture. The client never calls the real Simkl API here.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/simkl.js'),'utf8');
const user='1234567890abcdef1234567890abcdef',series='a'.repeat(32),season='b'.repeat(32),episode='c'.repeat(32),movie='d'.repeat(32);
class Node {
 constructor(tag){this.tagName=tag;this.className='';this.textContent='';this.children=[];this.listeners={};this.dataset={};this.isConnected=true;this.hidden=false;this.checked=false;this.value='';}
 append(...items){for(const n of items){n.isConnected=true;this.children.push(n);}}
 replaceChildren(...items){this.children=[];this.append(...items);}
 remove(){this.isConnected=false;}
 setAttribute(k,v){this[k]=v;}
 addEventListener(ev,fn){(this.listeners[ev]??=[]).push(fn);}
 querySelector(sel){return find(this,n=>n.className?.split(' ').includes(sel.slice(1)));}
 closest(sel){return sel==='#itemDetailPage'?page:null;}
 getClientRects(){return [1];}
 async press(){for(const fn of this.listeners.click||[])await fn({target:this,preventDefault(){}});}
 async submit(){for(const fn of this.listeners.submit||[])await fn({target:this,preventDefault(){}});}
}
function find(root,filter){if(filter(root))return root;for(const c of root.children){const match=find(c,filter);if(match)return match;}return null;}
function byLabel(root,label){return find(root,n=>n.textContent===label);}
function fixture(type){
 const id=type==='Movie'?movie:episode;
 const page=new Node('div');page.dataset.mfDetailId=id;
 const rail=new Node('div');rail.className='mf-detail-poster-rail';page.append(rail);
 const body=new Node('body');const jobs=[];let init;const calls=[];let added=false;let episodeSeen=false;
 const document={body,readyState:'loading',createElement:t=>new Node(t),addEventListener(ev,fn){if(ev==='DOMContentLoaded')init=fn;},
   querySelector(sel){if(sel==='.mf-simkl-toast')return null;return null;},
   querySelectorAll(sel){return sel==='#itemDetailPage.mf-detail-compact'?[page]:[];}};
 const browser={location:{hash:`#/details?id=${id}`},ApiClient:{getCurrentUserId(){return user;},accessToken(){return 'stub-token';}},
 setTimeout(fn){jobs.push(fn);return jobs.length;},clearTimeout(){},addEventListener(){},confirm(){return true;}};
 const metadata={Movie:{Type:'Movie'},Episode:{Type:'Episode',SeriesId:series,SeasonId:season}};
 const fetch=async(url,opt={})=>{
  if(url.startsWith('/Users/'))return {ok:true,async json(){return metadata[type];}};
  const route=url.replace('/MisioFlix/api/simkl','');calls.push({route,body:opt.body?JSON.parse(opt.body):null});
  if(route.startsWith('/item?'))return {ok:true,async json(){return type==='Movie'
      ? {relevant:true,kind:'movies',seasonNumber:null,connected:true,matched:true,hasIds:true,entry:added?{status:'plantowatch',score:0}:null}
      : {relevant:true,kind:'shows',seasonNumber:4,episodeNumber:7,episodeWatched:episodeSeen,connected:true,matched:true,hasIds:true,entry:{status:'watching',score:6}};}};
  if(route==='/update'){added=true;return {ok:true,async json(){return {saved:true};}};}
  if(route==='/episode-history'){episodeSeen=opt.body?JSON.parse(opt.body).watched:false;return {ok:true,async json(){return {saved:true};}};}
  throw Error('Unexpected route: '+route);
 };
 class MutationObserver{observe(){}}
 const env={window:browser,location:browser.location,document,fetch,MutationObserver,AbortController,URLSearchParams,console};
 vm.runInNewContext(source,env,{filename:'simkl.js',timeout:1000});
 init();jobs.shift()();
 const tick=()=>new Promise(r=>setImmediate(r));
 return {tick,rail,calls};
}
(async()=>{
 const movieView=fixture('Movie');for(let i=0;i<12;i++)await movieView.tick();
 let panel=find(movieView.rail,n=>n.className==='mf-simkl-detail-panel');assert.ok(panel);
 assert.ok(byLabel(panel,'Dodaj do Simkl'),'A movie absent from Simkl must show Add action');
 assert.equal(byLabel(panel,'Edytuj Simkl'),null,'A missing movie must not pretend to be an existing entry');
 const form=find(panel,n=>n.tagName==='form');assert.ok(form);
 await form.submit();for(let i=0;i<12;i++)await movieView.tick();
 const update=movieView.calls.find(c=>c.route==='/update');assert.ok(update);
 assert.equal(update.body.catalogId,movie);assert.equal(update.body.createIfMissing,true);
 assert.equal(update.body.changeStatus,true);assert.equal(update.body.status,'plantowatch');
 assert.equal(update.body.changeScore,false,'No accidental 0/10 rating should be written');
 assert.ok(!movieView.calls.some(c=>c.route==='/season-history'||c.route==='/episode-history'));
 console.log('PASS 0.4.49: missing movie -> explicit Add to Simkl status, no hidden rating');
 const episodeView=fixture('Episode');for(let i=0;i<12;i++)await episodeView.tick();
 panel=find(episodeView.rail,n=>n.className==='mf-simkl-detail-panel');assert.ok(panel);
 assert.ok(episodeView.calls.some(c=>c.route.includes(`catalogId=${series}`)&&c.route.includes(`seasonId=${season}`)&&c.route.includes(`episodeId=${episode}`)));
 const status=find(panel,n=>n.className==='mf-simkl-episode-select');assert.ok(status);
 assert.equal(status.value,'false','Default Simkl episode status is unwatched');
 assert.ok(byLabel(panel,'Status'));
 assert.equal(byLabel(panel,'Edytuj odcinek 7 w Simkl'),null);
 assert.equal(byLabel(panel,'Edytuj sezon 4 w Simkl'),null);
 assert.equal(byLabel(panel,'Edytuj Simkl'),null);
 assert.equal(find(panel,n=>n.className==='mf-simkl-rewatch'),null);
 status.value='true';await status.listeners.change[0]();for(let i=0;i<12;i++)await episodeView.tick();
 const write=episodeView.calls.find(c=>c.route==='/episode-history');assert.ok(write);
 assert.equal(write.body.catalogId,series);assert.equal(write.body.seasonId,season);assert.equal(write.body.episodeId,episode);assert.equal(write.body.watched,true);
 assert.ok(!episodeView.calls.some(c=>c.route==='/update'||c.route==='/season-history'), 'Episode must never update a whole show or season');
 console.log('PASS 0.4.50: episode view -> one Status dropdown, automatic single episode update');
})().catch(e=>{console.error(e);process.exitCode=1;});
