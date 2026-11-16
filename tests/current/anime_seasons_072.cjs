// Regression: 5 NFO seasons -> 5 results/43 episodes; no duplicate parent.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const b=src.indexOf('  function catalogGenres(item,kind){');
const e=src.indexOf('  function closeWhenNavigate(state){');
assert(b>=0&&e>b,'search helpers present');
const context={
 ANIME_SET:new Set(['Akcja','Fantasy']),
 allowGroup:(value,map)=>{const allowed=[...map].filter(([,mode])=>mode===1).map(([key])=>key);const excluded=[...map].filter(([,mode])=>mode===2).map(([key])=>key);return !excluded.includes(value)&&(!allowed.length||allowed.includes(value));},
 validId: s=>/^[a-f0-9]{32}$/i.test(String(s||'')),
 compactId:s=>String(s||'').toLowerCase().replace(/-/g,''),
 normalized:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),
 toHomeCardItem:s=>({id:s.id,type:s.type,title:s.title,anime:s.anime,seasons:s.season_count??null,episodes:s.episode_count??null,userRating:s.rating??null})
};
vm.createContext(context);vm.runInContext(src.slice(b,e),context);
const seriesId='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const parent={id:seriesId,type:'Series',anime:true,title:'Arifureta Shokugyou de Sekai Saikyou',season_count:5,episode_count:43,genres:['Fantasy']};
const ns=[1,2,3,4,5];
const names=[
 'Arifureta Shokugyou de Sekai Saikyou - Prologue',
 'Arifureta Shokugyou de Sekai Saikyou',
 'Arifureta Shokugyou de Sekai Saikyou 2nd Season',
 'Arifureta Shokugyou de Sekai Saikyou: Arifureta Yorimichi de Sekai Saikyou',
 'Arifureta Shokugyou de Sekai Saikyou Season 3'
];
const episodeCounts=[1,13,12,1,16];
const seasons=ns.map((n,i)=>({id:String(n).repeat(32),parent_series_id:seriesId,type:'Season',anime:true,title:names[i],season_count:episodeCounts[i],episode_count:episodeCounts[i],genres:['Fantasy']}));
const state={pool:[parent,...seasons],kind:'anime',seasonsBySeries:new Map(),typeStates:new Map(),includeSeasons:{checked:false},genreStates:new Map(),input:{value:'arifur'}};
context.indexAnimeSeasons(state);
let r=state.pool.filter(x=>context.fitsSearch(x,state));
assert.deepEqual(r.map(x=>x.id),[seriesId],'default: single parent series');
assert.equal(context.searchTile(r[0],state).seasons,5,'parent has 5 seasons');
assert.equal(context.searchTile(r[0],state).episodes,43,'parent has 43 episodes');
state.includeSeasons.checked=true;
r=state.pool.filter(x=>context.fitsSearch(x,state));
assert.deepEqual(r.map(x=>x.id),seasons.map(s=>s.id),'checkbox: exactly 5 individual seasons');
const tiles=r.map(s=>context.searchTile(s,state));
assert.deepEqual(tiles.map(x=>x.seasons),[null,null,null,null,null],'no false orange seasons paw');
assert.deepEqual(tiles.map(x=>x.episodes),[1,13,12,1,16],'blue paws: episode counts are season scoped');
assert.equal(tiles.reduce((s,x)=>s+x.episodes,0),43);
state.typeStates.set('series',1);
assert.deepEqual(state.pool.filter(x=>context.fitsSearch(x,state)).map(x=>x.id),[seriesId],'explicit type Series can override checkbox');
state.typeStates.set('seasons',1);
assert.equal(state.pool.filter(x=>context.fitsSearch(x,state)).length,6,'explicit multiple types permitted');
state.typeStates.clear();state.includeSeasons.checked=false;
assert.deepEqual(state.pool.filter(x=>context.fitsSearch(x,state)).map(x=>x.id),[seriesId]);
console.log('PASS: v0.4.72 Arifureta 5 real season identities, counts 1+13+12+1+16, checkbox no duplicates, explicit type filters');
