const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(dir,'src/Jellyfin.Plugin.MisioFlix/Web/client.js'),'utf8');
const code=js.replace(/\n\}\)\(\);\s*$/, `
 globalThis.t={apiClient,malAccountControls,malAccountPage,
 setToken:(v)=>{state.token=v},
 setMal:(v)=>{state.mal=v},
 setReady:()=>{state.ready=true;state.items=[{id:'old-account-item'}];state.detail={item:{id:'old-account-item'}}},
 getState:()=>state};
})();`);
const sandbox={
 window:{ApiClient:{accessToken:()=>"auth-a"}},
 document:{readyState:'loading',addEventListener(){},querySelector:()=>null},
 console
};
vm.runInNewContext(code,sandbox,{filename:'client.js'});
const t=sandbox.t;
assert(t.apiClient());
t.setMal({connected:true,username:'AnimeFan & Friends',malUserId:1222,entries:{},loading:false,error:null});
const page=t.malAccountPage();
assert(page.includes('AnimeFan &amp; Friends'), 'MAL username must be HTML-escaped');
assert(page.includes('1222'), 'display own MAL user ID');
assert(page.includes('Połączono'));
assert(page.includes('Odłącz'));
assert(!page.includes('access_token'));
t.setReady();
sandbox.window.ApiClient.accessToken=()=>"auth-b";
assert(t.apiClient());
const after=t.getState();
assert.equal(after.ready,false,'switching user must invalidate previous catalogue');
assert.equal(after.detail,null,'switching user must clear detail view');
assert.equal(after.items.length,0,'switching user must clear previous Jellyfin catalogue');
assert.equal(after.mal.connected,false,'switching user must clear previous MAL identity');
assert.equal(after.mal.username,null);
assert.equal(after.token,'auth-b');
t.setMal({connected:true,username:'Another User',malUserId:3,entries:{}});
sandbox.window.ApiClient.accessToken=()=>null;
assert.equal(t.apiClient(),null,'logout returns null');
assert.equal(t.getState().mal.username,null,'logout must erase previous MAL name');
assert.equal(t.getState().token,null,'logout clears token');
console.log('PASS v0.4.4: individual account display, HTML escaping and logout/account switching isolation');
