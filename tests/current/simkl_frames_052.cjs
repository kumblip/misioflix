'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
let source=fs.readFileSync(path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/simkl.js'),'utf8');
// Test only: expose pure state logic and the internal resume reader without
// changing the production JavaScript bundle.
source=source.replace('  function tick(){',`  window.__testFrame=simklFrame;
  window.__testSetUser=id=>{currentUser=id;};
  window.__testResume=refreshResume;
  window.__testCurrentResume=()=>({ids:[...resumeForUser],seasons:[...resumeSeasons].map(([k,v])=>[k,[...v]])});
  function tick(){`);
const user='1'.repeat(32),movie='2'.repeat(32),series='3'.repeat(32),next='4'.repeat(32);
const page={readyState:'loading',addEventListener(){},querySelectorAll(){return [];}};
const browser={ApiClient:{getCurrentUserId(){return user;},accessToken(){return 'stub-token';}},
  location:{hash:'#/home'},setTimeout(){return 1;},clearTimeout(){},addEventListener(){}};
const payload={items:[
  {catalog_id:movie,resume_type:'Movie',position_ticks:400,progress_percent:55,next_up:false},
  {catalog_id:series,resume_type:'Episode',season:5,position_ticks:120,progress_percent:20,next_up:false},
  {catalog_id:next,resume_type:'Episode',season:1,position_ticks:0,progress_percent:0,next_up:true}
],hidden:[{catalog_id:'5'.repeat(32),resume_type:'Movie',position_ticks:300,next_up:false}]};
const fakeFetch=async(url)=>{assert.equal(url,'/MisioFlix/api/resume');return {ok:true,async json(){return payload;}};};
const scope={window:browser,location:browser.location,document:page,fetch:fakeFetch,
  URLSearchParams,AbortController,console};
vm.runInNewContext(source,scope,{filename:'simkl.js',timeout:1000});
const frame=browser.__testFrame;
assert.equal(frame(null),'unwatched','No Simkl entry means a pink frame');
assert.equal(frame({status:'plantowatch'}),'unwatched');
assert.equal(frame({status:'watching'}),'started','Watching means gold');
assert.equal(frame(null,'started'),'started','Jellyfin playback means gold');
assert.equal(frame({status:'completed'}),'watched','Completed means green');
assert.equal(frame({status:'completed'},'',true),'mixed','Completed + resume means half gold/half green');
assert.equal(frame({status:'watching'},'',true),'started','No green unless marked complete');
assert.equal(frame({status:'completed'},'',false),'watched');
assert.equal(frame({status:'plantowatch'},'watched'),'unwatched','Explicit Simkl list overrides Jellyfin fallback');
assert.equal(frame({status:'watching',watchedEpisodes:50},'watched'),'started');
(async()=>{
 browser.__testSetUser(user);
 await browser.__testResume(true);
 const data=browser.__testCurrentResume();
 assert.deepEqual([...data.ids].sort(),[movie,series].sort(),
   'Only actual resume positions, not NextUp suggestions or hidden entries');
 assert.equal(data.seasons.length,1);
 assert.equal(data.seasons[0][0],series);
 assert.equal(data.seasons[0][1][0],5);
 console.log('PASS v0.4.52: Simkl 4 watch states, split border, actual Resume not NextUp/hidden, season scoped');
})().catch(e=>{console.error(e);process.exitCode=1;});
