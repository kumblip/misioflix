'use strict';
// v0.4.100 executable regressions. Exercise the real installed home.js snippets.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
function cut(begin,end){
  const a=source.indexOf(begin), b=source.indexOf(end,a+begin.length);
  assert(a>=0 && b>a,'missing source anchors '+begin+' / '+end);
  return source.slice(a,b);
}
const cacheBlock=cut('  const catalogCache = new Map();','  const rows = new Map();');
const getBlock=cut('  // The search catalogue is fetched on demand','  // Library/type choices');
const scopedBlock=cut('  async function loadScopedCatalog(state){','  function closeSearch(){');
const loadBlock=cut('  function displaySearchCatalog(state,data,preserveFilters=false){','  function openSearch(kind,initialGenre=');
assert.match(source,/if\(!token \|\| token!==owner\)/,'SPA navigation keeps cached catalogue when auth unchanged');
assert.match(source,/if\(!token && owner\)void clearCatalogSnapshots\(\)/,'logout clears persistent cache');
assert.match(source,/loadSearch\(state,true\)/,'manual refresh bypasses cached catalogue');
assert.match(source,/state\.genreStates\.set\(genre,mode\)/,'background refresh preserves genre filter');
assert.match(source,/const previousScroll=preserveFilters\?state\.scroller\.scrollTop:0/,'scroll preserved on refresh');
assert.doesNotMatch(getBlock,/localStorage\.setItem|sessionStorage\.setItem/,'no auth token persisted');
const GUID_A='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const GUID_B='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const GUID_C='cccccccccccccccccccccccccccccccc';
function indexedDBStub(){
  const values=new Map();
  const database={
    objectStoreNames:{contains:()=>true},createObjectStore(){},
    transaction(){return {objectStore(){return {
      get(key){const op={};queueMicrotask(()=>{op.result=values.get(key);op.onsuccess?.()});return op},
      put(row){values.set(row.key,row)}, clear(){values.clear()}
    }} }}
  };
  return {values,open(){const req={result:database};queueMicrotask(()=>req.onsuccess?.());return req}};
}
function create(idb){
  let token='top-secret-not-persisted',user=GUID_A,server=GUID_B,network=0;
  const window={indexedDB:idb,ApiClient:{getCurrentUserId:()=>user,serverId:()=>server},
    setTimeout,clearTimeout,location:{href:'https://test.invalid/web/index.html'}};
  const document={currentScript:{src:'https://test.invalid/MisioFlix/assets/home.js?v=0.4.100.0'}};
  const context={window,document,URL,Date,Promise,Map,Array,console,
    validId:value=>/^[0-9a-f]{32}$/i.test(String(value||'').replace(/-/g,'')),
    compactId:value=>String(value||'').replace(/-/g,'').toLowerCase(),
    currentToken:()=>token, request:async()=>({items:[{id:GUID_C,anime:true,title:'Seria '+(++network),type:'Series'}],genres:{anime:['Akcja'],media:[]}}),
    setTimeout,clearTimeout,encodeURIComponent};
  vm.createContext(context);
  vm.runInContext(cacheBlock+getBlock+scopedBlock,context);
  return {context,window,number:()=>network,user:v=>{user=v},token:v=>{token=v}};
}
const flush=()=>new Promise(r=>setTimeout(r,10));
(async()=>{
  const idb=indexedDBStub();
  const a=create(idb);
  const first=await a.context.getCatalogForSearch(GUID_C);
  assert.equal(first.items[0].title,'Seria 1');
  await flush();
  assert.equal(a.number(),1);
  assert.equal((await a.context.getCatalogForSearch(GUID_C)).items[0].title,'Seria 1');
  assert.equal(a.number(),1,'revisiting search must not trigger network while snapshot is fresh');
  assert.equal(idb.values.size,1,'snapshot persisted per user/server/library');
  const row=[...idb.values.values()][0];
  assert(!JSON.stringify(row).includes('top-secret-not-persisted'),'tokens not stored');
  const b=create(idb);
  assert.equal((await b.context.getCatalogForSearch(GUID_C)).items[0].title,'Seria 1');
  assert.equal(b.number(),0,'reload should use IndexedDB first');
  await b.context.getCatalogForSearch(GUID_C,true);
  await flush();
  assert.equal(b.number(),1,'manual refresh forces a new network fetch');
  b.user(GUID_C);
  await b.context.getCatalogForSearch(GUID_C);
  assert.equal(b.number(),2,'other Jellyfin user cannot access first user cache');
  b.token('');
  await b.context.getCatalogForSearch(GUID_C);
  assert.equal(b.number(),3,'no user identity => network path, never persisted snapshot');
  assert.equal(idb.values.size,2,'anonymous request not cached');
  // Fail-closed fallback when IndexedDB does not exist.
  const c=create(undefined);
  await c.context.getCatalogForSearch(GUID_C);
  assert.equal(c.number(),1);
  await c.context.getCatalogForSearch(GUID_C);
  assert.equal(c.number(),1,'memory cache available without IndexedDB');
  console.log('PASS v0.4.100: user/server isolation, browser reload, memory-only fallback, manual refresh, no tokens, navigation');
})().catch(e=>{console.error(e);process.exitCode=1});
