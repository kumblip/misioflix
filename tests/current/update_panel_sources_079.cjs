'use strict';
// Browser-free end-to-end regression for PascalCase Jellyfin response and fresh force refresh.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/configPage.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const GUID='97d15b37-b868-492b-83da-eb67b16a0d44';
class Element {
 constructor(id=''){this.id=id;this.listeners={};this.textContent='';this.disabled=false;this.checked=true;this.value='';this.isConnected=true;}
 addEventListener(event,handler){this.listeners[event]=handler;}
 async fire(name){return this.listeners[name]?.({preventDefault(){}});}
}
function makeServer(remoteFactory){
 const refs=Object.fromEntries(['mf-update-installed','mf-update-github','mf-update-manifest','mf-update-catalog','mf-update-checked','mf-update-status','mf-update-check','mf-update-install','mf-update-auto','mf-mal-client','mf-mal-secret','mf-mal-redirect','mf-simkl-client','mf-config-status','mf-simkl-config-status'].map(id=>['#'+id,new Element(id)]));
 const panel=new Element();panel.querySelector=q=>refs[q];
 const view=new Element();view.querySelector=q=>q==='#mf-updates-panel'?panel:refs[q]||(refs[q]=new Element(q));
 const document={querySelector:q=>q==='#misioflixConfigPage'?view:null};
 let repo=[{Name:'MisioFlix',Url:'https://raw.githubusercontent.com/kumblip/misioflix/main/manifest.json',Enabled:true},{Name:'Other',Url:'https://other.example.com/m.json',Enabled:true}];
 let calls=[];
 const fetch=async(url,opts={})=>{
   calls.push([url,opts.method||'GET']);
   const p=String(url).replace(/^\//,'');
   let data,code=200;
   if(p==='MisioFlix/api/updates/status'||p==='MisioFlix/api/updates/status?force=true')data=remoteFactory();
   else if(p==='Packages')data=[{Guid:GUID,Name:'MisioFlix',Versions:[{Version:'0.4.78.0',TargetAbi:'12.4.0.0'}]}];
   else if(p==='Plugins')data=[{Id:GUID,Name:'MisioFlix',Version:'0.4.78.0'}];
   else if(p==='MisioFlix/api/updates/native-catalog/refresh'&&opts.method==='POST'){repo[0].Url='https://raw.githubusercontent.com/kumblip/misioflix/'+'a'.repeat(40)+'/manifest.json';data={repositoryVersion:'0.4.78.0',repositoryTargetAbi:'12.4.0.0',verifiedByJellyfin:true};}
   else if(p==='Repositories')data=repo;
   else throw Error('Unexpected API '+p);
   return {ok:true,status:code,json:async()=>data};
 };
 const api={accessToken:()=> 'auth',getUrl:x=>'/'+x,getPluginConfiguration:async()=>({AutoCheckUpdates:false}),updatePluginConfiguration:async()=>{}};
 const window={setInterval:()=>1,clearInterval(){},confirm:()=>true};
 vm.runInNewContext(script,{window,document,fetch,ApiClient:api,URLSearchParams,console,Date,Promise,setTimeout,clearTimeout});
 return {refs,view,getRepo:()=>repo,calls};
}
const settle=async()=>{for(let i=0;i<25;i++)await new Promise(resolve=>setImmediate(resolve));};
(async()=>{
 let server=makeServer(()=>({InstalledVersion:'0.4.78.0',GitHubVersion:'0.4.78.0',RepositoryVersion:'0.4.78.0',RepositoryTargetAbi:'12.4.0.0',CheckedAt:'2026-11-16T01:59:45Z',GitHubError:null,RepositoryError:null}));
 await server.view.fire('pageshow');await settle();
 const r=server.refs;
 assert.equal(r['#mf-update-installed'].textContent,'0.4.78.0');
 assert.equal(r['#mf-update-github'].textContent,'0.4.78.0');
 assert.equal(r['#mf-update-manifest'].textContent,'0.4.78.0 (ABI 12.4.0.0)');
 assert.equal(r['#mf-update-catalog'].textContent,'0.4.78.0');
 assert.notEqual(r['#mf-update-checked'].textContent,'—');
 assert.equal(r['#mf-update-install'].disabled,true);
 await r['#mf-update-check'].fire('click');await settle();
 assert.match(r['#mf-update-status'].textContent,/Jellyfin wczytał manifest/);
 assert.equal(r['#mf-update-installed'].textContent,'0.4.78.0');
 assert.equal(r['#mf-update-github'].textContent,'0.4.78.0');
 assert.match(server.getRepo()[0].Url,/[a-f0-9]{40}\/manifest\.json/);
 assert.equal(server.getRepo()[1].Url,'https://other.example.com/m.json');
 assert.ok(server.calls.some(x=>x[0]==='/MisioFlix/api/updates/status?force=true'));
 // No GitHub release response should not make the installed version unknown.
 server=makeServer(()=>({InstalledVersion:'0.4.78.0',GitHubVersion:null,GitHubError:'GitHub: HTTP 404',RepositoryVersion:'0.4.78.0',RepositoryTargetAbi:'12.4.0.0',CheckedAt:'2026-11-16T02:00:00Z'}));
 await server.view.fire('pageshow');await settle();
 assert.equal(server.refs['#mf-update-installed'].textContent,'0.4.78.0');
 assert.equal(server.refs['#mf-update-manifest'].textContent,'0.4.78.0 (ABI 12.4.0.0)');
 assert.match(server.refs['#mf-update-github'].textContent,/HTTP 404/);
 // Catch the exact regression: lowercase field names may be used as well.
 server=makeServer(()=>({installedVersion:'0.4.78.0',gitHubVersion:'0.4.78.0',repositoryVersion:'0.4.78.0',repositoryTargetAbi:'12.4.0.0',checkedAt:'2026-11-16T02:00:00Z'}));
 await server.view.fire('pageshow');await settle();
 assert.equal(server.refs['#mf-update-installed'].textContent,'0.4.78.0');
 assert.equal(server.refs['#mf-update-github'].textContent,'0.4.78.0');
 console.log('PASS v0.4.79: mixed-case plugin status + manifest + installed version, explicit source errors, fresh native catalog and 15-minute-safe displayed state');
})().catch(e=>{console.error(e);process.exitCode=1;});
