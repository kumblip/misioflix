const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const html=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/configPage.html'),'utf8');
const css=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8');
const begin=src.indexOf('  function recommendationToggle(){');
const end=src.indexOf('  function recommendationShelf(',begin);
assert(begin>0&&end>begin);
class Node{
 constructor(tag,classes='',value=''){this.tag=tag;this.className=classes;this.textContent=String(value);this.attrs={};this.children=[];this.listeners={};this.hidden=false;}
 setAttribute(k,v){this.attrs[k]=String(v);}
 appendChild(v){this.children.push(v);return v;}
 addEventListener(k,fn){this.listeners[k]=fn;}
}
let initialized=0;
const area=new Node('div');area.hidden=false; // v0.4.111: proposals shown by default
const context={
 own:(tag,cls,val='')=>new Node(tag,cls,val),
 append:(p,...children)=>children.forEach(child=>p.appendChild(child)),
 homeRoot:{querySelector:q=>q==='#mf-home-recommendations'?area:null},
 recommendationInitialized:false,
 initializeRecommendations:()=>initialized++,
 epoch:4,Math
};
vm.createContext(context);
vm.runInContext(src.slice(begin,end),context);
const button=context.recommendationToggle().children[0];
assert.equal(button.attrs.role,'switch');
assert.equal(button.attrs['aria-checked'],'true');
assert.equal(button.attrs['aria-controls'],'mf-home-recommendations');
assert.equal(button.children[1].textContent,'Ukryj propozycje');
button.listeners.click();
assert.equal(area.hidden,true);
assert.equal(button.attrs['aria-checked'],'false');
assert.equal(initialized,0);
button.listeners.click();
assert.equal(area.hidden,false);
assert.equal(button.attrs['aria-checked'],'true');
assert.equal(initialized,1);
assert.equal(button.children[1].textContent,'Ukryj propozycje');
// Random must be a permutation of the entire genre pool, not five samples.
const input=Array.from({length:91},(_,i)=>i);
const randomized=context.randomizeRecommendations(input);
assert.equal(randomized.length,91);
assert.deepEqual([...randomized].sort((a,b)=>a-b),input);
assert(!src.includes('RANDOM_LIMIT===5'));
assert(css.includes('.mf-home-recommendations .mf-home-card-desc{display:none!important}'));
assert(html.includes('Gatunki propozycji'));
assert(html.includes('Zapisz propozycje'));
assert(src.includes('getCatalogForSearch()'));
assert(src.includes("const pageStart=row.offset"));
console.log('PASS v0.4.107: admin genre config, default-ON switch, full-pool random, paged cards, no descriptions');
