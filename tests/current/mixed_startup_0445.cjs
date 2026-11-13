// Functional regression for the one-shot native /mixed cold-load recovery.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.resolve(__dirname, '../..');
const homeJS = fs.readFileSync(path.join(root, 'src/Jellyfin.Plugin.MisioFlix/Web/home.js'), 'utf8');

function setup(sharedStore, pageText, hash='#/mixed?topParentId=327b6616c3250a41abd22c39c4c7ca81&collectionType=mixed'){
  let reloads = 0;
  const handlers = { document: {}, window: {} };
  const timeouts = [];
  const storage = {
    getItem: (key) => sharedStore.get(key) ?? null,
    setItem: (key, value) => sharedStore.set(key, String(value)),
    removeItem: (key) => sharedStore.delete(key),
  };
  const body = {textContent:pageText};
  const location = {
    hash,
    pathname:'/web/',search:'',
    replace: ()=>{ throw Error('Unexpected route replacement'); },
    reload: ()=>{reloads++;},
  };
  class MutationObserver {
    constructor(callback) { this.callback = callback; }
    observe() { /* Native DOM is intentionally not modified. */ }
  }
  const doc = {
    readyState:'loading',body,
    addEventListener: (name, cb) => { (handlers.document[name] ||= []).push(cb); },
    querySelector: () => null,
    documentElement: {classList:{add:()=>{},remove:()=>{}}},
  };
  const win = {
    location, ApiClient:null,ConnectionManager:null,
    addEventListener: (name, cb) => { (handlers.window[name] ||= []).push(cb); },
    setTimeout: (cb)=>{timeouts.push(cb);return timeouts.length;},
    clearTimeout: ()=>{},
  };
  const ctx=vm.createContext({window:win,document:doc,sessionStorage:storage,
    URLSearchParams,MutationObserver,console});
  vm.runInContext(homeJS,ctx,{filename:'home.js'});
  (handlers.document.DOMContentLoaded||[]).forEach(cb=>cb());
  return {
    win, body, handlers,
    flush(){while(timeouts.length){const batch=timeouts.splice(0);batch.forEach(fn=>fn());}},
    reloads:()=>reloads
  };
}

const exact='TypeError\ne.addScrollEventListener is not a function';
{
  const store=new Map();
  const first=setup(store,exact);
  first.flush();
  assert.strictEqual(first.reloads(),1,'exact native scroller crash should reload only once');
  assert.strictEqual(store.get('misioflix-native-mixed-scroll-retry'),'1');
  // Browser reload: same sessionStorage, new JS runtime.
  const second=setup(store,exact);
  second.flush();
  assert.strictEqual(second.reloads(),0,'a repeated crash must remain visible, not reload-loop');
  second.win.location.hash='#/home';
  (second.handlers.window.hashchange||[]).forEach(cb=>cb());
  assert.strictEqual(store.has('misioflix-native-mixed-scroll-retry'),false,
    'leaving AnimePL should allow a later fresh visit to recover');
}
{
  const store=new Map();
  const healthy=setup(store,'Wszystkie anime są widoczne');
  healthy.flush();
  assert.strictEqual(healthy.reloads(),0,'healthy library must never reload');
  assert.strictEqual(store.size,0,'healthy library should not touch recovery storage');
  const unrelated=setup(store,'TypeError\nu.forEach is not a function');
  unrelated.flush();
  assert.strictEqual(unrelated.reloads(),0,'unrelated native exception must never reload');
  const wrongRoute=setup(store,exact,'#/details?id=1234');
  wrongRoute.flush();
  assert.strictEqual(wrongRoute.reloads(),0,'details screen must never recover /mixed');
}
console.log('PASS: one-shot /mixed recovery is scoped, loop-safe, and does not touch healthy pages');
