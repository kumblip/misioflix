'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'),vm=require('node:vm');
let source=fs.readFileSync(path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/simkl.js'),'utf8');
source=source.replace('  function tick(){',`  window.__testState=simklFrame;
  window.__testSetUser=id=>{currentUser=id;};
  window.__testResume=refreshResume;
  window.__testDecorateSeasons=decorateSeasonFrames;
  function tick(){`);
const user='1'.repeat(32),mash='3'.repeat(32),another='4'.repeat(32);
function card(parent,season,watch='unwatched',anime=false){
 const attrs={'data-mf-watch':watch,'data-mf-simkl-watch':''};
 const state={mfSimklSeries:parent,mfSimklSeason:String(season),mfAnime:anime?'1':'0'};
 const classes=new Set();
 return {dataset:state,attrs,classes,
   getBoundingClientRect(){return {top:0,bottom:300};},
   getAttribute(name){return attrs[name]??null;},
   setAttribute(name,val){attrs[name]=val;},removeAttribute(name){delete attrs[name];},
   querySelector(){return null;},
   classList:{add(x){classes.add(x);},remove(x){classes.delete(x);}}
 };
}
const season1=card(mash,1),season2=card(mash,2),season4=card(mash,4,'watched'),anime=card(another,1,'watched',true),orphan=card('not-a-guid',1);
const document={readyState:'loading',addEventListener(){},querySelectorAll(sel){
 if(sel.includes('data-mf-simkl-series'))return [season1,season2,season4,anime,orphan];
 return [];
}};
const browser={ApiClient:{getCurrentUserId(){return user;},accessToken(){return 'stub';}},
 location:{hash:'#/home'},innerHeight:1000,setTimeout(){return 1;},clearTimeout(){},addEventListener(){}};
const fetch=async path=>{assert.equal(path,'/MisioFlix/api/resume');return {ok:true,async json(){return {items:[
 {catalog_id:mash,season:1,position_ticks:100,next_up:false},
 {catalog_id:another,season:null,position_ticks:100,next_up:false},
 {catalog_id:another,season:3,position_ticks:0,next_up:true}
]};}};};
vm.runInNewContext(source,{document,window:browser,location:browser.location,fetch,AbortController,URLSearchParams,console},{timeout:1200});
(async()=>{
 browser.__testSetUser(user);
 await browser.__testResume(true);
 browser.__testDecorateSeasons();
 assert.equal(season1.attrs['data-mf-simkl-watch'],'started','MASH season 1 episode 2 in Continue Watching -> gold');
 assert.equal(season2.attrs['data-mf-simkl-watch'],'unwatched','Unstarted season 2 unchanged');
 assert.equal(season4.attrs['data-mf-simkl-watch'],'watched','Completed season 4 remains green');
 assert.equal(anime.attrs['data-mf-simkl-watch'],'','anime skipped entirely');
 assert.equal(orphan.attrs['data-mf-simkl-watch'],'','Invalid parent skipped');
 assert.ok(!season1.classes.has('mf-simkl-native-media'));
 assert.ok(season1.classes.has('mf-simkl-season-media'));
 season4.attrs['data-mf-watch']='watched';
 // Simulate a real resume in an already completed season: same frame function.
 assert.equal(browser.__testState(null,'watched',true),'mixed');
 console.log('PASS 0.4.53 season frame maps exact series/season, not entire series; independent from MAL');
})().catch(e=>{console.error(e);process.exitCode=1;});
