// v0.4.66 regression: native metadata editor never triggers a dashboard redirect.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/details.js'),'utf8');
const id='a'.repeat(32);
function scene(command='edit',options={}) {
 const jobs=[],handlers={},dialogs=[],warnings=[],observers=[];
 const location={hash:`#/details?id=${id}`};
 const menu={textContent:options.label||'Edytuj metadane',dataset:{id:command},getAttribute(attr){return attr==='data-id'?command:null;},getClientRects(){return [{}]}};
 const document={readyState:'complete',body:{},addEventListener(type,fn){(handlers[type]??=[]).push(fn)},
   querySelectorAll(selector){return selector.includes('.editItemMetadataForm')?dialogs:[]},
   querySelector(selector){return selector.includes('.editItemMetadataForm')?dialogs[0]||null:null}};
 const window={location,addEventListener(){},setTimeout(fn,delay){jobs.push({fn,delay});return jobs.length}};
 class MutationObserver{constructor(fn){this.fn=fn;observers.push(this)}observe(){}disconnect(){}}
 vm.runInNewContext(source,{window,document,console:{warn(...args){warnings.push(args)},error(){},log(){}},MutationObserver,URLSearchParams});
 const click=handlers.click.find(fn=>fn.name==='recoverNativeMetadataEdit');
 assert.ok(click);
 const target={closest(selector){return selector.includes('.actionSheetMenuItem')?menu:null}};
 return {click(){click({target})},jobs,dialogs,location,warnings,observers,
   run(delay){for(const job of jobs.filter(j=>j.delay===delay))job.fn()},
   mutate(){for(const observer of observers)observer.fn([])}};
}
{
 const s=scene();s.click();
 assert.equal(s.location.hash,`#/details?id=${id}`);
 assert.equal(s.jobs.filter(j=>j.delay===0).length,1,'native action-sheet handler runs before DOM handoff');
 assert.equal(s.jobs.filter(j=>j.delay===8000).length,1);
 s.run(0);s.run(8000);
 assert.equal(s.location.hash,`#/details?id=${id}`,'no Metadata Manager redirect');
 assert.equal(s.warnings.length,1,'diagnosis is logged without hijacking the route');
}
{
 const s=scene();s.click();
 // An action sheet's generic formDialog is NOT the actual metadata editor.
 s.run(0);
 assert.equal(s.dialogs.length,0);
 s.run(8000);
 assert.equal(s.location.hash,`#/details?id=${id}`);
}
{
 const s=scene();s.click();s.run(0);
 const form={isConnected:true,hidden:false,getClientRects(){return [{}]}};
 s.dialogs.push(form);s.mutate();s.run(8000);
 assert.equal(s.warnings.length,0);
 assert.equal(s.location.hash,`#/details?id=${id}`);
 s.dialogs.pop();s.mutate(); // cleanup on editor removal
}
for(const command of ['editimages','refresh','identify','delete']){
 const s=scene(command);s.click();s.run(8000);
 assert.equal(s.location.hash,`#/details?id=${id}`);
 assert.equal(s.jobs.filter(j=>j.delay===8000).length,0);
}
assert.ok(!source.includes("window.location.hash='#/metadata'"));
console.log('PASS v0.4.66: real editor form distinct from action sheet; no forced metadata manager');
