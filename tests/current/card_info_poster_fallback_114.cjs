'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
class El {
 constructor(tag,cls='',val='') {this.tag=tag;this.className=cls;this.textContent=String(val);this.children=[];this.listeners={};this.attrs={};this.isConnected=true;this.classList={add(){},remove(){}};}
 appendChild(v){this.children.push(v);return v}
 setAttribute(k,v){this.attrs[k]=String(v)}
 addEventListener(k,v){this.listeners[k]=v}
 remove(){this.isConnected=false}
 focus(){this.focused=true}
}
const body=new El('body');
const ctx={own:(...args)=>new El(...args),set:(n,k,v)=>{n.setAttribute(k,v);return n},append:(n,...c)=>{c.forEach(x=>n.appendChild(x));return n},imageFor:(item)=>item.hasPrimary?'/Items/'+item.id+'/Images/Primary':'',nativeDetails:(id)=>'#/details?id='+id,closeSearch:()=>{},document:{body,activeElement:null}};
vm.createContext(ctx);
vm.runInContext(src.slice(src.indexOf('  let cardInfoModal = null;'),src.indexOf('  function sortCatalog(')),ctx);
const base={id:'b'.repeat(32),title:'Przykładowy tytuł',genres:['Romans','Fantasy'],description:'Pełny opis.'};
ctx.openCardInfo({...base,hasPrimary:false});
let modal=body.children.at(-1),wrap=modal.children[0].children[1].children[0];
assert.equal(wrap.children.length,1);
assert.equal(wrap.children[0].textContent,'Brak plakatu');
assert.equal(modal.children[0].children[2].children[0].textContent,'Otwórz');
assert.equal(modal.children[0].children[2].children[1].textContent,'Zamknij');
ctx.closeCardInfo();
ctx.openCardInfo({...base,hasPrimary:true});
modal=body.children.at(-1);wrap=modal.children[0].children[1].children[0];
const img=wrap.children[0];
assert.equal(img.tag,'img');
img.listeners.error();
assert.equal(img.isConnected,false);
assert.equal(wrap.children[1].hidden,false);
assert.equal(modal.children[0].children[1].children[1].children[3].textContent,base.description);
console.log('PASS 0.4.114: poster URL, missing-poster fallback, error fallback, full details, reversed actions');
