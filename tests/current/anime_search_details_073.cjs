// v0.4.73: the real search dropdown uses the NFO Typ value and season's own episode count.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const crop=(a,b)=>{
  const start=src.indexOf(a),end=src.indexOf(b,start+1);
  assert(start>=0&&end>start,`missing range ${a} - ${b}`);
  return src.slice(start,end);
};
function own(tag,cls,text=''){
  return {
    tagName:tag,className:cls,textContent:text,children:[],hidden:false,
    appendChild(el){this.children.push(el);return el;},
    replaceChildren(...els){this.children=els;},
    setAttribute(k,v){this[k]=v},
    addEventListener(){},
  };
}
const ctx={
  ANIME_SET:new Set(['Akcja','Fantasy']),
  allowGroup:()=>true,
  validId:s=>/^[a-f0-9]{32}$/i.test(String(s||'')),
  compactId:s=>String(s||'').toLowerCase().replaceAll('-',''),
  normalized:s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),
  own,
  append:(parent,...children)=>children.forEach(el=>parent.appendChild(el)),
  short:n=>String(n),
  imageFor:()=>'',
  nativeDetails:id=>'#/details?id='+id,
  closeSearch:()=>{}
};
vm.createContext(ctx);
vm.runInContext(crop('  function toHomeCardItem(item){','  // CATALOG LOADS ONLY AFTER'),ctx);
vm.runInContext(crop('  function catalogGenres(item,kind){','  function updateGenreSummary(state){'),ctx);
const parentId='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const values=[
  ['Prologue','2020','ONA',1],
  ['Pierwszy sezon','2019','Seria TV',13],
  ['Drugi sezon','2022','Seria TV',12],
  ['Yorimichi','2022','Special',1],
  ['Trzeci sezon','2024','Seria TV',16],
  ['OVA próba','2020','OVA',2]
];
const seasons=values.map(([title,year,kind,count],i)=>({
 id:String(i+1).repeat(32),type:'Season',parent_series_id:parentId,
 anime:true,title,year,kind,episode_count:count,has_image:false
}));
const state={
 kind:'anime',matches:seasons,
 input:{value:'ar'},suggestions:own('div','suggestions'),
 pool:seasons,seasonBySeries:new Map(),seasonsBySeries:new Map()
};
ctx.suggestSearch(state);
assert.equal(state.suggestions.children.length,0,'nonmatching search produces no suggestions');
state.input.value='';
// Caller returns title matches. Each independent season keeps its own kind/count.
for(const [i,season] of seasons.entries()){
 state.matches=[season];state.input.value=season.title.toLowerCase().slice(0,3);
 ctx.suggestSearch(state);
 const suggestions=state.suggestions.children;
 assert.equal(suggestions.length,1,season.title);
 const facts=suggestions[0].children[1].children[1].textContent;
 assert.equal(facts,`${season.year} · ${season.kind} · ${ctx.episodeCountLabel(season.episode_count)}`);
 assert(!facts.includes('Sezon / Specials'));
}
for(const [count,expected] of [[1,'1 odcinek'],[2,'2 odcinki'],[4,'4 odcinki'],[12,'12 odcinków'],[14,'14 odcinków'],[16,'16 odcinków'],[22,'22 odcinki']]){
 assert.equal(ctx.episodeCountLabel(count),expected);
}
state.matches=[{...seasons[0],kind:'',episode_count:null}];state.input.value='pro';ctx.suggestSearch(state);
assert.equal(state.suggestions.children[0].children[1].children[1].textContent,'2020 · Sezon (brak typu w NFO)');
const parent={id:parentId,type:'Series',anime:true,title:'Arifureta',year:'2019',season_count:5,episode_count:43};
state.matches=[parent];state.input.value='ari';ctx.suggestSearch(state);
assert.equal(state.suggestions.children[0].children[1].children[1].textContent,'2019 · 5 sezonów · 43 odcinków');
console.log('PASS v0.4.73: NFO Seria TV/ONA/OVA/Special, individual episode counts, Polish plurals, missing type, parent totals');
