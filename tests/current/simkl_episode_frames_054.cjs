'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let source=fs.readFileSync(path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/simkl.js'),'utf8');
source=source.replace('  function tick(){',`  window.__mfTestEpisode={
    decorate:decorateEpisodeFrames,
    clear:clearEpisodeFrames,
    user:id=>{currentUser=id;},
    resume:ids=>{resumeEpisodes=new Set(ids);}
  };
  function tick(){`);
const user='1'.repeat(32),series='2'.repeat(32),season='3'.repeat(32);
const ids=['4','5','6','7'].map(x=>x.repeat(32));
const frames=[];
function makeNode(episodeId,heading){
 const attrs=episodeId?{'data-id':episodeId}:{};
 const children=[];const classes=new Set(['listItem']);
 return {
   attrs,children,classes,
   classList:{add(x){classes.add(x);},remove(x){classes.delete(x);}},
   setAttribute(k,v){attrs[k]=v;},getAttribute(k){return attrs[k]||null;},removeAttribute(k){delete attrs[k];},
   matches(sel){return sel.includes('.listItem');},
   querySelector(sel){
     if(sel.includes(':scope > .mf-simkl-episode-frame'))return children.find(x=>x.className==='mf-simkl-episode-frame')||null;
     if(sel.includes('.listItemBodyText'))return heading?{textContent:heading}:null;
     return null;
   },querySelectorAll(){return [];},append(n){children.push(n);frames.push(n);},
   get state(){return attrs['data-mf-simkl-episode-watch'];}
 };
}
const one=makeNode(ids[0],'1. Loteria'),two=makeNode(null,'2. Coś za coś'),three=makeNode(ids[2],'3. Requiem'),four=makeNode(ids[3],'4. Inny odcinek');
const unrelated=makeNode('8'.repeat(32),'1. Nie ten serial');
const rows=[one,two,three,four,unrelated];
const area={querySelectorAll(sel){assert.ok(sel.includes('.listItem'));return rows;}};
const page={isConnected:true,dataset:{mfDetailId:season},getClientRects(){return [1];},querySelector(sel){return sel==='.mf-detail-series-sections'?area:null;}};
const document={readyState:'loading',addEventListener(){},createElement(tag){return {className:'',tagName:tag,setAttribute(k,v){this[k]=v;},remove(){}};},querySelectorAll(sel){if(sel==='#itemDetailPage.mf-detail-compact')return [page];if(sel==='.mf-simkl-episode-row')return rows.filter(x=>x.classes.has('mf-simkl-episode-row'));return [];}};
const browser={ApiClient:{getCurrentUserId(){return user;},accessToken(){return 'token';}},location:{hash:'#/details?id='+season},innerHeight:800,setTimeout(){return 1;},clearTimeout(){},addEventListener(){}};
let requests=0;
const fetch=async url=>{
 requests++;
 assert.ok(url.includes(`Shows/${series}/Episodes?`));
 assert.ok(url.includes(`SeasonId=${season}`));
 return {ok:true,async json(){return {Items:ids.map((Id,i)=>({Id,IndexNumber:i+1,UserData:{Played:false}}))};}};
};
vm.runInNewContext(source,{document,window:browser,location:browser.location,fetch,AbortController,URLSearchParams,console},{timeout:1200});
(async()=>{
 const t=browser.__mfTestEpisode;t.user(user);t.resume([ids[1],ids[2]]);
 const session={id:season,seasonId:season,catalogId:series,user,episodeId:'',phase:'ready',data:{relevant:true,connected:true,entry:{status:'completed'},watchedEpisodeNumbers:[1,3]}};
 t.decorate(session);await new Promise(r=>setImmediate(r));t.decorate(session);
 assert.equal(one.state,'watched','Watched in Simkl -> green');
 assert.equal(two.state,'started','Resume only -> gold (found by validated episode number)');
 assert.equal(three.state,'mixed','Watched in Simkl and in Continue Watching -> half gold / green');
 assert.equal(four.state,'unwatched','Not watched -> pink, even when whole show completed');
 assert.equal(unrelated.state,undefined,'Not from this season -> untouched');
 assert.equal(requests,1,'Episode identity fetched only once for the season');
 for(const row of rows.slice(0,4))assert.equal(row.children.filter(x=>x.className==='mf-simkl-episode-frame').length,1);
 t.resume([]);t.decorate(session);assert.equal(two.state,'unwatched');assert.equal(three.state,'watched');
 t.clear();for(const row of rows.slice(0,4)){assert.equal(row.state,undefined);assert.ok(!row.classes.has('mf-simkl-episode-row'));}
 session.data.relevant=false;t.decorate(session);assert.equal(one.state,undefined,'Anime/not-relevant -> no Simkl frame');
 console.log('PASS v0.4.54: each episode isolated; 4 frame states; exact IDs and validated index; no MAL, no NextUp');
})().catch(e=>{console.error(e);process.exitCode=1;});
