'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/configPage.html'),'utf8');
const begin=html.indexOf('  // v0.4.108: independent, collapsible admin genre proposals');
const end=html.indexOf("  view.addEventListener('pageshow'",begin);
assert(begin>0&&end>begin);
class El{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.checked=false;this.open=false;this.attrs={};this.style={};this.value='';this.textContent='';}
 setAttribute(k,v){this.attrs[k]=v};append(...nodes){this.children.push(...nodes)};replaceChildren(...nodes){this.children=[...nodes]};
 addEventListener(type,handler){this.listeners[type]=handler};get lastElementChild(){return this.children.at(-1)};
 querySelectorAll(selector){if(selector==='.mf-proposal-genre-toggle[open]')return this.children.flatMap(x=>x.children.filter(y=>y.open));return []}
}
const ids=['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
 'cccccccccccccccccccccccccccccccc','dddddddddddddddddddddddddddddddd'];
let rows=[{ItemId:ids[0],Name:'Anime PL'},{ItemId:ids[1],Name:'Filmy PL'}];
const list=new El(),status=new El(),save=new El(),add=new El();
const controls={'#mf-recommendation-list':list,'#mf-recommendation-status':status,'#mf-recommendation-save':save,'#mf-recommendation-add':add};
const view={querySelector:s=>s==='#mf-recommendation-config'?{querySelector:x=>controls[x]||null}:null};
let cfg={RecommendationSets:[{Genres:['Akcja'],MatchAll:false}],LibraryPaths:[],MalClientSecret:'keep'};
const api={getPluginConfiguration:async()=>structuredClone(cfg),updatePluginConfiguration:async(id,next)=>{cfg=structuredClone(next)},accessToken:()=> 'testtoken',getUrl:s=>s};
const ctx={view,pluginId:'plugin',ApiClient:api,document:{createElement:t=>new El(t),createTextNode:t=>({textContent:t})},Event:class Event{constructor(type){this.type=type}},
 fetch:async url=>({ok:true,json:async()=>url.includes('VirtualFolders')?structuredClone(rows):{anime:['Akcja'],media:['Komedia']}})};
vm.createContext(ctx);
vm.runInContext(html.slice(begin,end)+'\nglobalThis.tested=recommendations;',ctx);
const selector=()=>{assert.equal(list.children.length,1);const p=list.children[0].children[4];p.open=true;p.listeners.toggle();return p};
const choices=p=>p.children[2].children.map(x=>x.children[0]);
const byName=p=>Object.fromEntries(p.children[2].children.map(x=>[x.children[1].textContent,x.children[0].checked]));
const byText=p=>Object.fromEntries(p.children[2].children.map(x=>[x.children[1].textContent,x.children[0]]));
const saveNow=async()=>{save.listeners.click();await new Promise(r=>setImmediate(r))};
(async()=>{
 await ctx.tested.activate();
 let p=selector(),items=choices(p);
 assert.deepEqual(items.map(x=>x.checked),[true,true],'new preset defaults both ON');
 items[1].checked=false;items[1].listeners.change();
 await saveNow();
 assert.equal(cfg.RecommendationSets[0].AllLibraries,true);
 assert.deepEqual(cfg.RecommendationSets[0].LibraryIds,[]);
 assert.deepEqual(cfg.RecommendationSets[0].ExcludedLibraryIds,[ids[1]],'store only manually excluded ID');
 assert.equal(cfg.MalClientSecret,'keep');
 // Future library is included even though another library was excluded earlier.
 rows.push({ItemId:ids[2],Name:'Anime NEW'});
 await ctx.tested.activate();p=selector();items=choices(p);
 assert.deepEqual(byName(p),{'Anime NEW':true,'Anime PL':true,'Filmy PL':false}, 'new library starts ON, excluded library stays OFF');
 // Renaming a library does not change the choice (stable ID).
 rows[0].Name='Anime Polski';
 await ctx.tested.activate();p=selector();items=choices(p);
 assert.deepEqual(byName(p),{'Anime NEW':true,'Anime Polski':true,'Filmy PL':false});
 const newInput=byText(p)['Anime NEW'];newInput.checked=false;newInput.listeners.change();await saveNow();
 assert.deepEqual(cfg.RecommendationSets[0].ExcludedLibraryIds.slice().sort(),[ids[1],ids[2]].sort());
 const everyCurrent=p.children[1].children[0].children[0];everyCurrent.checked=true;everyCurrent.listeners.change();
 await saveNow();assert.deepEqual(cfg.RecommendationSets[0].ExcludedLibraryIds,[],'select-all removes only exclusions');
 // Upgrade from a legacy explicit allowlist: invert the choice at discovery,
 // save the blacklist and leave every future library enabled.
 cfg.RecommendationSets=[{Genres:['Akcja'],MatchAll:false,AllLibraries:false,LibraryIds:[ids[0]]}];
 await ctx.tested.activate();p=selector();items=choices(p);
 assert.deepEqual(byName(p),{'Anime NEW':false,'Anime Polski':true,'Filmy PL':false});
 await saveNow();assert.deepEqual(cfg.RecommendationSets[0].ExcludedLibraryIds.slice().sort(),[ids[1],ids[2]].sort());
 assert.equal(cfg.RecommendationSets[0].AllLibraries,true);
 rows.push({ItemId:ids[3],Name:'New later'});
 await ctx.tested.activate();p=selector();items=choices(p);
 assert.deepEqual(byName(p),{'Anime NEW':false,'Anime Polski':true,'Filmy PL':false,'New later':true});
 const home=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
 assert(home.includes('preset.excludedLibraryIds?.length'));
 assert(home.includes('item.library_ids.every(id=>excluded.has(compactId(id)))'));
 console.log('PASS proposal libraries: opt-out, future ON, stable IDs, legacy migration, select-all, preserved configuration');
})().catch(e=>{console.error(e);process.exitCode=1});
