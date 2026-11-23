'use strict';
// No browser library is required in CI; the real home.js card/modal functions
// are executed with lightweight DOM nodes and asserted for data integrity.
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), assert=require('node:assert/strict');
const root=path.join(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8');
class Node {
  constructor(tag='div',cls='',txt=''){
    this.tag=tag;this.className=cls;this.textContent=String(txt);
    this.children=[];this.listeners={};this.attrs={};this.isConnected=true;
    this.classList={add:()=>{},remove:()=>{}};
  }
  appendChild(child){this.children.push(child);return child}
  setAttribute(key,value){this.attrs[key]=String(value)}
  addEventListener(event,cb){this.listeners[event]=cb}
  remove(){this.isConnected=false}
  focus(){this.focused=true}
}
const body=new Node('body');
body.classList={add:()=>{},remove:()=>{}};
const ctx={
  own:(tag,cls='',text='')=>new Node(tag,cls,text),
  append:(node,...items)=>{for(const item of items)node.appendChild(item);return node;},
  set:(node,k,v)=>{node.setAttribute(k,v);return node},
  nativeDetails:(id)=>'#/details?id='+id,
  makePoster:()=>new Node('a','mf-home-poster'),
  imageFor:(item)=>item.hasPrimary?'/Items/'+item.id+'/Images/Primary?maxHeight=480&quality=84':'',
  closeSearch:()=>{},
  document:{body,activeElement:null},
};
vm.createContext(ctx);
const modalSrc=src.slice(src.indexOf('  let cardInfoModal = null;'),src.indexOf('  function sortCatalog('));
assert(modalSrc.includes('function openCardInfo('));
vm.runInContext(modalSrc,ctx);
const cardSrc=src.slice(src.indexOf('  function makeCard(item){'),src.indexOf('  function enableShelfDrag('));
vm.runInContext(cardSrc,ctx);
const item={id:'a'.repeat(32),title:'Pełny i bardzo długi tytuł',
  type:'Series',anime:true,hasPrimary:true,description:'Cały opis, bez skracania i pomijania akapitów.',
  genres:['Romans','Komedia','Fantasy','Akcja','Szkoła']};
const card=ctx.makeCard(item);
assert.equal(card.tag,'article');
const titleRow=card.children[1].children[0];
assert.equal(titleRow.className,'mf-home-card-title-row');
assert.equal(titleRow.children[0].textContent,item.title);
const info=titleRow.children[1];
assert.equal(info.className,'mf-home-card-info-button');
assert.equal(info.tag,'button');
assert(info.listeners.click,'Info must be clickable');
info.listeners.click();
assert.equal(body.children.length,1);
const overlay=body.children[0];
const dialog=overlay.children[0];
assert.equal(dialog.attrs['aria-modal'],'true');
const header=dialog.children[0];
assert.equal(header.children[0].textContent,item.title);
const layout=dialog.children[1];
assert.equal(layout.className,'mf-home-card-info-layout');
const posterWrap=layout.children[0];
assert.equal(posterWrap.className,'mf-home-card-info-poster-wrap');
assert.equal(posterWrap.children[0].tag,'img');
assert.match(posterWrap.children[0].src,/Items\/a{32}\/Images\/Primary/);
assert.equal(posterWrap.children[0].alt,'Plakat: '+item.title);
const content=layout.children[1];
assert.equal(content.children[1].children.length,5);
assert.deepEqual(content.children[1].children.map(x=>x.textContent),item.genres);
assert.equal(content.children[3].textContent,item.description);
const actions=dialog.children[2];
assert.equal(actions.children[0].textContent,'Otwórz');
assert.equal(actions.children[1].textContent,'Zamknij');
assert.equal(actions.children[0].attrs.href,'#/details?id='+item.id);
actions.children[1].listeners.click();
assert.equal(overlay.isConnected,false);
assert.equal(info.focused,true);
assert(src.includes('genreArea.hidden=false'));
assert(src.includes('void initializeRecommendations(serial)'));
assert(src.includes("label.textContent=showProposals?'Propozycje':'Biblioteki'"));
assert(css.includes('.mf-home-card-info-button'));
assert(css.includes('.mf-home-card-info-dialog'));
console.log('PASS 0.4.111: complete read-only info popup, five genres, close/open, focus and visible-by-default proposals');
