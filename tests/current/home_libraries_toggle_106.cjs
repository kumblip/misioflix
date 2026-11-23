// Regression: one default-green Home control must show exactly ONE content type.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8');
const start=source.indexOf('  function homeContentModeToggle(){');
const end=source.indexOf('  // v0.4.108: this filter',start);
assert(start>=0&&end>start,'test uses the new actual Home toggle');
const mount=source.slice(source.indexOf('  function mount(host){'),source.indexOf('  function unmountHome(){'));
assert(mount.indexOf('homeRoot.appendChild(resumeShelf())')<mount.indexOf('homeContentModeToggle()'));
assert(mount.indexOf('homeContentModeToggle()')<mount.indexOf('homeRoot.appendChild(rowsArea)'));
assert(mount.includes("append(switches,homeContentModeToggle(),recommendationAnimeToggle())"));
assert(!mount.includes('libraryShelvesToggle()')&&!mount.includes('recommendationToggle()'));
assert(mount.includes('rowsArea.hidden=true')&&mount.includes('genreArea.hidden=false'));
assert(mount.includes('librariesReadyPromise=loadLibraries(serial)'));
assert(mount.includes('homeRoot.appendChild(collectionsPage.section)'));
assert(css.includes('.mf-home-0412 [hidden]{display:none!important}'));
assert(css.includes('.mf-home-content-mode-toggle[data-mf-home-mode="recommendations"]'));
assert(css.includes('.mf-home-content-mode-toggle[data-mf-home-mode="libraries"]'));
class Element{
 constructor(tag,cls='',value=''){this.tag=tag;this.className=cls;this.textContent=String(value);this.attrs={};this.dataset={};this.children=[];this.listeners={};this.hidden=false;}
 setAttribute(k,v){this.attrs[k]=String(v)}
 appendChild(ch){this.children.push(ch);return ch}
 addEventListener(evt,fn){this.listeners[evt]=fn}
}
const rows=new Element('div','mf-home-rows');rows.hidden=true;
const proposals=new Element('div','mf-home-recommendations');proposals.hidden=false;
let initialized=0;
const homeRoot={isConnected:true,querySelector:q=>q==='#mf-home-rows'?rows:q==='#mf-home-recommendations'?proposals:null};
const ctx={homeRoot,own:(t,c,v='')=>new Element(t,c,v),append:(p,...kids)=>kids.forEach(k=>p.appendChild(k)),recommendationInitialized:true,initializeRecommendations:()=>initialized++,epoch:5};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end),ctx);
const btn=ctx.homeContentModeToggle().children[0];
assert.equal(btn.tag,'button');
assert.equal(btn.attrs.role,'switch');
assert.equal(btn.attrs['aria-checked'],'true');
assert.equal(btn.attrs['aria-controls'],'mf-home-recommendations mf-home-rows');
assert.equal(btn.dataset.mfHomeMode,'recommendations');
assert.equal(btn.children[1].textContent,'💡');
assert.equal(btn.children[2].textContent,'Propozycje');
const verify=(recs,libs)=>{assert.equal(proposals.hidden,!recs);assert.equal(rows.hidden,!libs);assert.notEqual(proposals.hidden,rows.hidden,'exactly one set of carousels visible')};
verify(true,false);
for(let i=0;i<6;i++){
 btn.listeners.click();
 const showProposals=i%2===1;
 verify(showProposals,!showProposals);
 assert.equal(btn.attrs['aria-checked'],String(showProposals));
 assert.equal(btn.children[1].textContent,showProposals?'💡':'📚');
 assert.equal(btn.children[2].textContent,showProposals?'Propozycje':'Biblioteki');
 assert.equal(btn.dataset.mfHomeMode,showProposals?'recommendations':'libraries');
}
assert.equal(initialized,0,'no redundant recommendations load');
ctx.recommendationInitialized=false;
btn.listeners.click();verify(false,true);
btn.listeners.click();verify(true,false);assert.equal(initialized,1,'retry recommendations only on return');
const saved=btn.dataset.mfHomeMode;homeRoot.isConnected=false;btn.listeners.click();assert.equal(btn.dataset.mfHomeMode,saved,'unmounted control is inert');
const remounted=ctx.homeContentModeToggle().children[0];assert.equal(remounted.dataset.mfHomeMode,'recommendations');
assert(!source.slice(start,end).includes('localStorage')&&!source.slice(start,end).includes('sessionStorage'));
console.log('PASS single Home view toggle: 2 exclusive states, accessibility, no persistence, no duplicate loads');
