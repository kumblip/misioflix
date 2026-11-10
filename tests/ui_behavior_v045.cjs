const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'src/Jellyfin.Plugin.MisioFlix/Web/client.js'), 'utf8');
const code = js.replace(/\n\}\)\(\);\s*$/, `
  globalThis.testApi={finishManualMal,malAccountPage,apiClient,setMal:v=>state.mal=v,getMal:()=>state.mal};
})();`);
let textarea={value:'http://localhost:8765/callback?code=short-code&state=one-time-state'};
const calls=[];
const sandbox={
  window:{ApiClient:{accessToken:()=> 'jf-a'}},
  document:{readyState:'loading',addEventListener(){},querySelector:s=> s==='[data-mf-mal-redirect-text]'?textarea:null},
  console,
  fetch:async (url,opts)=>{
    calls.push({url,opts});
    if(url.endsWith('/mal/complete'))return {ok:true,json:async()=>({connected:true})};
    if(url.includes('/mal/status'))return {ok:true,json:async()=>({connected:true,malUserId:123,username:'AnimeFan',entries:{}})};
    throw Error('Unexpected fetch: '+url);
  }
};
vm.runInNewContext(code,sandbox,{filename:'client.js'});
(async()=>{
  const t=sandbox.testApi;
  t.apiClient();
  t.setMal({connected:false,malUserId:null,username:null,entries:{},manualReady:true});
  const html=t.malAccountPage();
  assert(html.includes('data-mf-mal-redirect-text'),'manual URL input must appear');
  assert(html.includes('code='),'instructions must mention authorization code');
  await t.finishManualMal();
  assert.equal(calls[0].url,'/MisioFlix/api/mal/complete');
  assert.equal(calls[0].opts.method,'POST');
  assert.equal(JSON.parse(calls[0].opts.body).redirectUrl,'http://localhost:8765/callback?code=short-code&state=one-time-state');
  assert.equal(textarea.value,'','authorization URL must be cleared from UI');
  assert.equal(t.getMal().manualReady,false,'manual form should close after success');
  assert.equal(t.getMal().connected,true,'user should be linked after refresh');
  assert.equal(t.getMal().username,'AnimeFan');
  assert(!calls[0].url.includes('code='),'authorization code must never appear in MisioFlix request URL');
  console.log('PASS v0.4.5: manual OAuth POST body, one-time URL cleared, account linked');
})().catch(e=>{console.error(e);process.exitCode=1});
