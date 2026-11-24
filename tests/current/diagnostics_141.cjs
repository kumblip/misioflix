const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createDiagnostics} = require('../../src/Jellyfin.Plugin.MisioFlix/Web/diagnostics.js');
test('disabled by default', () => { const d = createDiagnostics(); d.record('catalog', 4); d.cacheResult(true); d.apiError(); assert.equal(d.snapshot().metrics.length,0); assert.equal(d.snapshot().cache.hits,0); assert.equal(d.snapshot().apiErrors,0); });
test('timing and one-time finish', () => { let t=1; const d=createDiagnostics({enabled:true,clock:()=>t}); const end=d.start('catalog','cold'); t=31; end(); t=99; end(); assert.equal(d.snapshot().metrics[0].meanMs,30); assert.equal(d.snapshot().metrics[0].totalCount,1); });
test('bounded rolling samples and P95', () => { const d=createDiagnostics({enabled:true,capacity:20}); for(let i=1;i<=40;i++) d.record('catalog',i,'warm'); const m=d.snapshot().metrics[0]; assert.equal(m.totalCount,40); assert.equal(m.sampleCount,20); assert.equal(m.meanMs,30.5); assert.equal(m.maxMs,40); assert.equal(m.p95Ms,39); });
test('warm and cold separate', () => { const d=createDiagnostics({enabled:true}); d.record('catalog',100,'cold'); d.record('catalog',10,'warm'); assert.deepEqual(d.snapshot().metrics.map(m=>m.meanMs),[100,10]); });
test('reset invalidates in-flight measurements', () => { const d=createDiagnostics({enabled:true,clock:()=>10}); const end=d.start('catalog'); d.reset(); end(); assert.equal(d.snapshot().metrics.length,0); });
test('disable clears and invalidates measurements', () => { const d=createDiagnostics({enabled:true,clock:()=>10}); d.record('catalog',5); const end=d.start('catalog'); d.setEnabled(false); d.setEnabled(true); end(); assert.equal(d.snapshot().metrics.length,0); });
test('cache statistics and API errors', () => { const d=createDiagnostics({enabled:true}); assert.equal(d.snapshot().cache.hitRate,null); d.cacheResult(true); d.cacheResult(false); d.cacheResult(true); d.apiError(); assert.equal(d.snapshot().cache.hitRate,2/3); assert.equal(d.snapshot().apiErrors,1); });
test('rejects unknown metrics and non-finite duration', () => { const d=createDiagnostics({enabled:true}); d.record('secret-url',3); d.record('catalog',NaN); d.record('catalog',-1); d.record('catalog',2,'secret-token'); assert.equal(d.snapshot().metrics.length,0); assert.ok(!d.exportJson().includes('secret')); });
test('snapshot cannot modify samples', () => { const d=createDiagnostics({enabled:true}); d.record('catalog',4); d.snapshot().metrics[0].meanMs=999; assert.equal(d.snapshot().metrics[0].meanMs,4); });
test('capacity must be bounded integer', () => { for(const capacity of [0,4097,1.2,NaN]) assert.throws(()=>createDiagnostics({capacity}),RangeError); });

test('browser session disabled on user/server change and old timers discarded', () => {
  const fs=require('node:fs'), vm=require('node:vm');
  const src=fs.readFileSync(require.resolve('../../src/Jellyfin.Plugin.MisioFlix/Web/diagnostics.js'),'utf8');
  let user='a', server='x', token='token', time=0;
  const ctx={ApiClient:{getCurrentUserId:()=>user,serverId:()=>server,accessToken:()=>token},performance:{now:()=>time},addEventListener(){}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(src,ctx);
  const d=ctx.MisioFlixDiagnosticSession;
  assert.equal(d.isEnabled(),false);d.setEnabled(true);assert.equal(d.isEnabled(),true);
  const finish=d.start('filterChange');time=42;finish();assert.equal(d.snapshot().metrics[0].meanMs,42);
  const late=d.start('catalog');user='b';assert.equal(d.isEnabled(),false);d.setEnabled(true);late();assert.equal(d.snapshot().metrics.length,0);
  server='y';assert.equal(d.isEnabled(),false);d.setEnabled(true);token='';assert.equal(d.isEnabled(),false);
});

test('session supports Jellyfin client with current server fallback',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const src=fs.readFileSync(require.resolve('../../src/Jellyfin.Plugin.MisioFlix/Web/diagnostics.js'),'utf8');
 let sid='server-a';const ctx={ApiClient:{getCurrentUserId:()=> 'user',accessToken:()=> 'token'},ConnectionManager:{getCurrentServer:()=>({Id:sid})},performance:{now:()=>0},addEventListener(){}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(src,ctx);
 const d=ctx.MisioFlixDiagnosticSession;d.setEnabled(true);assert.equal(d.isEnabled(),true);sid='server-b';assert.equal(d.isEnabled(),false);
});
