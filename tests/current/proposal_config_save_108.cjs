'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/configPage.html'),'utf8');
const begin=html.indexOf('  // v0.4.108: independent, collapsible admin genre proposals');
const end=html.indexOf('  view.addEventListener(\'pageshow\'',begin);
assert(begin>0&&end>begin);
class El {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.checked=false;this.open=false;this.attrs={};this.style={};this.value='';this.textContent='';}
  setAttribute(k,v){this.attrs[k]=v}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=[...nodes]}
  addEventListener(evt,cb){this.listeners[evt]=cb}
  get lastElementChild(){return this.children.at(-1)}
  querySelectorAll(selector){
    if(selector==='.mf-proposal-genre-toggle[open]')return this.children.flatMap(x=>x.children.filter(y=>y.open));
    return [];
  }
}
const list=new El(),status=new El(),save=new El(),add=new El();
const controls={
  '#mf-recommendation-list':list,'#mf-recommendation-status':status,
  '#mf-recommendation-save':save,'#mf-recommendation-add':add
};
const panel={querySelector:s=>controls[s]||null};
const view={querySelector:s=>s==='#mf-recommendation-config'?panel:null};
let cfg={RecommendationGenres:['Akcja','Horror'],RecommendationSets:[],MalClientSecret:'secret',SimklClientId:'do-not-change'};
const api={
  getPluginConfiguration:async()=>structuredClone(cfg),
  updatePluginConfiguration:async(id,updated)=>{assert.equal(id,'plugin-id');cfg=structuredClone(updated)},
  accessToken:()=> 'local-test-token',getUrl:s=>s
};
const ctx={view,pluginId:'plugin-id',ApiClient:api,
  document:{createElement:t=>new El(t),createTextNode:t=>({textContent:t})},
  fetch:async()=>({ok:true,json:async()=>({anime:['Akcja','Horror','Komedia','Isekai'],media:['Thriller','Romans']})}),
  Event:class Event{constructor(type){this.type=type}}
};
vm.createContext(ctx);
vm.runInContext(html.slice(begin,end)+'\nglobalThis.recommendationTester = recommendations;',ctx);
(async()=>{
  await ctx.recommendationTester.activate();
  assert.equal(list.children.length,2,'old v107 genres migrate to two independent proposals');
  assert.equal(list.children[0].open,false,'each proposal is collapsed by default');
  assert.equal(list.children[1].open,false);
  add.listeners.click();
  assert.equal(list.children.length,3);
  assert.equal(list.children[2].open,true,'new proposal opens for editing');
  const third=list.children[2];
  const modes=third.children[2];
  const all=modes.children[1].children[0];all.checked=true;all.listeners.change();
  const details=third.children[3];details.open=true;details.listeners.toggle();
  const grid=details.children[2];
  for(const name of ['Akcja','Komedia']){
    const label=grid.children.find(x=>x.children[1]?.textContent===name);
    assert(label,'genre option '+name);
    label.children[0].checked=true;label.children[0].listeners.change();
  }
  save.listeners.click();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(cfg.RecommendationSets.length,3);
  assert.equal(cfg.RecommendationSets[2].MatchAll,true);
  assert.deepEqual([...cfg.RecommendationSets[2].Genres].sort(),['Akcja','Komedia']);
  assert.deepEqual(cfg.RecommendationGenres,[],'legacy rails cleared only when new config saved');
  assert.equal(cfg.MalClientSecret,'secret');assert.equal(cfg.SimklClientId,'do-not-change');
  assert.equal(list.children[0].open,false,'saving does not force expand other panels');
  console.log('PASS v0.4.108: legacy genres migrated, add independent proposal, select AND and two genres, config saved without touching credentials');
})().catch(e=>{console.error(e);process.exitCode=1;});
