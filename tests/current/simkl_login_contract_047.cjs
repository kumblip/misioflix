'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const script=fs.readFileSync(path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/simkl.js'),'utf8');
const userId='1234567890abcdef1234567890abcdef';

class Element {
  constructor(tag) { this.tagName=tag; this.children=[];this.listeners={};this.className='';this.textContent='';this.dataset={};this.isConnected=true;this.disabled=false; }
  append(...children) {this.children.push(...children);for(const x of children) x.isConnected=true;}
  replaceChildren(...children) {for(const x of this.children) x.isConnected=false;this.children=[];this.append(...children);}
  remove() {this.isConnected=false;}
  setAttribute(k,v) {this[k]=v;}
  addEventListener(k,fn) { (this.listeners[k] ||= []).push(fn); }
  querySelector(sel) {if(sel==='.mf-home-simkl-button')return locate(this, x=>x.className.includes('mf-home-simkl-button'));return null;}
  getClientRects() {return [{}];}
  press() {const handlers=this.listeners.click||[];return Promise.all(handlers.map(fn=>fn({target:this,preventDefault(){}})));}
}
function locate(root, predicate) {if(predicate(root))return root;for(const child of root.children){const hit=locate(child,predicate);if(hit)return hit;}return null;}
async function run(label,api,startShouldWork){
  const folder=new Element('div');const body=new Element('body');let init;const calls=[];const scheduled=[];
  const document={body, readyState:'loading',createElement(tag){return new Element(tag);},addEventListener(event,cb){if(event==='DOMContentLoaded')init=cb;},querySelector(sel){if(sel==='.mf-home-hero .mf-home-folder-buttons')return folder;return null;},querySelectorAll(){return [];}};
  const browser={ApiClient:{getCurrentUserId(){return userId;},accessToken(){return 'test-token';}},location:{hash:'#/home'},addEventListener(){},setTimeout(cb){scheduled.push(cb);return scheduled.length;},clearTimeout(){},confirm(){return true;}};
  const fetch=async (url,opts={})=>{
    const route=url.replace('/MisioFlix/api/simkl','');calls.push(route);
    const data=api[route];assert.ok(data,`Unexpected request: ${route}`);
    return {ok:true,status:200,async json(){return typeof data==='function'?data(opts):data;}};
  };
  class MutationObserver {observe() {}}
  const context={document,window:browser,location:browser.location,fetch,MutationObserver,AbortController,URLSearchParams,console};
  vm.runInNewContext(script,context,{filename:'simkl.js',timeout:1000});
  init();scheduled.shift()();
  await Promise.resolve();await Promise.resolve();
  const open=locate(folder,x=>x.className.includes('mf-home-simkl-button'));
  assert.ok(open,'Home Simkl button should be present');
  await open.press();
  const modal=locate(body,x=>x.className==='mf-simkl-modal-overlay');
  assert.ok(modal,'Modal should open');
  const start=locate(modal,x=>x.textContent==='Rozpocznij łączenie Simkl');
  assert.ok(start,'Start button should appear for disconnected account');
  await start.press();
  const pin=locate(modal,x=>x.className==='mf-simkl-pin');
  const link=locate(modal,x=>x.className==='mf-simkl-link');
  if(startShouldWork){
    assert.equal(pin?.textContent,'ABCD-EF','PIN must display without lost case');
    assert.equal(link?.href,'https://simkl.com/pin/','Never navigate to /web/undefined');
    assert.equal(link?.target,'_blank');
    const poll=locate(modal,x=>x.textContent==='Sprawdź zatwierdzenie');
    assert.ok(poll,'Check approval button should appear');
    await poll.press();
    assert.ok(calls.includes('/poll'),'Approval button should POST to poll endpoint');
    assert.equal(locate(modal,x=>x.textContent==='Rozłącz Simkl')?.tagName,'button','After approval, connected account should be shown');
  }else{
    assert.equal(link,null,'Malformed response may not render clickable link');
    assert.equal(pin,null,'Malformed response may not display empty PIN');
    const message=locate(modal,x=>x.className==='mf-simkl-message');
    assert.match(message?.textContent||'',/Nie otrzymano poprawnego kodu PIN Simkl/);
  }
  console.log('PASS '+label);
}
(async()=>{
  let approved=false;
  await run('v0.4.47 simulated connect + check success',{
    '/connection':()=>({connected:approved,canWrite:approved}),
    '/connect':{code:'ABCD-EF',uri:'https://simkl.com/pin/',interval:5,expiresIn:900},
    '/poll':()=>{approved=true;return {connected:true,pending:false,retryAfter:0};}
  },true);
  await run('v0.4.47 old PascalCase response blocks invalid navigation',{
    '/connection':{connected:false,canWrite:false},
    '/connect':{Code:'ABCD-EF',Uri:'https://simkl.com/pin/',Interval:5,ExpiresIn:900}
  },false);
})().catch(err=>{console.error(err);process.exitCode=1;});
