const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const js = fs.readFileSync(path.resolve(__dirname, '../src/Jellyfin.Plugin.MisioFlix/Web/client.js'), 'utf8');
const exposed = js.replace(/\n\}\)\(\);\s*$/, `
  globalThis.mfTest={inject,toTab,showDetails,restoreRoute,openNative,boot,getState:()=>state,
    setReady:v=>{state.ready=v;},setItems:v=>{state.items=v;}};
})();`);
const mark = {add(){}, remove(){}, contains(){return false;}};
let root=null;
const host={isConnected:true, classList:mark,appendChild(n){root=n;n.parentElement=host;},querySelector(){return null;}};
const home={classList:mark,closest(){return null;},querySelector(q){return q==='.homeSectionsContainer'?host:null;}};
const content={innerHTML:'',scrollTop:0,querySelectorAll(){return []},contains(){return true}};
const document={readyState:'loading',body:{},
  querySelector(q){if(q==='#indexPage')return home;
    if(q==='#mf-portal')return root;
    if(q==='#mf-content')return content;
    return null;},
  createElement(tag){return {tagName:tag, id:'',className:'',innerHTML:'',parentElement:null,
    addEventListener(){},setAttribute(){},querySelectorAll(){return []},
    remove(){root=null}};},
  addEventListener(){},querySelectorAll(){return []}
};
const pushed=[];
const id='00000000-0000-0000-0000-000000000123';
const stateUrl={value:'http://jellyfin.test/web/index.html#!/home'};
const location={href:'http://jellyfin.test/web/index.html#!/home',pathname:'/web/index.html', hash:'#!/home', assign(){}};
const history={state:{},pushState(_state,_title,url){pushed.push(url);const uri=new URL(url,'http://jellyfin.test');stateUrl.value=uri.href;location.search=uri.search;location.href=uri.href},back(){}};
location.search='';
const window={ApiClient:{accessToken:()=> 'jf-user-a'},addEventListener(){},Emby:{Page:{showItem(n){window.nativeId=n;}}}};
const sandbox={document,window,history,location,sessionStorage:{setItem(){}},
  URL:class URLWrapper extends URL{constructor(input,base){super(input==='http://jellyfin.test/web/index.html#!/home'?stateUrl.value:input,base)}},
  MutationObserver:class{observe(){}},IntersectionObserver:class{observe(){}},
  fetch:async url=>{if(url.includes('/item/'))return {ok:true,json:async()=>({item:{id,title:'Tytuł testowy',type:'Series',anime:false,genres:[],rating:null},seasons:[],episodes:[]})};throw Error(url)},
  setTimeout,clearTimeout,console,URLSearchParams,alert(){},
};
vm.runInNewContext(exposed,sandbox,{filename:'client.js'});
(async()=>{
  const mf=sandbox.mfTest;
  mf.setReady(true);
  const item={id,title:'Tytuł testowy',type:'Series',anime:false,genres:[],year:2025,date_added:'2026-11-10',rating:null,plot:'opis',has_image:false};
  mf.setItems([item]);
  assert(mf.inject(),'native home should mount when Jellyfin user is logged in');
  assert.equal(root.parentElement,host);
  assert.equal(root.id,'mf-portal');
  assert.equal(root.className,'mf-native-home');
  assert.match(root.innerHTML,/Moje MAL/);
  assert.doesNotMatch(root.innerHTML,/mf-leave|data-mf-close|mf-launch/);
  mf.toTab('anime');
  assert.equal(mf.getState().tab,'anime');
  assert(pushed.at(-1).includes('misioflix=anime'),'tab must be routed in browser history');
  await mf.showDetails(id);
  assert.equal(mf.getState().detail.item.id,id);
  assert(pushed.at(-1).includes('misioflix=detail'),'detail must be bookmarkable/back-navigable');
  assert(content.innerHTML.includes('Tytuł testowy'),'details should render within native home');
  mf.openNative(id);
  assert.equal(window.nativeId,id,'native Jellyfin details/player must be used');
  assert.equal(mf.getState().open,false,'custom home should not stay over native player');
  console.log('PASS v0.4.6 native home mount, library route, details, native player handoff');
})().catch(err=>{console.error(err);process.exitCode=1});
