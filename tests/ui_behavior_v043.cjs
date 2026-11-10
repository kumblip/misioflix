const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(dir,'src/Jellyfin.Plugin.MisioFlix/Web/client.js'),'utf8');
const code=js.replace(/\n\}\)\(\);\s*$/, `\n globalThis.t={mediaCard,carousel,home,listings,detail,userState,recentSort,malRow,scoreChoices,
 set:(items,mal)=>{state.items=items;state.genreFrequency=buildGenreFrequency(items);state.mal=mal||{connected:false,entries:{},error:null};state.homeRandom={};state.resume=[];state.hiddenResume=[];state.tab='home'},
 random:(key,ids)=>{state.homeRandom[key]=ids}};\n})();`);
const sandbox={window:{},document:{readyState:'loading',addEventListener(){}},console};
vm.runInNewContext(code,sandbox,{filename:'client.js'});
const t=sandbox.t;
const base={genres:['Fantasy','Komedia','Akcja'],plot:'Polski opis',has_image:true,watch_status:'started',season_count:2,episode_count:120,progress_percent:30};
const items=[
 {...base,id:'old-anime',anime:true,type:'Series',title:'Starsze anime',kind:'Seria TV',year:'2017',date_added:'2024-01-01T01:00:00',rating:7.7,mal_id:25397},
 {...base,id:'new-anime',anime:true,type:'Series',title:'Nowe anime',kind:'ONA',year:'2026',date_added:'2026-11-01T01:00:00',rating:null,mal_id:34881},
 {...base,id:'movie',anime:false,type:'Movie',title:'Film X',kind:'Film',year:'2018',date_added:'2026-10-10T01:00:00',rating:8},
 {...base,id:'show',anime:false,type:'Series',title:'Serial Y',kind:'Serial',year:'2001',date_added:'2026-11-07T01:00:00',rating:9}];
t.set(items);
assert.equal(t.recentSort(items)[0].id,'show');
assert.equal(t.recentSort(items)[3].id,'old-anime');
const animeHtml=t.carousel('Anime',items.filter(x=>x.anime),'anime');
assert(animeHtml.indexOf('Nowe anime')<animeHtml.indexOf('Starsze anime'));
assert(animeHtml.includes('data-mf-random="anime"') && animeHtml.includes('data-mf-tab="anime"'));
assert(t.home().includes('data-mf-tab="recent"'));
t.random('anime',['old-anime','new-anime']);
assert(t.carousel('Anime',items.filter(x=>x.anime),'anime').indexOf('Starsze anime') < t.carousel('Anime',items.filter(x=>x.anime),'anime').indexOf('Nowe anime'));
const film=t.mediaCard(items[2]);
assert(film.includes('2026')===false); // release year 2018
assert(film.includes('>2018</span>'));
assert(!film.includes('2018 · Film'));
assert(film.includes('>8.0<'), 'personal Jellyfin rating, not community');
const anime=t.mediaCard(items[0]);
assert(anime.includes('2017 · Seria TV'));
t.set(items,{connected:true,entries:{25397:{mal_id:25397,status:'completed',score:10,episodes_watched:12,times_rewatched:3}}});
assert(t.mediaCard(items[0]).includes('mf-status-watched'));
assert(t.mediaCard(items[0]).includes('>10.0<'));
assert(t.mediaCard(items[1]).includes('mf-status-unwatched'));
assert(!t.mediaCard(items[1]).includes('mf-stat-rating'));
const details={item:items[0],seasons:[{id:'season1',name:'Season 1',number:1,rating:5,mal_id:25397},{id:'season2',name:'Season 2',number:2,rating:8,mal_id:34881}]};
const detailHtml=t.detail(details.item,[],details.seasons);
assert(detailHtml.includes('Moja ocena'));
assert(detailHtml.includes('data-mf-mal-parent="old-anime"'));
assert(detailHtml.includes('data-mf-mal-season="season2"'));
assert(detailHtml.includes('Powtórki') && detailHtml.includes('Odcinki') && detailHtml.includes('Status'));
assert.equal((detailHtml.match(/data-mf-save-mal/g)||[]).length,2);
assert(!detailHtml.includes('type="password"'));
console.log('PASS v0.4.3: recent/random carousels, personal ratings, MAL per-season status/repeat controls');
