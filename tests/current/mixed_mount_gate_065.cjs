'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/client.js'),'utf8');
const instrumented=source.replace(/\}\)\(\);\s*$/, 'window.__testMixedReady=mixedDecorationsAllowed;})();');
function setup(){
 const frames=[];
 const first={isConnected:true,getAttribute(k){return k==='data-id'?'a'.repeat(32):null;}};
 const list={isConnected:true,getClientRects(){return [{}]},querySelector(){return first;}};
 const document={readyState:'loading',addEventListener(){},querySelectorAll(selector){return selector==='.itemsContainer'?[list]:[]}};
 const window={location:{hash:'#/mixed?topParentId='+ 'b'.repeat(32)},requestAnimationFrame(fn){frames.push(fn)},setTimeout(){return 1;}};
 vm.runInNewContext(instrumented,{window,document,console,URLSearchParams});
 return {window,list,first,frames,flush(){while(frames.length)frames.shift()()}};
}
const s=setup();
assert.equal(s.window.__testMixedReady(),false,'initial React list must not be mutated');
assert.equal(s.window.__testMixedReady(),false,'do not schedule duplicated readiness probes');
assert.equal(s.frames.length,1);
s.flush();
assert.equal(s.window.__testMixedReady(),true,'mounted stable list is now safe for decoration');
s.window.location.hash='#/details?id='+ 'a'.repeat(32);
assert.equal(s.window.__testMixedReady(),true,'outside mixed, normal cards keep working');
s.window.location.hash='#/mixed?topParentId='+ 'b'.repeat(32);
assert.equal(s.window.__testMixedReady(),false,'return to mixed must verify startup again');
console.log('PASS: /mixed is gated until stable initial native list, without reload');
