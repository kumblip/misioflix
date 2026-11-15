'use strict';
// Execute the production read-only MAL episode marker on native Series details
// (not only Season details). Verify multi-season fallback cannot invent watches.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web');
const original=fs.readFileSync(path.join(dir,'mal.js'),'utf8');
const user='1'.repeat(32),series='2'.repeat(32);
const episodeA='3'.repeat(32),episodeB='4'.repeat(32),episodeC='5'.repeat(32);
const seasonA='6'.repeat(32),seasonB='7'.repeat(32);
function row(id,title){
 const attrs=new Map(id?[['data-id',id]]:[]),classes=new Set(['listItem']),children=[];
 return {attrs,classes,children,
  classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)},
  getAttribute:k=>attrs.get(k)??null,setAttribute:(k,v)=>attrs.set(k,String(v)),
  removeAttribute:k=>attrs.delete(k),querySelectorAll:()=>[],
  querySelector(k){if(k.includes(':scope > .mf-mal-episode-frame'))return children.find(x=>x.className==='mf-mal-episode-frame')||null;
   if(k.includes('.listItemBodyText'))return {textContent:title};return null;},
  append(item){children.push(item);item.remove=()=>{const at=children.indexOf(item);if(at>=0)children.splice(at,1);};},
  get state(){return attrs.get('data-mf-mal-episode-watch');}
 };
}
async function runCase(name,episodes,rows,expected,resuming=[]){
 const script=original.replace('  function tick(){',`  window.__episodeTest070={
   setUser:id=>{currentUser=id;},setSession:s=>{currentDetail=s.id;detailSessions.set(s.key,s);},
   resume:ids=>{malResumeEpisodes=new Set(ids);},render:decorateMalEpisodeFrames,
   index:malSeasonEpisodeIndex,clear:clearMalEpisodeFrames
  };function tick(){`);
 const area={querySelectorAll:()=>rows},page={isConnected:true,dataset:{mfDetailId:series},getClientRects:()=>[1],
   classList:{contains:()=>true},querySelector:sel=>sel==='.mf-detail-series-sections'?area:null};
 const doc={readyState:'loading',addEventListener(){},
  querySelectorAll:sel=>sel==='#itemDetailPage.mf-detail-compact'?[page]:sel==='.mf-mal-episode-row'?rows.filter(r=>r.classes.has('mf-mal-episode-row')):[],
  createElement(tag){return {className:'',setAttribute(k,v){this[k]=v;}};}};
 const browser={ApiClient:{getCurrentUserId:()=>user,accessToken:()=> 'token'},
  location:{hash:'#/details?id='+series},setTimeout:()=>1,clearTimeout(){},addEventListener(){},dispatchEvent(){}};
 let requests=0;
 const fetch=async url=>{
  if(!url.includes('Shows/'+series+'/Episodes?'))throw Error('Unexpected endpoint '+url);
  assert(!url.includes('SeasonId='),'Series view must not invent a SeasonId');
  assert(url.includes('EnableUserData=true'));
  requests++;return {ok:true,json:async()=>({Items:episodes})};
 };
 vm.runInNewContext(script,{document:doc,window:browser,location:browser.location,fetch,URLSearchParams,console,AbortController},
  {timeout:2500,filename:'mal.js'});
 const t=browser.__episodeTest070;
 t.setUser(user);
 const session={id:series,key:user+':'+series,userId:user,seasonId:'',catalogId:series,
  phase:'ready',animeVerified:true,entry:{my_list_status:{status:'completed'}}};
 t.setSession(session);t.resume(resuming);
 t.render();await t.index(session).promise;t.render();
 for(let i=0;i<rows.length;i++){
  assert.equal(rows[i].state,expected[i],name+' row '+i);
  if(expected[i])assert.equal(rows[i].children.filter(c=>c.className==='mf-mal-episode-frame').length,1);
  else assert.equal(rows[i].children.length,0,'No unsafe fallback on ambiguous number');
 }
 assert.equal(requests,1);
 t.clear();for(const item of rows)assert.equal(item.children.length,0);
}
(async()=>{
 await runCase('single season completed + resume',[
  {Id:episodeA,SeasonId:seasonA,ParentIndexNumber:1,IndexNumber:1,UserData:{Played:false}},
  {Id:episodeB,SeasonId:seasonA,ParentIndexNumber:1,IndexNumber:2,UserData:{Played:false}},
 ],[row(episodeA,'1. Pierwszy'),row(null,'2. Drugi')],['watched','mixed'],[episodeB]);
 await runCase('multi-season: never extend one MAL completion',[
  {Id:episodeA,SeasonId:seasonA,ParentIndexNumber:1,IndexNumber:1,UserData:{Played:true}},
  {Id:episodeB,SeasonId:seasonB,ParentIndexNumber:2,IndexNumber:1,UserData:{Played:false}},
  {Id:episodeC,SeasonId:seasonB,ParentIndexNumber:2,IndexNumber:2,UserData:{Played:false}}
 ],[row(episodeA,'1. Pierwszy'),row(episodeB,'1. Inny sezon'),row(null,'1. Nieznany numer'),row(episodeC,'2. Kolejny')],
 ['watched','unwatched',undefined,'unwatched']);
 const malcss=fs.readFileSync(path.join(dir,'mal-frames.css'),'utf8');
 const simcss=fs.readFileSync(path.join(dir,'simkl.css'),'utf8');
 for(const [source,prefix] of [[malcss,'mal'],[simcss,'simkl']]){
  assert(source.includes('episode-row[data-mf-'+prefix+'-episode-watch="mixed"] > .mf-'+prefix+'-episode-frame::after'));
  assert(source.includes('background:#e6a23c;border-radius:0 0 12px 12px'));
  assert(source.includes('--mf-'+prefix+'-episode-left:#45b879'));
  assert(source.includes('width:4px'));
  assert(source.includes('height:4px'));
 }
 console.log('PASS v0.4.70 MAL series + season-safe episode strips; Simkl styles independent');
})().catch(e=>{console.error(e);process.exitCode=1;});
