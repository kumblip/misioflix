// v0.4.74 — real season.nfo ordinals appear in dropdowns and RED paws over BLUE.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'../..');
const source=fs.readFileSync(path.join(base,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
function crop(a,b){const i=source.indexOf(a),j=source.indexOf(b,i+a.length);assert(i>=0&&j>i,a);return source.slice(i,j);}
function element(tag,cls='',val=''){
  const e={tagName:tag,className:cls,children:[],attrs:{},style:{},dataset:{},
    textContent:String(val),hidden:false,get childElementCount(){return this.children.length},appendChild(child){this.children.push(child);return child;},
    append(...children){children.forEach(c=>this.appendChild(c));},
    replaceChildren(...children){this.children=children;},
    setAttribute(k,v){this.attrs[k]=String(v)},
    addEventListener(){},
    classList:{add(c){e.className=(e.className+' '+c).trim();}}
  };return e;
}
const ctx={
  document:{createElementNS:(ns,tag)=>element(tag)},
  own:element,
  set:(e,k,v)=>(e.setAttribute(k,v),e),
  append:(e,...children)=>(children.forEach(x=>e.appendChild(x)),e),
  validId:v=>/^[a-f\d]{32}$/i.test(String(v||'')),
  compactId:v=>String(v||'').replaceAll('-','').toLowerCase(),
  nativeDetails:id=>'#/details?id='+id,
  ANIME_SET:new Set(['Fantasy']),
  normalized:v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),
  allowGroup:()=>true,
  closeSearch:()=>{}
};
vm.createContext(ctx);
vm.runInContext(crop('  function paw(color) {','  function nativeDetails(id, serverId){'),ctx);
vm.runInContext(crop('  function imageFor(item){','  function makeCard(item){'),ctx);
vm.runInContext(crop('  function toHomeCardItem(item){','  // CATALOG LOADS ONLY AFTER'),ctx);
vm.runInContext(crop('  function catalogGenres(item,kind){','  function updateGenreSummary(state){'),ctx);
const id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const raw=[
  ['Prologue',2020,1,'ONA',1],
  ['Arifureta',2019,2,'Seria TV',13],
  ['2nd Season',2022,3,'Seria TV',12],
  ['Yorimichi',2022,4,'Special',1],
  ['Season 3',2024,5,'Seria TV',16]
];
const state={kind:'anime',matches:[],pool:[],input:{value:'ari'},suggestions:element('div','suggestions'),seasonsBySeries:new Map()};
for(const [i,[name,year,ordinal,kind,episodes]] of raw.entries()){
  const item={id:String(i+1).repeat(32),parent_series_id:id,anime:true,type:'Season',title:'Arifureta '+name,
    year:String(year),kind,season_number:ordinal,episode_count:episodes,genres:[],has_image:false};
  state.matches=[item];
  ctx.suggestSearch(state);
  assert.equal(state.suggestions.children.length,1);
  const facts=state.suggestions.children[0].children[1].children[1].textContent;
  assert.equal(facts,`${year} · Season ${String(ordinal).padStart(2,'0')} · ${kind} · ${episodes} ${episodes===1?'odcinek':'odcinków'}`);
  const poster=ctx.makePoster(ctx.searchTile(item,state));
  const stack=poster.children.find(x=>x.className.startsWith('mf-home-stats'));
  assert(stack);
  assert.deepEqual(stack.children.map(e=>e.attrs.title),[`Season ${String(ordinal).padStart(2,'0')}`,'Odcinki']);
  assert.deepEqual(stack.children.map(e=>e.children[0].textContent),[String(ordinal).padStart(2,'0'),String(episodes)]);
  assert.deepEqual(stack.children.map(e=>e.children[1].style.color),['#ff606b','#6bd1f6']);
}
// No invented ordinal when NFO omitted <seasonnumber>.
const without={id:'ffffffffffffffffffffffffffffffff',anime:true,type:'Season',title:'Arifureta no number',year:'2021',kind:'OVA',episode_count:2};
state.matches=[without];ctx.suggestSearch(state);
assert.equal(state.suggestions.children[0].children[1].children[1].textContent,'2021 · OVA · 2 odcinki');
const unknown=ctx.makePoster(ctx.searchTile(without,state));
assert.deepEqual(unknown.children.find(x=>x.className==='mf-home-stats').children.map(e=>e.attrs.title),['Odcinki']);
// Parent series keeps the gold overall-season paw and no red paw.
const parent={id,type:'Series',anime:true,title:'Arifureta',year:'2019',season_count:5,episode_count:43};
const poster=ctx.makePoster(ctx.searchTile(parent,state));
const stack=poster.children.find(x=>x.className==='mf-home-stats');
assert.deepEqual(stack.children.map(e=>e.attrs.title),['Sezony','Odcinki']);
assert.deepEqual(stack.children.map(e=>e.children[1].style.color),['#f7b449','#6bd1f6']);
// Source-to-client plumbing: NFO value, no invented title heuristics.
const service=fs.readFileSync(path.join(base,'src/Jellyfin.Plugin.MisioFlix/Services/MisioFlixCatalogService.cs'),'utf8');
assert(service.includes('int.TryParse(V("seasonnumber")'));
assert(service.includes('season_number = Text(Get(json, "Type")) == "Season" ? local?.SeasonNumber : null'));
console.log('PASS v0.4.74: NFO 01–05, suggestions, red paw above blue, parent gold, missing NFO index');
