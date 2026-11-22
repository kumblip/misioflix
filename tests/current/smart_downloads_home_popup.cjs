'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const home=fs.readFileSync('src/Jellyfin.Plugin.MisioFlix/Web/home.js','utf8');
const css=fs.readFileSync('src/Jellyfin.Plugin.MisioFlix/Web/theme.css','utf8');
assert(home.includes("'mf-home-folder-button mf-home-smart-downloads-button'"));
assert(css.includes('.mf-home-smart-downloads-button{order:4}'));
assert(css.includes('/* On Android the logo is the FIRST inline tile'));
assert(css.includes('.mf-home-hero .mf-home-intro{display:none}'));
assert(css.includes('.mf-home-hero .mf-home-folder-buttons::before{'));
assert(css.includes("background:url('/MisioFlix/assets/logo.png')"));
assert(!css.includes('.mf-home-hero{flex-direction:column;align-items:stretch;gap:8px;padding:10px}'));
class E{
  constructor(tag,cls,txt){this.tagName=tag;this.className=cls||'';this.textContent=txt||'';
    this.children=[];this.events={};this.isConnected=true;this.disabled=false;this.checked=false;this.value='';}
  setAttribute(){}
  addEventListener(name,fn){this.events[name]=fn;}
  appendChild(child){this.children.push(child);child.parent=this;return child;}
  remove(){this.isConnected=false;}
  focus(){doc.activeElement=this;}
  querySelector(selector){if(selector==='button')return walk(this).find(n=>n.tagName==='button');return null;}
  querySelectorAll(selector){return walk(this).filter(n=>{
    if(n.disabled)return false;
    if(selector==='button:not(:disabled),input:not(:disabled)')return n.tagName==='button'||n.tagName==='input';
    return false;
  });}
}
function walk(root){return root.children.flatMap(child=>[child,...walk(child)]);}
const doc={body:new E('body'),activeElement:null,events:{},addEventListener(n,f){this.events[n]=f;},removeEventListener(n,f){if(this.events[n]===f)delete this.events[n];}};
const values=new Map();
const userA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let currentUser=userA;
let native=true;
const shell={AppHost:{supports:scope=>native&&scope==='filedownload',deviceId:()=> 'phone-one'},downloadFiles(){},openDownloadManager(){}};
const api={getCurrentUser:async()=>({Id:currentUser,Name:currentUser===userA?'A':'B'}),serverId:()=> 'server-one'};
const ctx={window:{ApiClient:api,NativeShell:shell,dispatchEvent:()=>{}},document:doc,
  localStorage:{getItem:key=>values.get(key)||null,setItem:(key,val)=>values.set(key,val)},
  location:{origin:'http://localhost'},Event:function Evt(){},console,
  own:(tag,cls,txt)=>new E(tag,cls,txt),
  append:(node,...children)=>{children.forEach(c=>node.appendChild(c));return node;},
  validId:id=>/^[a-z0-9-]{36}$/i.test(id),
  closeSearch:()=>{}};
const start=home.indexOf('  // Smart Downloads v1:');
const end=home.indexOf('  function createCollectionsPage(){',start);
assert(start>0&&end>start);
const script=home.slice(start,end)+ '\n' + 'globalThis.test={open:openSmartDownloadsDialog,close:closeSmartDownloadsDialog,get:()=>smartDownloadsDialog};';
vm.runInNewContext(script,ctx);
const test=ctx.test;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  const button=new E('button');test.open(button);await flush();
  const modal=test.get();assert(modal,'popup opens');
  const inputs=walk(modal.overlay).filter(el=>el.tagName==='input');
  const [enabled,count,gb]=inputs;
  assert.equal(enabled.checked,false,'off by default');
  assert.equal(count.value,'2');assert.equal(gb.value,'5');
  enabled.checked=true;enabled.events.change();count.value='12';gb.value='7,5';
  const save=walk(modal.overlay).find(e=>e.textContent==='Zapisz ustawienia');
  await save.events.click();
  const expected='misio.cache.smart.v1:server-one:'+userA+':phone-one';
  assert.deepEqual(JSON.parse(values.get(expected)),{enabled:true,count:12,budgetGB:7.5});
  count.value='2.5';await save.events.click();
  assert.equal(JSON.parse(values.get(expected)).count,12,'invalid value rejected');
  enabled.checked=false;enabled.events.change();await save.events.click();
  assert.equal(JSON.parse(values.get(expected)).enabled,false,'user can opt out');
  test.close();assert.equal(test.get(),null);
  currentUser='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  test.open(button);await flush();
  const inputsB=walk(test.get().overlay).filter(el=>el.tagName==='input');
  assert.equal(inputsB[0].checked,false,'second user defaults off');
  test.close();
  native=false;currentUser=userA;
  test.open(button);await flush();
  const inputsNoNative=walk(test.get().overlay).filter(el=>el.tagName==='input');
  assert.equal(inputsNoNative[0].disabled,true,'cannot enable on non-Android WebView');
  test.close();
  console.log('PASS Smart Downloads Home button, popup, user/device isolation, validation, opt-out and Android support');
})().catch(e=>{console.error(e);process.exitCode=1;});
