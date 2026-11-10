const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'../src/Jellyfin.Plugin.MisioFlix/Web/client.js'),'utf8');
let newNodes=0, httpRequests=0, routes=0;
const section={
  parentElement:null,attr:{},
  matches(s){return s.includes('section');},
  classList:{added:[],add(v){this.added.push(v);}},
  setAttribute(k,v){this.attr[k]=v;},
  querySelectorAll(q){
    if(q.includes('.card') || q.includes('.MuiCard'))return [card1,card2];
    if(q.includes('h1, h2'))return [heading];
    return [];
  }
};
const heading={textContent:'Kontynuuj odtwarzanie',parentElement:section};
const card1={attr:{},
  closest(){return null;},
  querySelector(q){ if(q.includes('.cardImageContainer'))return {}; if(q.includes('.itemProgressBarForeground'))return {};return null; },
  matches(){return false;},
  getAttribute(k){return this.attr[k]??null;},
  hasAttribute(k){return k in this.attr;},
  setAttribute(k,v){this.attr[k]=v;},
  removeAttribute(k){delete this.attr[k];}
};
const card2={...card1,attr:{},querySelector(q){if(q.includes('.cardImageContainer'))return {};return null;}};
const body={
  querySelectorAll(q){if(q.includes('h1, h2'))return [heading];return q.includes('.card') ? [card1,card2] : [];},
  parentElement:null
};
section.parentElement=body;
const home={querySelectorAll(q){return q.includes('h1')?[heading]:[];}};
const document={
  body,readyState:'complete', documentElement:{classList:{add(v){assert.equal(v,'misioflix-skin');}}},
  querySelector(q){if(q.includes('.homePage'))return home;return null;},
  addEventListener(){},createElement(){newNodes++;throw Error('Must not make custom card');}
};
const window={setTimeout(f){f();},addEventListener(){}};
const ctx={document,window,MutationObserver:class{observe(){}},fetch(){httpRequests++;},history:{pushState(){routes++;}}};
vm.runInNewContext(js,ctx);
assert.equal(section.attr['data-mf-section'],'resume');
assert(section.classList.added.includes('mf-section'));
assert.equal(card1.attr['data-mf-watch'],'started');
assert.equal(card2.attr['data-mf-watch'],undefined);
assert.equal(newNodes,0);assert.equal(httpRequests,0);assert.equal(routes,0);
console.log('PASS: original section annotated, no new sections/cards or extra API requests');
