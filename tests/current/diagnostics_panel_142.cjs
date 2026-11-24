const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../../src/Jellyfin.Plugin.MisioFlix/Web/configPage.html'),'utf8');
const script=html.slice(html.indexOf('  const diagnostics=(()=>{'),html.indexOf('  // Independent status.'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({hasSession=true, token='admin', getUrl=true}={}){
 const nodes=new Map(), calls=[], timers=new Map(); let nextTimer=0, enabled=false;
 const node=()=>({textContent:'',disabled:false,listeners:{},children:[],addEventListener(type,fn){this.listeners[type]=fn;},replaceChildren(){this.children=[];},appendChild(n){this.children.push(n);}});
 for(const id of ['on','off','refresh','reset','export','status','metrics','cache'])nodes.set('#mf-diag-'+id,node());
 const buttons=['on','off','refresh','reset','export'].map(x=>nodes.get('#mf-diag-'+x));
 const panel=Object.assign(node(),{open:true,querySelector:id=>nodes.get(id),querySelectorAll:()=>buttons});
 const api={accessToken:()=>token,...(getUrl?{getUrl:path=>'https://nas.example/jellyfin/'+path}:{})};
 const window=hasSession?{MisioFlixDiagnosticSession:{setEnabled:v=>{enabled=v;},snapshot:()=>({enabled,metrics:[],cache:{hits:0,misses:0,hitRate:null},apiErrors:0}),reset(){}}}:{};
 const ctx={window,ApiClient:api,view:{querySelector:()=>panel},AbortController,document:{createElement:node},setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>timers.delete(id),fetch:(url,opts)=>new Promise((resolve,reject)=>{calls.push({url,opts,resolve});opts.signal.addEventListener('abort',()=>reject(Error('aborted')));})};
 vm.createContext(ctx);vm.runInContext(script+'\nglobalThis.panelDiagnostics=diagnostics;',ctx);
 const reply=(i,on,status=200)=>calls[i].resolve({ok:status===200,status,json:async()=>({enabled:on,metrics:[],apiErrors:0})});
 const click=id=>nodes.get('#mf-diag-'+id).listeners.click({preventDefault(){}});
 return {calls,buttons,click,reply,panel,timers,status:()=>nodes.get('#mf-diag-status').textContent,enabled:()=>enabled,activate:()=>ctx.panelDiagnostics.activate()};
}
test('click enable interrupts passive refresh; uses native URL and auth; ignores stale refresh',async()=>{
 const f=fixture();f.activate();assert.match(f.status(),/Pobieranie/);assert.ok(f.buttons.every(b=>!b.disabled));
 f.click('on');assert.match(f.status(),/Włączanie/);assert.equal(f.calls[0].opts.signal.aborted,true);assert.equal(f.calls[1].url,'https://nas.example/jellyfin/MisioFlix/api/diagnostics/enable?enabled=true');assert.equal(f.calls[1].opts.method,'POST');assert.match(f.calls[1].opts.headers.Authorization,/Token="admin"/);assert.ok(f.buttons.every(b=>b.disabled));
 f.reply(1,true);await tick();assert.equal(f.enabled(),true);assert.equal(f.status(),'Serwer: włączona · ta karta: włączona');assert.ok(f.buttons.every(b=>!b.disabled));assert.equal(f.timers.size,0);
 f.click('off');f.reply(2,false);await tick();assert.equal(f.enabled(),false);assert.match(f.status(),/Serwer: wyłączona/);
});
test('403 is visible; no false success; retry available',async()=>{const f=fixture();f.click('on');f.reply(0,false,403);await tick();assert.match(f.status(),/HTTP 403/);assert.equal(f.enabled(),false);assert.ok(f.buttons.every(b=>!b.disabled));});
test('timeout aborts request and gives actionable status',async()=>{const f=fixture();f.click('on');[...f.timers.values()][0]();await tick();assert.match(f.status(),/12 s/);assert.ok(f.buttons.every(b=>!b.disabled));});
test('missing browser session is clearly reported, server status preserved',async()=>{const f=fixture({hasSession:false});f.click('on');f.reply(0,true);await tick();assert.match(f.status(),/Serwer: włączona/);assert.match(f.status(),/Pomiary tej karty nieaktywne/);});
test('missing authentication is reported without network request',async()=>{const f=fixture({token:''});f.click('on');await tick();assert.equal(f.calls.length,0);assert.match(f.status(),/Brak aktywnej sesji/);});
test('server did not confirm enable: local measurements remain disabled',async()=>{const f=fixture();f.click('on');f.reply(0,false);await tick();assert.equal(f.enabled(),false);assert.match(f.status(),/nie potwierdził włączenia/);});
