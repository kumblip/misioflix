// DOM emulation focusing on the exact Jellyfin 12.4 structure supplied by the user.
// This is a source-level smoke test, not a browser/NAS integration test.
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../src/Jellyfin.Plugin.MisioFlix/Web/client.js'),'utf8');
let createdNewCards=0,navigated=0,networkCalls=0;
class El {
  constructor(tag,cls='',value=''){
    this.tagName=tag.toUpperCase();this.className=cls;this.textContent=value;
    this.attrs={};this.children=[];this.parentElement=null;this.style={};
    this.dataset=new Proxy({}, {set:(o,k,v)=>{this.attrs['data-'+k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())]=String(v);o[k]=String(v);return true},get:(o,k)=>o[k]});
    this.classList={add:(v)=>{if(!this.className.includes(v))this.className+=' '+v},toggle:(v,on)=>{
      if(on)this.classList.add(v);else this.className=this.className.replace(v,'').trim();
    }};
  }
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return this.attrs[k]??null;}
  removeAttribute(k){delete this.attrs[k];}
  appendChild(c){c.parentElement=this;this.children.push(c);return c;}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}
  matches(q){return q.split(',').some(s=>s.trim()===this.tagName.toLowerCase()||s.includes('.'+this.className.split(' ').find(c=>c==='verticalSection' || c==='card')))}
  closest(s){for(let e=this;e;e=e.parentElement){
    if(s.startsWith('[data-mf-anime-shelf')&&e.attrs['data-mf-anime-shelf']==='1')return e;
    if(s.includes('.dialog')&&e.className.includes('dialog'))return e;
    if(s.includes('.card')&&e.className.split(' ').includes('card'))return e;
  }return null}
  all(){return this.children.flatMap(c=>[c,...c.all()]);}
  querySelectorAll(q){
    const nodes=this.all();
    if(q.includes('h1,h2,h3,h4')||q.includes('h1, h2'))return nodes.filter(x=>x.tagName==='H2');
    if(q.includes('[data-mf-card="1"]'))return nodes.filter(x=>x.attrs['data-mf-card']==='1');
    if(q.includes('.card')||q.includes('item-card'))return nodes.filter(x=>x.className.split(' ').includes('card'));
    if(q.includes('button,a'))return nodes.filter(x=>['BUTTON','A'].includes(x.tagName));
    if(q.includes('a[href*="topParentId"]'))return nodes.filter(x=>x.tagName==='A'&&String(x.attrs.href).includes('topParentId'));
    return [];
  }
  querySelector(q){
    if(q.startsWith(':scope > .mf-native-overlay'))return this.children.find(x=>x.className==='mf-native-overlay')||null;
    if(q.includes('data-played'))return this.all().find(x=>x.tagName==='BUTTON'&&x.attrs['data-played']!==undefined)||null;
    if(q.includes('itemProgressBarForeground'))return this.all().find(x=>x.className.includes('itemProgressBarForeground'))||null;
    if(q.includes('playedIndicator'))return null;
    if(q.includes('cardText-secondary'))return this.all().find(x=>x.className.includes('cardText-secondary'))||null;
    if(q.includes('.cardScalable'))return this.all().find(x=>x.className.includes('cardScalable'))||null;
    if(q.includes('.cardImageContainer'))return this.all().find(x=>x.className.includes('cardImageContainer'))||null;
    if(q.includes('.mf-native-overlay'))return this.all().find(x=>x.className==='mf-native-overlay')||null;
    return null;
  }
}
const html=new El('html');const body=html.appendChild(new El('body'));
const header=body.appendChild(new El('header','skinHeader'));
header.appendChild(Object.assign(new El('a'),{attrs:{href:'#/mixed?topParentId=abc'}}));
header.appendChild(Object.assign(new El('a'),{attrs:{href:'#/movies?topParentId=def'}}));
const section=body.appendChild(new El('section','verticalSection'));
section.appendChild(new El('h2','sectionTitle','AnimePL — ostatnio dodane'));
function card({kind,id,played,rating,episodes,year,genres}){
  const card=section.appendChild(new El('div','card overflowPortraitCard'));
  card.setAttribute('data-type',kind);card.setAttribute('data-id',id);
  if(rating)card.setAttribute('data-mf-user-rating',rating);
  if(episodes)card.setAttribute('data-mf-episodes',episodes);
  if(genres)card.setAttribute('data-mf-genres',genres);
  const box=card.appendChild(new El('div','cardBox cardBox-bottompadded'));
  const scalable=box.appendChild(new El('div','cardScalable'));
  const img=scalable.appendChild(new El('a','cardImageContainer'));img.setAttribute('href','#/details?id='+id);
  const btn=scalable.appendChild(new El('button'));btn.setAttribute('data-played',played);
  box.appendChild(new El('div','cardText cardText-secondary',year));
  return {card,scalable,img};
}
const a=card({kind:'Series',id:'38c5142e8251e2e1a5a0f306faac83be',played:'false',rating:'8.5',episodes:'149',year:'2026',genres:'Fantasy|Dramat|Romans'});
const b=card({kind:'Series',id:'1fd72691aeff258ed373626250fccdd7',played:'true',year:'2023'});
const originalLink=a.img.getAttribute('href');
const document={body,documentElement:html,readyState:'complete',
  createElement:t=>{if(t.toLowerCase()==='article')createdNewCards++;return new El(t)},
  createElementNS:(_ns,t)=>new El(t),querySelector:q=>q.includes('.skinHeader')?header:null,
  addEventListener(){}
};
const window={addEventListener(){},setTimeout(fn){fn();return 1},ApiClient:null};
const sandbox={document,window,console,fetch(){networkCalls++},IntersectionObserver:undefined,
  MutationObserver:class{observe(){}},history:{pushState(){navigated++}}};
vm.runInNewContext(script,sandbox,{filename:'client.js'});
assert.equal(section.attrs['data-mf-section'],'latest');
assert.equal(section.attrs['data-mf-anime-shelf'],'1');
assert.equal(a.card.attrs['data-mf-card'],'1');
assert.equal(a.img.getAttribute('href'),originalLink);
assert.equal(a.scalable.children.filter(x=>x.className==='mf-native-overlay').length,1);
assert.equal(b.scalable.children.filter(x=>x.className==='mf-native-overlay').length,1);
assert.equal(b.card.attrs['data-mf-watch'],'watched');
assert.equal(a.card.attrs['data-mf-watch'],undefined,'partially watched Series must not be guessed');
const overlay=a.scalable.querySelector('.mf-native-overlay');
const overlayText=overlay.all().map(x=>x.textContent).join(' ');
assert(overlayText.includes('ANIME'));
assert(overlayText.includes('2026'));
assert(overlayText.includes('99+'));
assert(overlayText.includes('8.5'));
assert(overlayText.includes('Fantasy'));
assert.equal(createdNewCards,0);
assert.equal(networkCalls,0,'no download without authenticated session');
assert.equal(navigated,0);
console.log('PASS native DOM, in-place badges, paw stats, NFO genre chips, 99+, links, conservative status, no second app');
