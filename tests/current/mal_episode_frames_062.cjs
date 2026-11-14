'use strict';
// Run the real MAL episode-frame functions with an isolated simulated Jellyfin DOM.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web');
let code=fs.readFileSync(path.join(dir,'mal.js'),'utf8');
code=code.replace('  function tick(){',`  window.__malEpisodeTest={
    setUser:id=>{currentUser=id;},
    setSession:s=>{currentDetail=s.id;detailSessions.set(s.key,s);},
    resume:ids=>{malResumeEpisodes=new Set(ids);},
    refreshResume:()=>{malResumeReadAt=0;return refreshMalResume();},
    render:decorateMalEpisodeFrames,
    index:malSeasonEpisodeIndex,
    clear:clearMalEpisodeFrames
  };
  function tick(){`);
assert(code.includes('window.__malEpisodeTest'));
const user='1'.repeat(32),other='2'.repeat(32),series='a'.repeat(32),season='b'.repeat(32);
const ids=['c','d','e','f'].map(x=>x.repeat(32));
function makeRow(id,label){
 const attrs=new Map(id?[['data-id',id]]:[]),classes=new Set(['listItem']),children=[];
 const row={attrs,children,classes,
   classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},
   getAttribute:key=>attrs.get(key)??null,
   setAttribute:(key,value)=>attrs.set(key,String(value)),
   removeAttribute:key=>attrs.delete(key),
   querySelector(selector){
     if(selector.includes(':scope > .mf-mal-episode-frame'))return children.find(child=>child.className==='mf-mal-episode-frame')||null;
     if(selector.includes('.listItemBodyText'))return {textContent:label};
     return null;
   },
   querySelectorAll(){return [];},
   append(child){children.push(child);child.remove=()=>{const i=children.indexOf(child);if(i>=0)children.splice(i,1);};},
   get state(){return attrs.get('data-mf-mal-episode-watch');}
 };
 return row;
}
const row1=makeRow(ids[0],'1. Odcinek 1'),row2=makeRow(null,'2. Odcinek 2'),row3=makeRow(ids[2],'3. Odcinek 3'),row4=makeRow(ids[3],'4. Odcinek 4'),foreign=makeRow('9'.repeat(32),'1. Obcy odcinek');
const rows=[row1,row2,row3,row4,foreign];
const area={querySelectorAll(selector){assert(selector.includes('.listItem'));return rows;}};
const page={isConnected:true,dataset:{mfDetailId:season},getClientRects:()=>[1],
 classList:{contains:()=>false},
 querySelector:selector=>selector==='.mf-detail-series-sections'?area:null};
const doc={readyState:'loading',addEventListener(){},
 querySelector:selector=>selector.includes('#itemDetailPage.mf-detail-mal-rating')?page:null,
 createElement(tag){return {className:'',tagName:tag,setAttribute(name,value){this[name]=value;}};},
 querySelectorAll(selector){
   if(selector==='#itemDetailPage.mf-detail-compact')return [page];
   if(selector==='.mf-mal-episode-row')return rows.filter(row=>row.classes.has('mf-mal-episode-row'));
   return [];
 }};
const browser={ApiClient:{getCurrentUserId:()=>user,accessToken:()=> 'token'},location:{hash:'#/details?id='+season},
 setTimeout:()=>1,clearTimeout(){},addEventListener(){},dispatchEvent(){}};
let reads=0;
const fetch=async(url,options)=>{
 if(url==='/MisioFlix/api/resume'){
   assert.equal(options.cache,'no-store');
   return {ok:true,json:async()=>({items:[
     {catalog_id:series,id:ids[1],season:1,position_ticks:1500000,next_up:false},
     {catalog_id:series,id:ids[3],season:1,position_ticks:0,next_up:true}
   ],hidden:[]})};
 }
 assert(url.includes(`Shows/${series}/Episodes?`));
 assert(url.includes(`SeasonId=${season}`));
 assert(url.includes('EnableUserData=true'));
 assert.equal(options.cache,'no-store');
 assert(!options.method || options.method==='GET');
 reads++;
 return {ok:true,json:async()=>({Items:ids.map((Id,i)=>({Id,IndexNumber:i+1,UserData:{Played:i===0||i===2}}))})};
};
vm.runInNewContext(code,{document:doc,window:browser,location:browser.location,fetch,URLSearchParams,
  localStorage:{},console,AbortController}, {filename:'mal.js',timeout:1500});
(async()=>{
 const t=browser.__malEpisodeTest;
 t.setUser(user);
 const s={key:`${user}:${season}`,userId:user,id:season,seasonId:season,catalogId:series,phase:'ready',animeVerified:true,
   entry:{my_list_status:{status:'watching'}}};
 t.setSession(s);t.resume([ids[1],ids[2]]);
 t.render();await t.index(s).promise;t.render();
 assert.equal(row1.state,'watched','Jellyfin played flag -> green');
 assert.equal(row2.state,'started','Unwatched with real resume -> gold, exact episode number fallback');
 assert.equal(row3.state,'mixed','Played with real resume -> gold/green');
 assert.equal(row4.state,'unwatched','Unwatched and not resumed -> pink');
 assert.equal(foreign.state,undefined,'Foreign episode GUID must never receive a border');
 assert.equal(reads,1,'Single read of exact current season');
 for(const row of rows.slice(0,4))assert.equal(row.children.length,1,'One overlay per row only');
 t.render();assert.equal(reads,1,'Repeated DOM render does not refetch');
 s.entry={my_list_status:{status:'completed'}};t.resume([ids[1]]);t.render();
 assert.equal(row2.state,'mixed','Completed MAL season + resumed episode -> split frame');
 assert.equal(row4.state,'watched','MAL completed season must mark Jellyfin-unplayed episodes green VISUALLY');
 assert.equal(row1.state,'watched','Already-played episode is still green');
 assert.equal(row3.state,'watched','Previously resumed watched episode returns green without resume');
 t.resume([]); await t.refreshResume();t.render();
 assert.equal(row2.state,'mixed','Actual Jellyfin /api/resume entry paints only the matching MAL-completed episode gold/green');
 assert.equal(row4.state,'watched','A NextUp suggestion must never change MAL-completed episode from green');
 assert.equal(row1.state,'watched','Other MAL-completed episodes remain green');
 t.clear();for(const row of rows.slice(0,4)){
   assert.equal(row.state,undefined);assert.equal(row.children.length,0);
 }
 const css=fs.readFileSync(path.join(dir,'mal-frames.css'),'utf8');
 for(const status of ['unwatched','started','watched','mixed'])assert(css.includes(`data-mf-mal-episode-watch="${status}"`));
 assert(css.includes('.mf-detail-series-sections .mf-mal-episode-row'));
 assert(css.includes('pointer-events:none'));
 assert(!css.includes('mf-simkl-episode-row'));
 console.log('PASS v0.4.63: MAL completed wins on all season episodes; real resumed ID -> split; NextUp ignored, read-only');
})().catch(error=>{console.error(error);process.exitCode=1;});
