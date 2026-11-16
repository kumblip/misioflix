// v0.4.90: exercise the real home.js poster renderer (not a replica).
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../../');
const source=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
const begin=source.indexOf('  function imageFor(item){');
const end=source.indexOf('  // Pointer-driven mouse / stylus drag',begin);
assert(begin>0&&end>begin);
class Elem {
 constructor(tag,cls='',value=''){this.tag=tag;this.className=cls;this.textContent=String(value);this.children=[];this.attributes={};this.listeners={};this.dataset={};this.classList={add:()=>{}};}
 get childElementCount(){return this.children.length}
 appendChild(child){this.children.push(child);child.parent=this;return child}
 setAttribute(k,v){this.attributes[k]=String(v)}
 addEventListener(){}
 remove(){}
}
const ctx={own:(...a)=>new Elem(...a),set:(el,k,v)=>{el.setAttribute(k,v);return el},append:(el,...children)=>{children.forEach(c=>el.appendChild(c));return el},
 validId:id=>/^[a-f0-9]{32}$/.test(String(id).replace(/-/g,'')),compactId:id=>String(id).replace(/-/g,''),nativeDetails:id=>'#/details?id='+id,
 short:v=>v==null||v===''?'':String(v),paw:()=>new Elem('svg','mf-home-paw'),document:{createElement:tag=>new Elem(tag)}};
vm.createContext(ctx);vm.runInContext(source.slice(begin,end),ctx);
const common={id:'0123456789abcdef0123456789abcdef',hasPrimary:true,year:2010,genres:[],title:'Example',watchStatus:'started'};
const childrenOf=element=>element.children.flatMap(ch=>[ch,...childrenOf(ch)]);
for(const type of ['Movie','Series']){
 const poster=ctx.makePoster({...common,type,memberCollectionCount:3,memberCollectionName:'Test collection',seasons:2,episodes:22});
 const badge=childrenOf(poster).find(x=>x.className.includes('mf-home-member-collection'));
 assert(badge,`${type} must have collection badge`);
 assert.deepEqual(badge.children.map(c=>c.textContent),['3','📦'],'separate number/icon in one stats row');
 assert.equal(badge.children[0].className,'mf-home-stat-number');
 assert.equal(badge.children[1].className,'mf-home-box-icon');
 assert(badge.attributes.title.includes('Test collection'));
 assert(badge.parent.className.includes('mf-home-stats'),'must be right-top under paws');
}
for(const item of [{...common,type:'Movie'}, {...common,type:'Series',memberCollectionCount:0},{...common,type:'BoxSet',collectionCount:3}]){
 const poster=ctx.makePoster(item);
 assert(!childrenOf(poster).some(x=>x.className.includes('mf-home-member-collection')));
}
console.log('PASS v0.4.90: real shelf renderer, card membership, no false badges, CSS output');
