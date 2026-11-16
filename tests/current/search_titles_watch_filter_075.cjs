// v0.4.75: both searchers must not accidentally match description or genre.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(base,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
function crop(start,end){
 const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
 assert(i>=0&&j>i,`Missing: ${start}`);return source.slice(i,j);
}
function own(tag,cls='',text=''){
 return {tagName:tag,className:cls,textContent:String(text),children:[],attributes:{},style:{},hidden:false,
  setAttribute(k,v){this.attributes[k]=v},appendChild(c){this.children.push(c);return c},replaceChildren(...c){this.children=c},addEventListener(){}};
}
const ctx={
 ANIME_SET:new Set(['Akcja','Fantasy','Przygoda']),
 validId:v=>/^[0-9a-f]{32}$/i.test(String(v||'').replaceAll('-','')),
 compactId:v=>String(v||'').replaceAll('-','').toLowerCase(),
 allowGroup:(value,map)=>{if(!map||!map.size)return true;const yes=[...map].filter(([,v])=>v===1).map(([k])=>k);const no=[...map].filter(([,v])=>v===2).map(([k])=>k);return !no.includes(value)&&(!yes.length||yes.includes(value))},
 normalized:v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),
 toHomeCardItem:x=>({title:x.title,seasons:x.season_count,episodes:x.episode_count}),
 own,short:String,nativeDetails:id=>'#/details?id='+id,closeSearch:()=>{},append:(p,...x)=>x.forEach(y=>p.appendChild(y)),imageFor:()=>''
};
vm.createContext(ctx);
vm.runInContext(crop('  function catalogGenres(item,kind){','  function updateGenreSummary(state){'),ctx);
const mediaItems=[
 {id:'1'.repeat(32),type:'Movie',anime:false,title:'Brzeg ciszy',plot:'Bohaterka spotyka Marię',genres:['Przygoda']},
 {id:'2'.repeat(32),type:'Series',anime:false,title:'Aria',plot:'Nieznany serial',genres:['Fantasy']},
 {id:'3'.repeat(32),type:'Movie',anime:false,title:'Życie Marii',plot:'Wakacje',genres:['Romans']},
 {id:'4'.repeat(32),type:'Movie',anime:false,title:'Ciche noce',plot:'Nic',genres:['Scenariusz w Paryżu']}
];
const media={kind:'media',pool:mediaItems,genreStates:new Map(),typeStates:new Map(),input:{value:'ari'},watchMode:0,includeSeasons:{checked:false}};
assert.deepEqual(media.pool.filter(i=>ctx.fitsSearch(i,media)).map(i=>i.title),['Aria','Życie Marii'],
 'Media title should match, but description and genre should never match');
media.input.value='przygoda';
assert.deepEqual(media.pool.filter(i=>ctx.fitsSearch(i,media)).map(i=>i.title),[],
 'Media genre must only match when selected in genre filter');
media.genreStates.set('przygoda',1);
media.input.value='brzeg';
assert.deepEqual(media.pool.filter(i=>ctx.fitsSearch(i,media)).map(i=>i.title),['Brzeg ciszy'],
 'Title and genre filters must combine as AND');
media.input.value='aria';
assert.deepEqual(media.pool.filter(i=>ctx.fitsSearch(i,media)).map(i=>i.title),[],
 'Genre filter remains active and independent of title match');
const parentId='a'.repeat(32);
const animeItems=[
 {id:parentId,type:'Series',anime:true,title:'Główna seria',plot:'ari',genres:['Fantasy'],search_titles:['Main anime'],mal_id:111},
 {id:'b'.repeat(32),type:'Season',anime:true,title:'Rok drugi',search_titles:['Arifureta special'],parent_series_id:parentId,genres:['Akcja'],mal_id:222},
 {id:'c'.repeat(32),type:'Movie',anime:true,title:'Film poboczny',plot:'ari',genres:['Przygoda']},
];
const anime={kind:'anime',pool:animeItems,seasonsBySeries:new Map(),genreStates:new Map(),typeStates:new Map(),input:{value:'ari'},watchMode:0,includeSeasons:{checked:false}};
ctx.indexAnimeSeasons(anime);
assert.deepEqual(anime.pool.filter(i=>ctx.fitsSearch(i,anime)).map(i=>i.title),[],
 'Anime parent must NOT be found by linked season alias; description-only film excluded');
anime.input.value='main';
assert.deepEqual(anime.pool.filter(i=>ctx.fitsSearch(i,anime)).map(i=>i.title),['Główna seria'],
 'Anime parent can still be found by its own tvshow.nfo alternate title');
anime.input.value='ari';
anime.includeSeasons.checked=true;
assert.deepEqual(anime.pool.filter(i=>ctx.fitsSearch(i,anime)).map(i=>i.title),['Rok drugi'],
 'Separate seasons found by their own title aliases');
// Distinguish completed/other MAL states, only for known MAL ids; nothing writes back.
anime.watchSnapshot={connected:true,entries:{111:{mal_id:111,status:'completed'},222:{mal_id:222,status:'watching'}}};
assert.equal(ctx.watchClassification(animeItems[0],anime),'watched');
assert.equal(ctx.watchClassification(animeItems[1],anime),'unwatched');
assert.equal(ctx.watchClassification(animeItems[2],anime),'unknown');
anime.watchMode=1;
assert.deepEqual(anime.pool.filter(i=>ctx.fitsSearch(i,anime)).map(i=>i.title),[],
 'Watch filter combined with season selection');
anime.includeSeasons.checked=false;anime.input.value='main';
assert.deepEqual(anime.pool.filter(i=>ctx.fitsSearch(i,anime)).map(i=>i.title),['Główna seria']);
anime.watchMode=2;
assert.deepEqual(anime.pool.filter(i=>ctx.fitsSearch(i,anime)).map(i=>i.title),[],
 'Opposite watch state excludes completed series');
assert.equal(source.includes('function searchableText(item)'),false,'Remove old all-fields search shared by both searchers');
const css=fs.readFileSync(path.join(base,'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8');
assert(css.includes('grid-template-columns:minmax(135px,.72fr) minmax(335px,1.72fr) minmax(140px,.65fr)'));
console.log('PASS v0.4.75: precise anime+media titles, aliases, genre AND, watched tri-state, compact filter row');
