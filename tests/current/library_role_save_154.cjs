const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../../src/Jellyfin.Plugin.MisioFlix/Web/configPage.html'),'utf8');
const begin=html.indexOf('  const libraryPaths=(()=>{');
const end=html.indexOf("  view.addEventListener('pageshow'",begin);
const script=html.slice(begin,end);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const pl='11111111111111111111111111111111',eng='22222222222222222222222222222222',virtual='33333333333333333333333333333333';
class El {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.textContent='';this.value='';this.disabled=false;}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 setAttribute(){}
 addEventListener(event,fn){this.listeners[event]=fn}
}
function fixture(initial={},ignoreWrite=false){
 let config={MalClientId:'preserved',AnimeRoot:'/media/raid/animelektor',AnimeOriginalRoot:'/media/raid/anime',...initial},writes=0;
 const nodes=Object.fromEntries(['list','status','reload','save','save-top','save-state'].map(id=>['#mf-library-'+id,new El()]));
 const panel={querySelector:id=>nodes[id]};
 const libraries=[{ItemId:pl,Name:'Anime PL',CollectionType:'mixed',Locations:['/media/raid/anime_lektor']},{ItemId:eng,Name:'Anime ENG',CollectionType:'mixed',Locations:['/media/raid/anime']},{ItemId:virtual,Name:'Kolekcje',CollectionType:'boxsets',Locations:[]}];
 const ApiClient={getUrl:s=>s,accessToken:()=> 'test',async getPluginConfiguration(){return structuredClone(config)},async updatePluginConfiguration(id,next){writes++;if(!ignoreWrite)config=structuredClone(next)}};
 const ctx={view:{querySelector:()=>panel},ApiClient,pluginId:'test',document:{createElement:t=>new El(t)},fetch:async()=>({ok:true,json:async()=>libraries})};
 vm.createContext(ctx);vm.runInContext(script+'\nglobalThis.panelTest=libraryPaths;',ctx);
 return {activate:()=>ctx.panelTest.activate(),nodes,config:()=>config,writes:()=>writes,status:()=>nodes['#mf-library-save-state'].textContent,click:()=>nodes['#mf-library-save-top'].listeners.click()};
}
test('suggested roles visibly unsaved; save PL/ENG plus virtual collection and verify server without changing MAL credentials',async()=>{
 const f=fixture();f.activate();await tick();assert.match(f.status(),/niezapisane/);assert.equal(f.writes(),0);f.click();await tick();assert.match(f.status(),/Zapisano i potwierdzono 3/);assert.equal(f.writes(),1);
 const cfg=f.config();assert.equal(cfg.LibraryPathsConfigured,true);assert.equal(cfg.MalClientId,'preserved');assert.equal(cfg.AnimeRoot,'/media/raid/anime_lektor');assert.equal(cfg.LibraryPaths.find(x=>x.LibraryId===pl).Role,'anime_pl');assert.equal(cfg.LibraryPaths.find(x=>x.LibraryId===eng).Role,'anime_eng');assert.deepEqual(cfg.LibraryPaths.find(x=>x.LibraryId===virtual).Paths,[]);
});
test('server silently ignoring config write is not reported as saved',async()=>{
 const f=fixture({},true);f.activate();await tick();f.click();await tick();assert.match(f.status(),/Serwer nie potwierdził/);assert.equal(f.nodes['#mf-library-save-top'].disabled,false);
});
test('existing explicit role preserved; real Jellyfin roots stored separately from stale manual path',async()=>{
 const f=fixture({LibraryPathsConfigured:true,LibraryPaths:[{LibraryId:pl,Role:'anime_both',AudioLanguage:'pl',Paths:['/media/raid/animelektor'],JellyfinPaths:['/media/raid/old']}]});f.activate();await tick();f.click();await tick();assert.match(f.status(),/Zapisano i potwierdzono/);const row=f.config().LibraryPaths.find(x=>x.LibraryId===pl);assert.equal(row.Role,'anime_both');assert.deepEqual(row.JellyfinPaths,['/media/raid/anime_lektor']);assert.deepEqual(row.Paths,['/media/raid/animelektor']);
});
