const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const js=fs.readFileSync(path.join(__dirname,'../src/Jellyfin.Plugin.MisioFlix/Web/client.js'),'utf8');
let creates=0, fetches=0, navigations=0, observed=0;
const getCard=(status)=>({
  attributes:{},
  querySelector(selector){
    if(selector.includes('.cardImageContainer'))return {tagName:'DIV'};
    if(status==='watched' && selector.includes('.playedIndicator'))return {};
    if(status==='started' && selector.includes('.itemProgressBarForeground'))return {};
    if(status==='unwatched' && selector.includes('.unplayedIndicator'))return {};
    return null;
  },
  matches(selector){return false;},closest(){return null;},
  hasAttribute(n){return n in this.attributes;},
  getAttribute(n){return this.attributes[n]??null;},
  setAttribute(n,v){this.attributes[n]=v;},
  removeAttribute(n){delete this.attributes[n];}
});
const cards=[getCard('watched'),getCard('started'),getCard('unwatched'),getCard('unknown')];
const body={querySelectorAll(){return cards;}};
const document={readyState:'complete',body,
  documentElement:{classList:{add(v){assert.equal(v,'misioflix-skin');}}},
  querySelector(){return null;},
  querySelectorAll(){return [];},
  createElement(){creates++;throw Error('Must not create application UI');},
  addEventListener(){}
};
const window={addEventListener(){},setTimeout(fn){fn();}};
const sandbox={document,window,
  MutationObserver:class {observe(){observed++;}},
  fetch(){fetches++; throw Error('No duplicate catalog downloads');},
  history:{pushState(){navigations++;}}
};
vm.runInNewContext(js,sandbox,{filename:'client.js'});
assert.equal(observed,1);
assert.equal(cards[0].attributes['data-mf-watch'],'watched');
assert.equal(cards[1].attributes['data-mf-watch'],'started');
assert.equal(cards[2].attributes['data-mf-watch'],'unwatched');
assert.equal(cards[3].attributes['data-mf-watch'],undefined,'unknown Jellyfin state should not be guessed');
assert.equal(creates,0);assert.equal(fetches,0);assert.equal(navigations,0);
assert(cards.every(c=>c.attributes['data-mf-card']==='1'));
console.log('PASS: native Jellyfin DOM reused, no parallel catalog, no page or navigation, status indicators preserved');
