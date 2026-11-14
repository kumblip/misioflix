'use strict';
// Display-only MAL mixed-frame regression. No MAL server or Jellyfin playback writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web');
let source=fs.readFileSync(path.join(src,'mal.js'),'utf8');
source=source.replace('  function tick(){',`  window.__malTest={
    setUser:id=>{currentUser=id;},
    resetUser:onUserSwitch,
    forceResume:()=>{malResumeReadAt=0;return refreshMalResume();},
    decorate:decorateMalCards,
    resuming:malHasActiveResume,
    current:()=>({catalogs:[...malResumeCatalogs],seasons:[...malResumeSeasons].map(([k,v])=>[k,[...v]])})
  };
  function tick(){`);
assert(source.includes('window.__malTest'), 'Expose test hooks in VM only');
const user1='1'.repeat(32),user2='2'.repeat(32),series='a'.repeat(32),movie='b'.repeat(32),unrelated='c'.repeat(32);
const entries={
  101:{my_list_status:{status:'completed',score:8}},
  102:{my_list_status:{status:'completed',score:9}},
  103:{my_list_status:{status:'watching',score:0}},
};
let activeUser=user1;
const store=new Map([[`misioflix-mal-index-v2:${user1}`,JSON.stringify({entries,full:true})]]);
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k),get length(){return store.size;},key:i=>[...store.keys()][i]};
function card(id,malId,{parent=null,season=null}={}){
 const attrs=new Map([['data-id',id],['data-mf-watch','unknown']]);
 if(parent!==null){attrs.set('data-mf-mal-series',parent);attrs.set('data-mf-mal-season',String(season));}
 return {
  dataset:{mfMalId:String(malId)},classList:{contains:()=>false},
  getAttribute:k=>attrs.get(k)??null,setAttribute:(k,v)=>attrs.set(k,String(v)),removeAttribute:k=>attrs.delete(k),
  frame:()=>attrs.get('data-mf-mal-frame'),state:()=>attrs.get('data-mf-watch')
 };
}
const s1=card('d'.repeat(32),101,{parent:series,season:1});
const s2=card('e'.repeat(32),101,{parent:series,season:2});
const film=card(movie,102);
const watching=card(unrelated,103);
const all=[s1,s2,film,watching];
const fakeDoc={readyState:'loading',addEventListener(){},querySelector(){return all[0];},querySelectorAll(selector){
 if(selector.includes('.mf-home-poster[data-mf-item-id]'))return all;
 return [];
}};
const events=[];
const browser={ApiClient:{getCurrentUserId:()=>activeUser,accessToken:()=> 'token'},
 location:{hash:'#/home'},addEventListener(){},dispatchEvent:e=>events.push(e.type),setTimeout:()=>1,clearTimeout(){}};
let payload={items:[
 {catalog_id:series,season:1,position_ticks:200,next_up:false},
 {catalog_id:movie,position_ticks:100,next_up:false},
 {catalog_id:unrelated,season:2,position_ticks:0,next_up:true},
 ],hidden:[{catalog_id:'f'.repeat(32),position_ticks:400,next_up:false}]};
let fetchCount=0;
const fakeFetch=async(url,opts)=>{
 assert.equal(url,'/MisioFlix/api/resume');
 assert.ok(!opts.method || opts.method==='GET');
 assert.equal(opts.cache,'no-store');fetchCount++;
 return {ok:true,json:async()=>payload};
};
vm.runInNewContext(source,{window:browser,document:fakeDoc,location:browser.location,
 fetch:fakeFetch,localStorage,URLSearchParams,AbortController,Event:class{constructor(type){this.type=type;}},console},
 {filename:'mal.js',timeout:1000});
(async()=>{
 browser.__malTest.setUser(user1);
 browser.__malTest.decorate();
 assert.equal(s1.state(),'watched');
 assert.equal(s1.frame(),undefined,'MAL completed alone must be green');
 await browser.__malTest.forceResume();
 assert.equal(s1.frame(),'mixed','Only the resumed season becomes gold/green');
 assert.equal(s2.frame(),undefined,'Other completed season stays green');
 assert.equal(s2.state(),'watched');
 assert.equal(film.frame(),'mixed','Completed anime movie + resume becomes mixed');
 assert.equal(watching.frame(),undefined,'An ongoing MAL anime never becomes mixed');
 assert.equal(watching.state(),'started');
 assert.equal(browser.__malTest.resuming('f'.repeat(32)),false,'Hidden resume excluded');
 payload={items:[],hidden:[]};
 await browser.__malTest.forceResume();
 assert.equal(s1.frame(),undefined,'After actual resume ends the frame returns green');
 assert.equal(film.frame(),undefined);
 activeUser=user2;browser.__malTest.resetUser();
 browser.__malTest.decorate();
 assert.equal(s1.state(),'unknown','Never display previous user MAL status');
 assert.equal(s1.frame(),undefined,'Mixed frame must not survive user switch');
 assert.equal(fetchCount,2);
 const css=fs.readFileSync(path.join(src,'mal-frames.css'),'utf8');
 assert(css.includes('data-mf-mal-frame="mixed"'));
 assert(css.includes('.mf-detail-poster-rail > .detailImageContainer'));
 assert(!css.includes('data-mf-simkl-watch')&&!css.includes('mf-simkl-episode-row'));
 const asset=fs.readFileSync(path.resolve(src,'../Services/ScriptInjection.cs'),'utf8');
 assert(asset.includes('assets/mal-frames.css?v='));
 console.log('PASS v0.4.61 MAL split borders: season-scoped, actual resume only, watched-only, per-user, CSS isolated');
})().catch(err=>{console.error(err);process.exitCode=1;});
