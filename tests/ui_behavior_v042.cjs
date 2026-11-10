const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/client.js'),'utf8');
const instrument=`\n globalThis.__mfTests={mediaCard,continueWatchingHero,pawStat,set:(items,resume=[],hidden=[])=>{state.items=items;state.resume=resume;state.hiddenResume=hidden;state.genreFrequency=buildGenreFrequency(items);state.showHiddenResume=!!hidden.length;}};\n})();`;
const code=js.replace(/\n\}\)\(\);\s*$/,instrument);
const sandbox={window:{},document:{readyState:'loading',addEventListener(){}},console};
vm.runInNewContext(code,sandbox,{filename:'client.js'});
const {mediaCard,continueWatchingHero,pawStat,set}=sandbox.__mfTests;
function example(id,status,anime=true){return {id,title:`Niezwykle długi tytuł ${id}`,anime,type:anime?'Series':'Movie',year:2024,kind:anime?'Seria TV':'Film',genres:['Komedia','Fantasy','Akcja','Dramat'],plot:'Długi polski opis ma pozostać w karcie niezmieniony',has_image:false,watch_status:status,season_count:3,episode_count:120,rating:anime?8.7:6.8,progress_percent:status==='started'?37:0};}
const xs=[example('a','unwatched'),example('b','started'),example('c','watched'),example('d','unwatched',false)];
set(xs);
for (const [status,id] of [['unwatched','a'],['started','b'],['watched','c']]) {
 const card=mediaCard(xs.find(x=>x.id===id));
 assert(card.includes('mf-status-'+status));
 assert(card.includes('mf-poster-bottom'));
 assert(card.includes('Długi polski opis'));
 assert(card.indexOf('mf-year-format')<card.indexOf('mf-card-body'));
 assert.equal((card.match(/class="mf-pill"/g)||[]).length,3);
 assert(card.includes('mf-stats-panel'));
 assert(card.includes('>99+<')); 
 assert.equal((card.match(/class="mf-paw"/g)||[]).length,3);
 assert(card.includes('>8.7<'));
 assert(!card.includes('⭐')&&!card.includes('★'));
}
const movie=mediaCard(xs[3]);
assert.equal((movie.match(/class="mf-paw"/g)||[]).length,1);
assert(!movie.includes('>120<'));
const entries=[{id:'ep1',catalog_id:'a',progress_percent:20,season:1,episode:4,next_up:false},
 {id:'ep2',catalog_id:'b',progress_percent:0,season:1,episode:5,next_up:true},
 {id:'ep3',catalog_id:'c',progress_percent:75,season:1,episode:6,next_up:false},
 {id:'film1',catalog_id:'d',progress_percent:61,next_up:false}];
set(xs,entries.slice(0,3),entries.slice(3));
let html=continueWatchingHero();
assert(html.includes('data-mf-jellyfin="ep1"'));
assert(html.includes('data-mf-jellyfin="ep2"'));
assert(html.includes('data-mf-jellyfin="ep3"'));
assert(html.includes('data-mf-resume-hide="a"'));
assert(html.includes('data-mf-resume-restore="d"'));
assert(html.includes('Ukryte (1)'));
assert(html.includes('Następny odcinek'));
assert(html.includes('S01E04'));
set(xs,entries);
html=continueWatchingHero();
assert.equal((html.match(/class="mf-resume-card"/g)||[]).length,4,'all four resume items, not first three');
assert(html.includes('4 pozycje'));
console.log('PASS v0.4.2 UI: paws, poster overlays, statuses, unlimited hero, hide/restore');
