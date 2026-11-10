// Regression for v0.4.16: tests the actual search helpers extracted from home.js.
// No browser, network, Jellyfin server or user session is needed in CI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/Jellyfin.Plugin.MisioFlix/Web/home.js'), 'utf8');
const start = source.indexOf('  function catalogGenres(item,kind){');
const end = source.indexOf('  function closeWhenNavigate(state){');
assert(start >= 0 && end > start, 'Actual home search functions must exist');
const functions = source.slice(start,end);
const animeSet = new Set(['Fantasy','Akcja','Isekai','Magia']);
const ctx={
  ANIME_SET: animeSet,
  validId: id => /^[a-f0-9]{32}$/i.test(String(id || '').replace(/-/g,'')),
  compactId: id => String(id || '').replace(/-/g,'').toLowerCase(),
  normalized: s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pl-PL').trim(),
  toHomeCardItem: x => ({id:x.id,title:x.title,type:x.type,anime:x.anime,seasons:x.season_count??null,episodes:x.episode_count??null})
};
vm.createContext(ctx);
vm.runInContext(functions,ctx);
const P='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const S='dddddddddddddddddddddddddddddddd';
const P2='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const series={id:P,type:'Series',anime:true,title:'Arifureta Shokugyou de Sekai Saikyou',genres:['Fantasy'],season_count:5,episode_count:63,search_titles:['Arifureta Shokugyou de Sekai Saikyou']};
const specials={id:S,type:'Season',anime:true,title:'Arifureta Specials Box',genres:['Isekai'],parent_series_id:P,search_titles:['Arifureta Omake: Szkolna przygoda']};
const unrelatedSeries={id:P2,type:'Series',anime:true,title:'Arifureta Inny niezwiązany serial',genres:['Fantasy'],season_count:1};
const orphan={id:'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',type:'Season',anime:true,title:'Niezwiązany Special',parent_series_id:'ffffffffffffffffffffffffffffffff',genres:['Isekai']};
const anime={kind:'anime',pool:[series,specials,unrelatedSeries,orphan],seasonsBySeries:new Map(),type:{value:'all'},includeSeasons:{checked:false},genreStates:new Map(),input:{value:'Szkolna przygoda'}};
ctx.indexAnimeSeasons(anime);
assert.equal(anime.seasonsBySeries.get(P).length,1,'link by real GUID only');
assert.equal(anime.seasonsBySeries.has(P2),false,'same-looking name must not merge unrelated series');
assert.equal(anime.seasonsBySeries.has('ffffffffffffffffffffffffffffffff'),false,'orphan parent must not be guessed');
let results=anime.pool.filter(i=>ctx.fitsSearch(i,anime));
assert.deepEqual(results.map(x=>x.id),[P], 'Special title should return ONE parent series by default');
const tile=ctx.searchTile(results[0],anime);
assert.equal(tile.id,P,'main Series card, not Season card');
assert.equal(tile.seasons,5,'use all parent seasons, not 1 season');
assert.equal(tile.episodes,63,'use all parent episodes');
anime.includeSeasons.checked=true;
results=anime.pool.filter(i=>ctx.fitsSearch(i,anime));
assert.deepEqual(results.map(x=>x.id),[P,S], 'checkbox adds directly clickable Special');
anime.type.value='seasons';
results=anime.pool.filter(i=>ctx.fitsSearch(i,anime));
assert.deepEqual(results.map(x=>x.id),[S],'seasons-only searches/open season by its own ID');
anime.type.value='all';anime.includeSeasons.checked=false;
anime.genreStates.set('isekai',1);
assert.deepEqual(anime.pool.filter(i=>ctx.fitsSearch(i,anime)).map(x=>x.id),[P], 'linked NFO season genres count for parent');
anime.genreStates.set('isekai',2);
assert.equal(anime.pool.filter(i=>ctx.fitsSearch(i,anime)).length,0,'excluded linked genre suppresses parent');
// Non-anime genres are not constrained by the anime 52-genre set.
const mediaMovie={id:'11111111111111111111111111111111',type:'Movie',anime:false,title:'Film dokumentalny',genres:['Dokumentalny','Biograficzny']};
const mediaSeries={id:'22222222222222222222222222222222',type:'Series',anime:false,title:'Serial kryminalny',genres:['Kryminalny']};
const media={kind:'media',pool:[mediaMovie,mediaSeries],type:{value:'all'},includeSeasons:{checked:false},genreStates:new Map(),input:{value:''}};
assert.deepEqual(Array.from(ctx.catalogGenres(mediaMovie,'media')),['Dokumentalny','Biograficzny']);
media.genreStates.set('dokumentalny',1);
assert.deepEqual(media.pool.filter(i=>ctx.fitsSearch(i,media)).map(x=>x.id),[mediaMovie.id]);
media.genreStates.set('dokumentalny',2);
assert.deepEqual(media.pool.filter(i=>ctx.fitsSearch(i,media)).map(x=>x.id),[mediaSeries.id]);
console.log('PASS 0.4.16: NFO season/Special -> whole Series; explicit season; GUID isolation; original 5/63 counts; non-anime Jellyfin genres');
