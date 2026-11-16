// v0.4.89 — use the actual home.js poster renderer, not a copied mock algorithm.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const start=source.indexOf('  function imageFor(item){');
const end=source.indexOf('  // Pointer-driven mouse / stylus drag',start);
assert(start>=0&&end>start);
class Element {
  constructor(tag,cls='',value=''){this.tag=tag;this.className=cls;this.textContent=String(value);this.children=[];this.attributes={};this.dataset={};this.listeners={};this.classList={add:()=>{}};}
  appendChild(child){this.children.push(child);child.parent=this;return child}
  setAttribute(k,v){this.attributes[k]=v;return this}
  addEventListener(k,f){this.listeners[k]=f}
  remove(){}
}
const create=(t,cls='',v='')=>new Element(t,cls,v);
const ctx={own:create,set:(e,k,v)=>{e.setAttribute(k,v);return e},append:(e,...children)=>{children.forEach(c=>e.appendChild(c));return e},
  validId:id=>/^[a-f0-9]{32}$/.test(String(id).replace(/-/g,'')),compactId:id=>String(id).replace(/-/g,''),nativeDetails:id=>'#/details?id='+id,
  short:v=>v==null||v===''?'':String(v),paw:()=>create('svg','mf-home-paw'),
  document:{createElement:tag=>create(tag)}};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end),ctx);
const item={type:'BoxSet',id:'0123456789abcdef0123456789abcdef',hasPrimary:true,year:2006,collectionCount:3,title:'Kolekcja testowa',genres:['Akcja']};
const poster=ctx.makePoster(item);
const count=poster.children.find(el=>el.className==='mf-home-collection-count');
assert(count,'collection count exists on the poster');
assert.equal(count.textContent,'3 🎬');
assert.equal(count.parent,poster,'count lives directly on the poster, not in the left stack');
assert.equal(count.attributes['aria-label'],'3 filmów w kolekcji');
const left=poster.children.find(el=>el.className==='mf-home-top-left');
assert(left);
assert(!left.children.some(el=>el.className==='mf-home-collection-count'));
assert(left.children.some(el=>el.textContent==='KOLEKCJA'));
assert(left.children.some(el=>el.textContent==='2006'));
const fullPageTile=ctx.makeCard(item); // Collections grid and home shelf both call makeCard.
assert(fullPageTile.children[0].children.some(el=>el.className==='mf-home-collection-count'));
const movie=ctx.makePoster({...item,type:'Movie'});
assert(!movie.children.some(el=>el.className==='mf-home-collection-count'));
const css=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8');
assert(css.includes('#itemDetailPage .collectionItems .card .countIndicator::after'),'native movie-detail BoxSets decorated');
assert(css.includes('.mf-home-collection-card .mf-home-collection-count {'),'home badge positioned independently');
assert(css.includes('content:"🎬"'),'native Jellyfin child count gains a clapper');
assert(css.includes('top:8px!important;right:8px!important;left:auto!important'));
console.log('PASS v0.4.89: home shelf, Collections directory, native movie details share right-top count+clapper');
