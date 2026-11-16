// v0.4.82: test the actual library-scrolling helpers without launching Jellyfin.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/library-scroll.js'),'utf8');
function section(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+1);assert(i>=0&&j>i);return src.slice(i,j)}
const context={URLSearchParams,URL,location:{hash:'#/mixed?topParentId='+'a'.repeat(32)},allowed:new Set(['mixed','movies','tv','music']),
  document:{querySelectorAll:()=>[{textContent:'Foldery 1-100 z 602',getClientRects:()=>[1],isConnected:true,hidden:false,classList:{contains:()=>false},closest:()=>null}]},
  visible:()=>true,console};
vm.createContext(context);
vm.runInContext("const guid = value => String(value || '').replace(/-/g, '').toLowerCase();",context);
vm.runInContext(section('  const route = () => {','  const api = () =>'),context);
vm.runInContext(section('  function currentRange(){','  function firstSignature('),context);
assert.equal(vm.runInContext('route()?.page',context),'mixed');
assert.equal(vm.runInContext('route()?.parent',context),'a'.repeat(32));
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(currentRange())',context)),{first:1,last:100,total:602});
context.document.querySelectorAll=()=>[{textContent:'Folders 101-200 of 602'}];
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(currentRange())',context)),{first:101,last:200,total:602});
context.location.hash='#/details?id='+'a'.repeat(32);
assert.equal(vm.runInContext('route()',context),null,'no episode or detail page interception');
context.location.hash='#/mixed?topParentId='+'a'.repeat(32)+'&tab=2';
assert.equal(vm.runInContext('route()',context),null,'no unsupported library tabs');
assert(src.includes("state.io?.disconnect()"),'IntersectionObserver cleanup');
assert(src.includes("if(state && (state.route.key!==r.key"),'filter/route state invalidation');
assert(src.includes("if(!state || state!==s || identity()!==s.identity)return null"),'stale-request guard');
assert(src.includes("params.ParentId=r.parent"),'parent scoping');
assert(src.includes('const probe=pageParams(base.params'),'native ordering validation');
assert(src.includes("container.insertAdjacentElement('afterend',pane)"),'own deck outside React-owned native cards');
assert(src.includes("new IntersectionObserver"),'automatic scroll trigger');
assert(!src.includes('KefinTweaksConfig') && !src.includes('window.cardBuilder'), 'standalone without other Kefin tweaks');
console.log('PASS library 0.4.82: route gating, Polish/English count, pagination, isolated extension and guards');
