const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/client.js'),'utf8');
assert(js.includes('\n})();'));
const instrumentation=`\n globalThis.__testHelpers={buildGenreFrequency,popularGenres,mediaCard,continueWatchingHero,home,set:(items,resume)=>{state.items=items;state.resume=resume;state.genreFrequency=buildGenreFrequency(items);}};\n})();`;
const code=js.replace(/\n\}\)\(\);\s*$/,instrumentation);
const sandbox={window:{},document:{readyState:'loading',addEventListener(){}},console};
vm.runInNewContext(code,sandbox,{filename:'client.js'});
const h=sandbox.__testHelpers;
assert(h,'missing test helpers');
const i=(id,anime,genres)=>({id,anime,genres,title:`Title ${id}`,plot:'To jest długi opis, który ma pozostać bez zmian.',type:anime?'Series':'Movie',kind:'Seria TV',year:'2026',has_image:false,progress_percent:0});
const items=[
 i('anime1',true,['Dramat','Komedia','Isekai','Fantasy','Akcja']),
 i('anime2',true,['Komedia','Akcja']),
 i('anime3',true,['Akcja']),
 i('movie1',false,['Dramat','Komedia','Akcja','Fantasy']),
 i('movie2',false,['Dramat','Komedia']),
 i('movie3',false,['Dramat']),
];
h.set(items,[]);
assert.deepEqual(Array.from(h.popularGenres(items[0],3)),['Akcja','Komedia','Dramat']);
assert.deepEqual(Array.from(h.popularGenres(items[3],3)),['Dramat','Komedia','Akcja']);
const html=h.mediaCard(items[0]);
assert.equal((html.match(/class="mf-pill"/g)||[]).length,3,'3 visible genre pills');
assert(html.includes('To jest długi opis, który ma pozostać bez zmian.'));
assert(h.home().includes('Oglądaj dalej'));
const resume=[{id:'ep1',catalog_id:'anime1',progress_percent:37.6},{id:'movie1',catalog_id:'movie1',progress_percent:58}];
h.set(items,resume);
const hero=h.continueWatchingHero();
assert(hero.includes('data-mf-jellyfin="ep1"')&&hero.includes('38% obejrzano'));
assert(hero.includes('data-mf-jellyfin="movie1"'));
assert(hero.includes('Title anime1'));
console.log('PASS: genre popularity, 3 pills, unchanged description, hero resume');
