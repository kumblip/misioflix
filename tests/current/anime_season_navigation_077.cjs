'use strict';
// v0.4.78 — authenticated parent-linked season navigation for ALL TV series;
// the ANIME breadcrumb remains anime-only.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'../..');
const source=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/details.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8');
const series='a'.repeat(32), season='b'.repeat(32), others=['c'.repeat(32),'d'.repeat(32)], media='e'.repeat(32);
class Element {
  constructor(tag='div',cls='') {this.tagName=tag;this.className=cls;this.textContent='';this.children=[];this.dataset={};this.attributes={};this.events={};this.isConnected=true;this.disabled=false;
    const classes=new Set(cls.split(/\s+/).filter(Boolean));
    this.classList={add:(n)=>classes.add(n),remove:(n)=>classes.delete(n),contains:(n)=>classes.has(n),toggle:(n,on)=>on===undefined?(classes.has(n)?(classes.delete(n),false):(classes.add(n),true)):(on?classes.add(n):classes.delete(n),on)};
  }
  setAttribute(k,v) {this.attributes[k]=v;}
  getAttribute(k){return this.attributes[k];}
  append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
  insertBefore(node,anchor){const i=this.children.indexOf(anchor);assert.ok(i>=0);node.parentNode=this;this.children.splice(i,0,node);}
  prepend(...nodes){this.children.unshift(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  addEventListener(name,fn){this.events[name]=fn;}
  click(){this.events.click?.();}
  remove(){this.isConnected=false;if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(x=>x!==this);this.parentNode=null;}}
  querySelector(q){if(q===':scope > .mf-detail-back')return this.children.find(e=>e.className==='mf-detail-back')||null;return null;}
}
const ribbon=new Element(),info=new Element(),secondary=new Element(),primary=new Element(),wrapper=new Element();
ribbon.querySelector=q=>q==='.infoWrapper'?info:null;
const nativeDetailSection=new Element('div','detailSection');primary.append(nativeDetailSection);
const episodeSection=new Element('div','native-episodes');nativeDetailSection.append(episodeSection);
const page=new Element();
page.querySelector=q=>({'.detailPagePrimaryContainer > .detailRibbon':ribbon,'.detailPageSecondaryContainer':secondary,'.detailPagePrimaryContainer > .detailPagePrimaryContent':primary,'.detailPageWrapperContainer':wrapper,'.mf-detail-anime-breadcrumb':info.children.find(x=>x.className==='mf-detail-anime-breadcrumb'),'#listChildrenCollapsible':episodeSection,'.mf-detail-season-nav':nativeDetailSection.children.find(x=>x.className==='mf-detail-season-nav')}[q]||null);
const win={scrollTo(){},setTimeout(){},location:{hash:'#/details?id='+season},ApiClient:{getCurrentUserId:()=> 'f'.repeat(32),accessToken:()=> 'token',serverId:()=> '9'.repeat(32),getUrl:s=>'/'+s}};
let queries=0;
const fetch=async (url)=>{
  if(url.startsWith('/MisioFlix/api/overlays')) {
    const id=new URL(url,'http://local').searchParams.get('ids');
    return {ok:true,json:async()=>[{id,anime:id!==media}]};
  }
  if(url.startsWith('/Shows/'+series+'/Seasons?')) {
    queries++;
    return {ok:true,json:async()=>({Items:[
      {Id:others[1],Type:'Season',IndexNumber:3,Name:'Season 3'},
      {Id:season,Type:'Season',IndexNumber:2,Name:'Season 2'},
      {Id:others[0],Type:'Season',IndexNumber:1,Name:'Prologue'}]})};
  }
  throw Error('Unexpected fetch: '+url);
};
const document={readyState:'loading',addEventListener(){},createElement:tag=>new Element(tag),querySelectorAll:()=>[],scrollingElement:null};
const sandbox={window:win,document,fetch,console,URLSearchParams,URL,Map,Set,Promise};
const patched=source.replace('  if(document.readyState===\'loading\')', '  window.__mf077={syncAnimeDetailsControls,ensureBackButton,seasonButtonLabel,clearAnimeSeasonControls};\n  if(document.readyState===\'loading\')');
vm.runInNewContext(patched,sandbox,{filename:'details.js'});
assert.ok(win.__mf077);
(async()=>{
 const t=win.__mf077;
 assert.equal(t.seasonButtonLabel({IndexNumber:4}),'S04');
 assert.equal(t.seasonButtonLabel({Name:'OVA'}),'OVA');
 await t.syncAnimeDetailsControls(page,{Type:'Season',SeriesId:series,Name:'Drugi sezon'},season,0);
 assert.equal(page.dataset.mfAnimeDetails,'1');
 assert.equal(page.dataset.mfDetailSeriesId,series);
 assert.equal(page.classList.contains('mf-detail-anime-season'),true);
 assert.equal(queries,1);
 const crumb=info.children[0];
 assert.equal(crumb.className,'mf-detail-anime-breadcrumb');
 assert.deepEqual(crumb.children.map(x=>x.textContent),['ANIME','›','Drugi sezon']);
 const nav=nativeDetailSection.children[0];
 assert.equal(nav.className,'mf-detail-season-nav');
 const row=nav.children[0];
 assert.deepEqual(row.children.map(x=>x.textContent),['S01','S02','S03']);
 assert.equal(row.children[1].classList.contains('mf-detail-season-active'),true);
 assert.equal(row.children[1].disabled,true);
 assert.equal(row.children[1].getAttribute('aria-current'),'page');
 row.children[0].click();
 assert.equal(win.location.hash,'#/details?id='+others[0]+'&serverId='+'9'.repeat(32));
 win.location.hash='#/details?id='+season;
 page.dataset.mfDetailType='Season';
 t.ensureBackButton(page);
 wrapper.children[0].click();
 assert.equal(win.location.hash,'#/details?id='+series+'&serverId='+'9'.repeat(32));
 // Main anime series is exactly one logical level below home.
 page.dataset.mfDetailType='Series';
 wrapper.children[0].click();
 assert.equal(win.location.hash,'#/home');
 // Ordinary TV series gets season buttons, but never anime-only breadcrumb.
 win.location.hash='#/details?id='+media;
 await t.syncAnimeDetailsControls(page,{Type:'Season',SeriesId:series,Name:'Not anime'},media,0);
 assert.equal(page.dataset.mfAnimeDetails,'0');
 assert.equal(page.classList.contains('mf-detail-anime-season'),false);
 assert.equal(info.children[0].isConnected,false);
 const ordinaryNav=nativeDetailSection.children[0];
 assert.equal(ordinaryNav.className,'mf-detail-season-nav');
 assert.deepEqual(ordinaryNav.children[0].children.map(x=>x.textContent),['S01','S02','S03']);
 // Even when navigating from a film, back has a fixed destination.
 page.dataset.mfDetailType='Movie';
 win.location.hash='#/details?id='+media;
 wrapper.children[0].click();
 assert.equal(win.location.hash,'#/home');
 assert.ok(css.includes('.mf-detail-season-switch.mf-detail-season-active'));
 assert.ok(css.includes('.detailPagePrimaryContent .mf-detail-season-nav'));
 assert.equal(nativeDetailSection.children[0],ordinaryNav,'The season switcher must be first inside native detailSection');
 assert.equal(nativeDetailSection.children[1],episodeSection,'The season switcher must precede native episode section nested in detailSection');
 console.log('PASS v0.4.78: anime + ordinary TV season buttons, anime-only breadcrumb, deterministic back for all details');
})().catch(e=>{console.error(e);process.exitCode=1;});
