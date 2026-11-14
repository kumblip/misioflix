'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let source=fs.readFileSync(path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/simkl.js'),'utf8');
source=source.replace('  function tick(){',`  window.__test055={decorate:decorateSeasonFrames,user:id=>{currentUser=id;},resume:(parent,seasons)=>{resumeSeasons.set(parent,new Set(seasons));},
    cache:()=>seasonProgress,reset:invalidateSeasonProgress};
  function tick(){`);
const series='2'.repeat(32),user='1'.repeat(32),other='3'.repeat(32);
function card(season,anime=false,parent=series){
 const attrs={'data-mf-episodes':'24','data-mf-watch':'unwatched'};
 const styles=new Set(['card']);
 return {dataset:{mfAnime:anime?'1':'0',mfSimklSeries:parent,mfSimklSeason:String(season)},
  classList:{add:x=>styles.add(x),remove:x=>styles.delete(x)},
  getAttribute:key=>attrs[key]??null,setAttribute:(key,val)=>{attrs[key]=val;},
  removeAttribute:key=>{delete attrs[key];},querySelector:()=>null,
  getBoundingClientRect:()=>({bottom:500,top:0}),get status(){return attrs['data-mf-simkl-watch'];}};
}
const cards=[card(1),card(2),card(3),card(4),card(5),card(1,true),card(1,false,other)];
const document={readyState:'loading',addEventListener(){},querySelectorAll(selector){
 if(selector.includes('[data-mf-simkl-series]'))return cards;
 return [];
}};
const browser={ApiClient:{getCurrentUserId:()=>user,accessToken:()=>'testtoken'},
 location:{hash:'#/details?id='+series},innerHeight:800,setTimeout:()=>1,clearTimeout(){},addEventListener(){}};
let calls=0;
const fetch=async url=>{
 assert.ok(String(url).includes('/season-progress?ids='));calls++;
 return {ok:true,json:async()=>({progress:{[series]:{known:true,watched:{1:24,2:7,4:24}},[other]:{known:true,watched:{}}}})};
};
vm.runInNewContext(source,{window:browser,document,location:browser.location,URLSearchParams,AbortController,fetch,console},{timeout:1000});
(async()=>{
 const t=browser.__test055;t.user(user);
 t.resume(series,[4,5]);t.decorate();
 await new Promise(resolve=>setImmediate(resolve));
 t.decorate();
 assert.equal(cards[0].status,'watched','24/24, no resume -> green');
 assert.equal(cards[1].status,'started','7/24 -> gold');
 assert.equal(cards[2].status,'unwatched','0/24 -> pink');
 assert.equal(cards[3].status,'mixed','24/24 with Resume -> half gold half green');
 assert.equal(cards[4].status,'started','0/24 with Resume -> gold');
 assert.equal(cards[5].status,undefined,'Anime seasons must not be decorated');
 assert.equal(cards[6].status,'unwatched','Unwatched different series is independent');
 assert.equal(calls,1,'one authorized batch for all visible series');
 t.resume(series,[]);t.decorate();
 assert.equal(cards[3].status,'watched','Removed Resume -> green');
 assert.equal(cards[4].status,'unwatched','Removed Resume -> pink');
 console.log('PASS v0.4.55: season watched counts and Resume precedence, batch, isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});
