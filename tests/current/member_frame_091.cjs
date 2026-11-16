// Regression for the actual Simkl score insertion used by v0.4.91.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const R=path.join(__dirname,'../../');
const js=fs.readFileSync(path.join(R,'src/Jellyfin.Plugin.MisioFlix/Web/simkl.js'),'utf8');
const first=js.indexOf('  function renderCardScore(card,score,native){');
const last=js.indexOf('  function nearby(card){',first);
assert(first>0&&last>first);
class Elem{
  constructor(cls='',text=''){this.className=cls;this._text=text;this.children=[];this.parentElement=null;this.attributes={};}
  get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
  set textContent(value){this._text=String(value);this.children=[];}
  get childElementCount(){return this.children.length;}
  get nextElementSibling(){if(!this.parentElement)return null;const a=this.parentElement.children;return a[a.indexOf(this)+1]||null;}
  append(...els){for(const el of els){el.remove();this.children.push(el);el.parentElement=this;}return this;}
  insertBefore(el,before){el.remove();const n=this.children.indexOf(before);assert(n>=0,'must insert before existing membership');this.children.splice(n,0,el);el.parentElement=this;}
  remove(){if(!this.parentElement)return;const a=this.parentElement.children;const n=a.indexOf(this);if(n>=0)a.splice(n,1);this.parentElement=null;}
  setAttribute(k,v){this.attributes[k]=String(v);}
  removeAttribute(k){delete this.attributes[k];}
  querySelector(sel){const names=sel.split(',').map(x=>x.trim().split(' ').at(-1).replace(/\./g,''));return this.children.find(ch=>names.some(x=>ch.className.split(' ').includes(x)))||null;}
}
function run(native,withPaw,member){
 const frame=new Elem(native?'mf-native-stats':'mf-home-stats');
 if(withPaw)frame.append(new Elem(native?'mf-native-stat':'mf-home-stat','🐾'));
 if(member)frame.append(new Elem(native?'mf-native-collection-member':'mf-home-member-collection','3 📦'));
 const card={attributes:{},querySelector(sel){if(sel.startsWith('.mf-simkl-'))return frame.querySelector(sel);if(sel.includes('mf-native-stats')||sel.includes('mf-home-stats'))return frame;return null;},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},append() {throw Error('already has stats container');}};
 const context={el:(tag,cls,text)=>new Elem(cls,text),simklPaw:()=>new Elem('mf-simkl-score-paw','')};
 vm.createContext(context);vm.runInContext(js.slice(first,last),context);
 context.renderCardScore(card,7,native);
 assert.deepEqual(frame.children.map(c=>c.className),[...(withPaw?[native?'mf-native-stat':'mf-home-stat']:[]),native?'mf-simkl-native-score':'mf-simkl-home-score',...(member?[native?'mf-native-collection-member':'mf-home-member-collection']:[])]);
 assert.equal(frame.children.filter(c=>c.className.includes('simkl')).length,1);
 const before=frame.children.map(c=>c);
 context.renderCardScore(card,7,native);
 assert.deepEqual(frame.children,before,'score must stay idempotent');
 // Simulate a stale card where the already-existing score is below collection.
 if(member){const rating=frame.children.find(c=>c.className.includes('simkl'));frame.append(rating);context.renderCardScore(card,7,native);assert.equal(frame.children.at(-1).textContent,'3 📦','membership must remain last');}
 context.renderCardScore(card,8,native);
 assert.equal(frame.children.find(c=>c.className.includes('simkl')).children[0].textContent,'8');
 if(member)assert.equal(frame.children.at(-1).textContent,'3 📦');
}
run(false,false,true); // Film: rating + collection
run(true,true,true);   // Series: seasons/episodes + rating + collection
run(true,false,true);  // Film in native library
run(false,true,false); // No collection must not get fake membership
console.log('PASS: home/native paw scores precede BoxSet membership in same container');
