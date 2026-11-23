'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/details.js'),'utf8');
const start=src.indexOf('  async function playEpisode(id) {');
const end=src.indexOf('  // Expose the already verified native-button path',start);
assert.ok(start>0&&end>start);
const source=src.slice(start,end);
const A='a'.repeat(32),B='b'.repeat(32);
async function scenario({old='',display=A,id=A,same=false}){
  let hash=old?'#/details?id='+old:'#/home', clock=0, clicks=0;
  const prior={querySelector:()=>null};
  const page={querySelector:()=>id?{dataset:{id}}:null};
  const ctx={
    window:{location:{get hash(){return hash},set hash(v){hash=v}},setTimeout(cb,delay){clock+=delay;cb()}},
    Date:{now:()=>clock},
    valid:s=>/^[ab]{32}$/.test(s), compact:s=>String(s).toLowerCase(),
    detailsRoute:id=>'#/details?id='+id,
    itemRoute:()=>hash.startsWith('#/details?')?hash.split('id=')[1].slice(0,32):'',
    activeDetailsPage:target=>target?(same?prior:page):(old?prior:null),
    nativePlayButton:()=>({click(){clicks++}}),
    console:{warn(){}},
  };
  vm.createContext(ctx);
  vm.runInContext(`let playbackGeneration=0;${source}globalThis.playEpisode=playEpisode;`,ctx);
  const result=await ctx.playEpisode(display);
  return {result,hash,clock,clicks};
}
(async()=>{
  let r=await scenario({});
  assert.equal(r.result,true);
  assert.equal(r.clicks,1);
  assert.equal(r.clock,0,'ready native button is clicked immediately; no fixed wait');
  r=await scenario({old:B,display:A,id:B,same:true});
  assert.equal(r.result,false);
  assert.equal(r.clicks,0,'stale Jellyfin details page cannot be played');
  r=await scenario({old:B,display:A,id:'',same:true});
  assert.equal(r.clicks,0,'unknown-ID reused page cannot be played');
  r=await scenario({old:B,display:A,id:'',same:false});
  assert.equal(r.result,true,'fresh page with no stamped ID may use the native button');
  console.log('PASS 0.4.140 single native playback: fast, exact-ID, stale-page guard');
})().catch(e=>{console.error(e);process.exitCode=1;});
