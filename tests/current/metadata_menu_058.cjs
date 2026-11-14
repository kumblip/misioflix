'use strict';
// Contract test for Jellyfin's native metadata menu recovery (no live server).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/details.js'),'utf8');
const itemId = 'a'.repeat(32);

function createScene(label, options={}) {
  const timerJobs=[];
  const handlers={};
  const dialogs=[];
  const routes=[];
  const location={hash:`#/details?id=${itemId}`,pathname:'/web/',search:'', get href(){return `http://localhost${this.pathname}${this.hash}`;}};
  const menu={textContent:label,getClientRects(){return [{}];}};
  const document={
    readyState:'complete',body:{},
    addEventListener(name,cb){(handlers[name]??=[]).push(cb);},
    querySelectorAll(query){return query.includes('[role="dialog"]')?dialogs:[];},
  };
  const window={location,Dashboard: options.dashboard===false?undefined:{navigate(route){routes.push(route);}},
    addEventListener(){},
    setTimeout(fn,delay){timerJobs.push({fn,delay});return timerJobs.length;},
  };
  class MutationObserver { observe(){} }
  vm.runInNewContext(src,{window,document,MutationObserver,URLSearchParams,console});
  const click=handlers.click.find(handler=>handler.name==='recoverNativeMetadataEdit');
  assert.ok(click,'recovery listener should be installed');
  const target={closest(selector){return selector.includes('[role="menuitem"]')?menu:null;}};
  return {click:()=>click({target}),menus:menu,routes,dialogs,location,fire(){for(const job of timerJobs.filter(x=>x.delay===950))job.fn();}};
}
// The normal Jellyfin action receives its click. Only after no effect for 950ms do we open the native editor.
{
 const scene=createScene('Edytuj metadane');
 scene.click();
 assert.deepEqual(scene.routes,[],'native action must have the opportunity to work first');
 scene.fire();
 assert.deepEqual(scene.routes,[`edititemmetadata.html?id=${itemId}`]);
}
// Works with the English localization and the fallback route when Dashboard is not exposed.
{
 const scene=createScene('editEdit metadata',{dashboard:false});
 scene.click();scene.fire();
 assert.equal(scene.location.hash,`#!/edititemmetadata.html?id=${itemId}`);
}
// Every other context menu option remains solely in Jellyfin's hands.
for(const label of ['Edytuj obrazy','Identyfikuj','Odśwież metadane','Usuń serial']){
 const scene=createScene(label);scene.click();scene.fire();
 assert.equal(scene.routes.length,0);
 assert.equal(scene.location.hash,`#/details?id=${itemId}`);
}
// A working native editor takes precedence over the recovery fallback.
{
 const scene=createScene('Edytuj metadane');
 scene.click();
 scene.dialogs.push({isConnected:true,hidden:false,getClientRects(){return [{}];}});
 scene.fire();assert.equal(scene.routes.length,0);
}
{
 const scene=createScene('Edytuj metadane');
 scene.click();scene.location.hash='#/edititemmetadata.html?id='+itemId;
 scene.fire();assert.equal(scene.routes.length,0);
}
console.log('PASS v0.4.58: metadata action only, native-first, modern/legacy router fallbacks, no interference with other commands');
