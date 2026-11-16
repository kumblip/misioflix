'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/configPage.html'),'utf8');
const script=html.split('<script>')[1].split('</script>')[0];
const GUID='97d15b37-b868-492b-83da-eb67b16a0d44';
const CANON='https://raw.githubusercontent.com/kumblip/misioflix/main/manifest.json';
const PIN='https://raw.githubusercontent.com/kumblip/misioflix/'+'a'.repeat(40)+'/manifest.json';
class El{
 constructor(){this.listeners={};this.checked=true;this.textContent='';this.disabled=false;this.value='';this.isConnected=true;}
 addEventListener(k,f){this.listeners[k]=f;}
 fire(k){return this.listeners[k]?.({preventDefault(){}});}
}
const settle=async()=>{for(let i=0;i<40;i++)await new Promise(r=>setImmediate(r));};
function setup(reject=false){
 const refs={};
 const el=id=>refs[id]||(refs[id]=new El());
 const panel=new El();panel.querySelector=el;
 const view=new El();view.querySelector=q=>q==='#mf-updates-panel'?panel:el(q);
 const document={querySelector:q=>q==='#misioflixConfigPage'?view:null};
 const repos=[{Name:'MisioFlix',Url:CANON,Enabled:true},{Name:'Unrelated',Url:'https://example.org/repo.json',Enabled:true}];
 let catalogVer='0.4.90.0',calls=[];
 const fetch=async(url,opts={})=>{
  const u=String(url).replace(/^\//,''),method=opts.method||'GET';
  calls.push([u,method]);
  let body=null,status=200;
  if(u==='MisioFlix/api/updates/status'||u==='MisioFlix/api/updates/status?force=true')
   body={InstalledVersion:'0.4.90.0',GitHubVersion:'0.4.91.0',RepositoryVersion:'0.4.90.0',RepositoryTargetAbi:'12.4.0.0',CheckedAt:'2026-11-16T20:30:00Z'};
  else if(u==='MisioFlix/api/updates/native-catalog/refresh'&&method==='POST'){
   if(reject){status=400;body={error:'GitHub nie udostępnił rewizji manifestu'};}
   else{
    repos[0].Url=PIN;
    catalogVer='0.4.91.0';
    body={repositoryVersion:'0.4.91.0',repositoryTargetAbi:'12.4.0.0',repositoryUrl:PIN,verifiedByJellyfin:true,updated:true};
   }
  }else if(u==='Repositories')body=repos;
  else if(u==='Packages')body=[{Guid:GUID,Name:'MisioFlix',Versions:[{Version:catalogVer,TargetAbi:'12.4.0.0'}]}];
  else if(u==='Plugins')body=[{Id:GUID,Version:'0.4.90.0'}];
  else throw Error('Unexpected '+method+' '+u);
  return {ok:status<400,status,json:async()=>body};
 };
 const api={accessToken:()=> 'auth',getUrl:x=>'/'+x,getPluginConfiguration:async()=>({AutoCheckUpdates:false}),updatePluginConfiguration:async()=>{}};
 const window={setInterval:()=>1,clearInterval(){},confirm:()=>true};
 vm.runInNewContext(script,{window,document,fetch,ApiClient:api,URLSearchParams,console,Date,Promise,setTimeout,clearTimeout});
 return {view,refs,repos,calls};
}
(async()=>{
 let server=setup();
 await server.view.fire('pageshow');await settle();
 assert.equal(server.refs['#mf-update-catalog'].textContent,'0.4.90.0');
 assert.equal(server.refs['#mf-update-install'].disabled,true);
 await server.refs['#mf-update-check'].fire('click');await settle();
 assert.equal(server.repos[0].Url,PIN);
 assert.equal(server.repos[1].Url,'https://example.org/repo.json');
 assert.equal(server.refs['#mf-update-catalog'].textContent,'0.4.91.0');
 assert.match(server.refs['#mf-update-manifest'].textContent,/0\.4\.91\.0.*wczytano przez Jellyfin/);
 assert.equal(server.refs['#mf-update-install'].disabled,false);
 assert.match(server.refs['#mf-update-status'].textContent,/Jellyfin wczytał manifest 0\.4\.91\.0/);
 assert.ok(server.calls.some(([url,method])=>url==='MisioFlix/api/updates/native-catalog/refresh'&&method==='POST'));
 assert.ok(!server.calls.some(([url,method])=>url==='Repositories'&&method==='POST'));
 server=setup(true);
 await server.view.fire('pageshow');await settle();
 await server.refs['#mf-update-check'].fire('click');await settle();
 assert.equal(server.repos[0].Url,CANON);
 assert.match(server.refs['#mf-update-status'].textContent,/nie powiodło się.*GitHub nie udostępnił rewizji manifestu/);
 assert.equal(server.refs['#mf-update-install'].disabled,true);
 console.log('PASS v0.4.92: pin native repo, Jellyfin catalog success/error, no browser config write, optional install only after verification');
})().catch(e=>{console.error(e);process.exitCode=1});
