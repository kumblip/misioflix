
'use strict';
const assert = require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/details.js'),'utf8');
const itemId='a'.repeat(32);
function scene(command='edit', options={}) {
 const jobs=[];const handlers={};const dialogs=[];const warnings=[];
 const location={hash:`#/details?id=${itemId}`, get href(){return `http://localhost/web/${this.hash}`;}};
 const menu={textContent:options.label||'Edytuj metadane',dataset:{id:command},getAttribute(name){return name==='data-id'?command:null;},getClientRects(){return [{}];}};
 const document={readyState:'complete',body:{},addEventListener(name,fn){(handlers[name]??=[]).push(fn)},querySelectorAll(query){return query.includes('.formDialog')?dialogs:[];}};
 const window={location,addEventListener(){},setTimeout(fn,delay){jobs.push({fn,delay});return jobs.length;}};
 class MutationObserver{observe(){}}
 vm.runInNewContext(source,{window,document,console:{warn(...args){warnings.push(args)},error(){},log(){}} ,MutationObserver,URLSearchParams});
 const click=handlers.click.find(fn=>fn.name==='recoverNativeMetadataEdit');
 assert.ok(click);
 const target={closest(selector){return selector.includes('.actionSheetMenuItem')?menu:null;}};
 return {click(){click({target})},jobs,dialogs,location,warnings,fire(){for(const job of jobs.filter(job=>job.delay===3000)) job.fn();}};
}
// The Jellyfin dialog is authoritative; the recovery never preempts it.
{
 const s=scene();s.click();assert.equal(s.location.hash,`#/details?id=${itemId}`);
 assert.equal(s.jobs.filter(job=>job.delay===3000).length,1);
 s.dialogs.push({isConnected:true,hidden:false,getClientRects(){return [{}]}});
 s.fire();assert.equal(s.location.hash,`#/details?id=${itemId}`);
}
// If the native dialog doesn't materialize, only the known Metadata Manager is used.
{
 const s=scene();s.click();s.fire();assert.equal(s.location.hash,'#/metadata');
}
// If Jellyfin navigates on its own, do not intervene.
{
 const s=scene();s.click();s.location.hash='#/some-native-dialog';s.fire();assert.equal(s.location.hash,'#/some-native-dialog');
}
// Other menu commands cannot trigger this recovery, even if text is similar.
for(const cmd of ['editimages','refresh','identify','delete']) {
 const s=scene(cmd);s.click();s.fire();assert.equal(s.location.hash,`#/details?id=${itemId}`);
}
assert.ok(!source.includes('edititemmetadata.html'));
console.log('PASS v0.4.59: native edit modal or real metadata manager; no removed legacy routes');
