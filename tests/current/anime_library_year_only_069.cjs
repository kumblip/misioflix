'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const js=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/client.js'),'utf8');
const start=js.indexOf('  function attachOverlay(card){');
const end=js.indexOf('  // Enrich the ORIGINAL Jellyfin card',start);
assert.ok(start>=0 && end>start, 'actual implementation must be present');
const source=js.slice(start,end);
let mixed=true;
class Element {
  constructor(cls='',value=''){
    this.className=cls;this.textContent=value;
    this.children=[];this.attributes=new Map();this.parent=null;
  }
  appendChild(el){this.children.push(el);el.parent=this;return el;}
  getAttribute(k){return this.attributes.get(k)||null;}
  setAttribute(k,v){this.attributes.set(k,String(v));}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}
  querySelector(sel){
    if(sel===':scope > .mf-native-overlay')return this.children.find(c=>c.className==='mf-native-overlay')||null;
    if(sel==='.cardScalable,.MuiCardMedia-root')return this.surface||null;
    return null;
  }
}
const modernMixedRoute=()=>mixed;
const cardKind=c=>c.kind;
const cardYear=c=>c.year;
const stats=()=>[];
const genres=()=>[];
const makeEl=(tag,cls,value)=>new Element(cls,value||'');
const paw=()=>new Element('paw');
const attachOverlay=Function('modernMixedRoute','cardKind','cardYear','stats','genres','makeEl','paw',source+';return attachOverlay;')(
  modernMixedRoute,cardKind,cardYear,stats,genres,makeEl,paw
);
function card(kind,year,format){
  const c=new Element('card');c.kind=kind;c.year=year;
  c.surface=new Element('cardScalable');
  c.setAttribute('data-mf-format',format);
  return c;
}
function label(c){
  const overlay=c.surface.querySelector(':scope > .mf-native-overlay');
  const top=overlay?.children.find(x=>x.className==='mf-native-top');
  const left=top?.children.find(x=>x.className==='mf-native-top-left');
  return left?.children.find(x=>x.className==='mf-native-year')?.textContent;
}
const anime=card('anime','2019','Seria TV');
attachOverlay(anime);
assert.equal(label(anime),'2019','anime /mixed: only the year');
const firstOverlay=anime.surface.children[0];
attachOverlay(anime);
assert.equal(anime.surface.children[0],firstOverlay,'no unnecessary remake on unchanged route');
mixed=false;
attachOverlay(anime);
assert.equal(label(anime),'2019 · Seria TV','outside /mixed: full label preserved');
assert.notEqual(anime.surface.children[0],firstOverlay,'route change invalidates overlay signature');
mixed=true;
attachOverlay(anime);
assert.equal(label(anime),'2019','return to library: year only');
const serial=card('serial','2023','Seria TV');
attachOverlay(serial);
assert.equal(label(serial),'2023 · Seria TV','non-anime unchanged');
const movie=card('film','2022','Film');
attachOverlay(movie);
assert.equal(label(movie),'2022','movies unchanged');
const ona=card('anime','2024','ONA');
attachOverlay(ona);
assert.equal(label(ona),'2024','anime ONA /mixed: type hidden');
mixed=false;
attachOverlay(ona);
assert.equal(label(ona),'2024 · ONA','anime ONA outside library: type kept');
console.log('PASS: original anime library badge keeps only year; all other labels preserved and route transitions update');
