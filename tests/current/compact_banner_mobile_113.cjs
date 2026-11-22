'use strict';
// Exercise the actual banner/shortcut functions, with a minimal DOM surrogate.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const js=fs.readFileSync('src/Jellyfin.Plugin.MisioFlix/Web/home.js','utf8');
const css=fs.readFileSync('src/Jellyfin.Plugin.MisioFlix/Web/theme.css','utf8');
class El {
  constructor(tag,cls,txt){this.tag=tag;this.className=cls;this.textContent=txt||'';this.children=[];this.attrs={};this.listeners={};}
  replaceChildren(...children){this.children=[...children];}
  appendChild(child){this.children.push(child);return child;}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(k,fn){this.listeners[k]=fn;}
}
const own=(tag,cls,txt)=>new El(tag,cls,txt);
const set=(node,key,val)=>{node.attrs[key]=val;return node;};
const append=(node,...children)=>{children.forEach(child=>node.appendChild(child));return node;};
const demo=[
  {name:'Seriale PL',id:'1',category:'series',href:'#series'},
  {name:'AnimePL',id:'2',category:'anime',href:'#anime'},
  {name:'Filmy PL',id:'3',category:'movies',href:'#movies'},
  {name:'Anime ENG',id:'4',category:'anime',href:'#animeeng'}
];
const box=own('div','mf-home-folder-buttons');
const ctx={own,set,append,discoveryRefs:{folderButtons:box},librariesCache:demo,
    COLLECTIONS_URL:'#/home?mfCollections=1',safeLibraryHref:href=>href,openSearch:()=>{}};
function pick(start,end){const a=js.indexOf(start);const b=js.indexOf(end,a+1);assert(a>=0&&b>a);return js.slice(a,b);}
vm.runInNewContext(pick('  function paintFolderButtons(){','  function createCollectionsPage(){')+'\npaintFolderButtons();',ctx);
assert.deepEqual(box.children.map(x=>x.textContent),[
  'Anime ENG','AnimePL','Filmy PL','Kolekcje','Seriale PL',
  'Wyszukiwarka anime','Wyszukiwarka filmów i seriali','Smart Downloads']);
const hero=vm.runInNewContext(pick('  function hero(shortcuts){','  function resumeShelf(){')+'\nhero(discoveryRefs.section);',{
  own,append,discoveryRefs:{section:own('nav','mf-home-discovery')}
});
assert.equal(hero.className,'mf-home-hero');
assert.equal(hero.children.length,2);
assert.equal(hero.children[0].children.length,1);
assert.equal(hero.children[0].children[0].className,'mf-home-logo');
assert.equal(hero.children[1].className,'mf-home-discovery');
assert(css.includes('.mf-home-search-launch{order:1}'));
assert(css.includes('.mf-home-mal-button{order:2}'));
assert(css.includes('.mf-home-simkl-button{order:3}'));
assert(css.includes('flex:0 0 calc((100% - 16px)/3)'));
assert(css.includes('.mf-home-card-desc{display:none}'));
console.log('PASS v0.4.113: alphabetic navigation, compact hero and mobile search-scale shelves');
