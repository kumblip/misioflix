// Regression: native Home continues to work with a default-OFF library shelf switch.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8');
const start=source.indexOf('  function libraryShelvesToggle(){');
const end=source.indexOf('  async function loadLibraries(serial)',start);
assert(start>=0&&end>start,'test runs actual home.js toggle');
const mount=source.slice(source.indexOf('  function mount(host){'),source.indexOf('  function unmountHome(){'));
assert(mount.indexOf('homeRoot.appendChild(resumeShelf())')<mount.indexOf('libraryShelvesToggle()'));
assert(mount.indexOf('libraryShelvesToggle()')<mount.indexOf('homeRoot.appendChild(rowsArea)'));
assert(source.includes("rowsArea.id='mf-home-rows';"),'switch points at the actual shelf container');
assert(source.includes('rowsArea.hidden=true;'),'initial state is OFF');
assert(source.includes("librariesReadyPromise=loadLibraries(serial)"),'library metadata still loads for hero/search shortcuts');
assert(source.includes("homeRoot.appendChild(collectionsPage.section);"),'collections page is not removed');
assert(css.includes('.mf-home-0412 [hidden]{display:none!important}'),'hidden shelves cannot be made visible by flex styling');
assert(css.includes('.mf-home-libraries-toggle:focus-visible'),'keyboard focus is visible');
class Element{
  constructor(tag,cls='',value=''){
    this.tag=tag;this.className=cls;this.textContent=String(value);this.attrs={};this.children=[];this.listeners={};this.hidden=false;
  }
  setAttribute(k,v){this.attrs[k]=String(v);}
  appendChild(ch){this.children.push(ch);return ch;}
  addEventListener(evt,fn){this.listeners[evt]=fn;}
  querySelector(query){
    if(query==='.mf-home-rows')return this.rows;
    return null;
  }
}
const rows=new Element('div','mf-home-rows');rows.hidden=true;
const homeRoot={querySelector:q=>q==='.mf-home-rows'?rows:null};
const ctx={homeRoot,own:(t,c,v='')=>new Element(t,c,v),append:(p,...kids)=>kids.forEach(k=>p.appendChild(k))};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end),ctx);
const control=ctx.libraryShelvesToggle();
assert.equal(control.className,'mf-home-libraries-control');
const btn=control.children[0];
assert.equal(btn.tag,'button');
assert.equal(btn.attrs.role,'switch');
assert.equal(btn.attrs['aria-checked'],'false');
assert.equal(btn.attrs['aria-expanded'],'false');
assert.equal(btn.attrs['aria-controls'],'mf-home-rows');
assert.equal(btn.children[1].textContent,'Pokaż biblioteki');
btn.listeners.click();
assert.equal(rows.hidden,false);
assert.equal(btn.attrs['aria-checked'],'true');
assert.equal(btn.attrs['aria-expanded'],'true');
assert.equal(btn.children[1].textContent,'Ukryj biblioteki');
btn.listeners.click();
assert.equal(rows.hidden,true);
assert.equal(btn.attrs['aria-checked'],'false');
assert.equal(btn.attrs['aria-expanded'],'false');
assert.equal(btn.children[1].textContent,'Pokaż biblioteki');
// A remount produces the same default OFF state without session/localStorage.
const second=ctx.libraryShelvesToggle().children[0];
assert.equal(second.attrs['aria-checked'],'false');
assert.equal(second.children[1].textContent,'Pokaż biblioteki');
// Stale callbacks after unmount must not touch deleted content.
ctx.homeRoot=null;
second.listeners.click();
assert.equal(second.attrs['aria-checked'],'false');
assert(!source.slice(start,end).includes('localStorage'),'toggle never changes persistent account state');
console.log('PASS v0.4.106: shelves hidden by default; click show/hide; aria sync; remount OFF; search unaffected');
