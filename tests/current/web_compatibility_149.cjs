const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../../src/Jellyfin.Plugin.MisioFlix/Web/configPage.html'),'utf8');
const script=html.slice(html.indexOf('  const compatibility=(()=>{'),html.indexOf('  const diagnostics=(()=>{'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(initial={},failRead=false){
 let config={MalClientId:'preserved',...initial},reads=0,writes=0,writeFailure=false;
 const node=()=>({disabled:false,textContent:'',listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}});
 const ids=['form','status','save','reset','reload'];
 const nodes=Object.fromEntries(ids.map(id=>['#mf-compatibility-'+id,node()]));
 const fields=Array.from(html.matchAll(/data-mf-web-module="(Web\w+Enabled)"/g),m=>({dataset:{mfWebModule:m[1]},checked:true,disabled:false}));
 const panel=Object.assign(node(),{open:false,querySelector:id=>nodes[id],querySelectorAll:()=>fields});
 const ApiClient={async getPluginConfiguration(){reads++;if(failRead)throw Error('offline');return {...config};},async updatePluginConfiguration(id,next){writes++;if(writeFailure)throw Error('denied');config={...next};}};
 const ctx={view:{querySelector:()=>panel},ApiClient,pluginId:'test'};vm.createContext(ctx);vm.runInContext(script+'\nglobalThis.compat=compatibility;',ctx);
 const fire=(id,event)=>nodes['#mf-compatibility-'+id].listeners[event]({preventDefault(){}});
 return {fields,panel,fire,activate:()=>ctx.compat.activate(),open(){panel.open=true;panel.listeners.toggle();},config:()=>config,reads:()=>reads,writes:()=>writes,failWrite(){writeFailure=true;},status:()=>nodes['#mf-compatibility-status'].textContent,save:()=>nodes['#mf-compatibility-save']};
}
test('closed panel is lazy; missing options default true; persisted false remains false',async()=>{
 const f=fixture({WebMalEnabled:false});f.activate();assert.equal(f.reads(),0);assert.equal(f.save().disabled,true);f.open();await tick();assert.equal(f.reads(),1);assert.equal(f.fields.filter(x=>!x.checked).length,1);assert.equal(f.fields.find(x=>x.dataset.mfWebModule==='WebMalEnabled').checked,false);assert.equal(f.save().disabled,false);
});
test('save only module fields, preserve unrelated config, reset requires save',async()=>{
 const f=fixture();f.open();await tick();f.fields.find(x=>x.dataset.mfWebModule==='WebNextWatchEnabled').checked=false;await f.fire('form','submit');assert.equal(f.config().WebNextWatchEnabled,false);assert.equal(f.config().MalClientId,'preserved');assert.equal(f.writes(),1);assert.match(f.status(),/Ctrl\+F5/);f.fire('reset','click');assert.ok(f.fields.every(x=>x.checked));assert.equal(f.writes(),1);await f.fire('form','submit');assert.equal(f.config().WebNextWatchEnabled,true);
});
test('failed load prevents overwrite; failed save reports error and permits retry',async()=>{
 const f=fixture({},true);f.open();await tick();assert.match(f.status(),/Błąd wczytywania/);assert.equal(f.save().disabled,true);await f.fire('form','submit');assert.equal(f.writes(),0);
 const g=fixture();g.open();await tick();g.failWrite();await g.fire('form','submit');assert.match(g.status(),/Błąd zapisu/);assert.equal(g.save().disabled,false);
});
test('details helper-only script exposes native play without attaching observers or listeners; duplicate evaluation is harmless',()=>{
 const code=fs.readFileSync(require.resolve('../../src/Jellyfin.Plugin.MisioFlix/Web/details.js'),'utf8');
 const ctx={window:{},document:{currentScript:{getAttribute:key=>key==='data-mf-playback-only'?'true':null},addEventListener(){throw Error('unexpected listener');}},MutationObserver:function(){throw Error('unexpected observer');}};
 vm.createContext(ctx);vm.runInContext(code,ctx);const play=ctx.window.MisioFlixPlayItem;assert.equal(typeof play,'function');vm.runInContext(code,ctx);assert.equal(ctx.window.MisioFlixPlayItem,play);
});
