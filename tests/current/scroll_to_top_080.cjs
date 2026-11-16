'use strict';
// Targeted regression for the ONE floating control on native pages & search.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/client.js'),'utf8');
const home=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8');
const detail=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/details.js'),'utf8');
const start=source.indexOf('  function installScrollTopControl(){');
const end=source.indexOf('  function init(){',start);
assert.ok(start>0&&end>start);
class Pane{
 constructor(top=0){this.nodeType=1;this.isConnected=true;this.hidden=false;this.scrollTop=top;this.clientHeight=600;this.scrollHeight=1400;this.classList={contains:()=>false};this.parentElement=null;}
 scrollTo(obj){this.scrollTop=obj.top;}
 closest(){return null;}
 getClientRects(){return [{}];}
}
const rootPane=new Pane(380),modalPane=new Pane(350);
let modalOpen=false,control,scrollEvent,searchToggle;
const body={append(x){control=x},addEventListener(){},classList:{contains:()=>false}};
const events={};
const doc={body,scrollingElement:rootPane,documentElement:{classList:{contains:()=>true}},
 getElementById:()=>null,createElement:()=>({hidden:true,setAttribute(){},addEventListener(type,cb){if(type==='click')this.click=cb}}),
 querySelector:q=>q.includes('.mf-home-search-modal-main')&&modalOpen?modalPane:null,
 querySelectorAll:()=>[],addEventListener:(type,cb)=>{if(type==='scroll')scrollEvent=cb;}};
const win={setTimeout(fn){fn()},requestAnimationFrame(fn){fn()},addEventListener:(n,cb)=>{events[n]=cb},scrollTo(){rootPane.scrollTop=0}};
const env={document:doc,window:win,MutationObserver:class{observe(){}},Set,console};
vm.runInNewContext(source.slice(start,end)+'\ninstallScrollTopControl();',env);
assert.ok(control,'one shared button exists');
assert.equal(control.hidden,false,'native details scroll displays the control');
control.click();assert.equal(rootPane.scrollTop,0,'native page scrolls to top');
modalOpen=true;rootPane.scrollTop=540;events['misioflix-search-toggle']();
assert.equal(control.hidden,false,'search modal scroll displays the control');
control.click();assert.equal(modalPane.scrollTop,0,'search modal scrolls to top');
assert.equal(rootPane.scrollTop,540,'background remains where it was while search modal is open');
modalOpen=false;events['misioflix-search-toggle']();
assert.equal(control.hidden,false,'background button works again after search closes');
assert.ok(css.includes('html.misioflix-skin #mf-scroll-to-top'));
assert.ok(home.includes('Pokaż osobno sezony/speciale/itd.'));
assert.ok(home.includes('misioflix-search-toggle'));
assert.ok(detail.includes("page.querySelector('#listChildrenCollapsible')"));
assert.ok(detail.includes('episodeAnchor.parentNode.insertBefore(nav,episodeAnchor)'));
assert.ok(!detail.includes('primary.append(nav)'));
console.log('PASS v0.4.80: shared floating top button + search modal priority + nav before native episode section');
