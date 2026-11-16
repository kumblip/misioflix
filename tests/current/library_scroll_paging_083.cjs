// v0.4.83 regression for user's actual Jellyfin 12.4 library request.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/library-scroll.js'),'utf8');
const start=src.indexOf('  function pageParams('), end=src.indexOf('  function queryParams(',start);
assert(start>0 && end>start,'pageParams helper exists');
const context={};vm.createContext(context);vm.runInContext(src.slice(start,end),context);
const base={startIndex:'0',limit:'100',recursive:'false',sortOrder:'Ascending',fields:'PrimaryImageAspectRatio',
  includeItemTypes:'Series',sortBy:'SortName',imageTypeLimit:'1',enableImageTypes:'Backdrop',
  ParentId:'a'.repeat(32),StartIndex:'0',Limit:'1'};
for(const offset of [0,100,200,500,600]){
  const p=vm.runInContext(`pageParams(${JSON.stringify(base)},${offset},100)`,context);
  assert.equal(Number(p.StartIndex),offset);
  assert.equal(Number(p.Limit),100);
  assert.equal(p.includeItemTypes,'Series');
  const q=new URLSearchParams(p);
  const keys=[...q.keys()].map(x=>x.toLowerCase());
  assert.equal(keys.filter(x=>x==='startindex').length,1,'no duplicate start index');
  assert.equal(keys.filter(x=>x==='limit').length,1,'no duplicate limit');
  assert.equal(q.get('StartIndex'),String(offset));
  assert.equal(q.get('Limit'),'100');
  assert.equal(q.get('ParentId'),base.ParentId);
}
assert(src.includes('if(repeated.length)'), 'stop if API returns already loaded cards');
assert(src.includes('s.complete=true;'), 'fail safely to native paging');
assert(src.includes('s.next+=items.length;'), 'advance only after validated response');
console.log('PASS 0.4.83: API pagination case-insensitivity, preserved query, duplicate-page guard');
