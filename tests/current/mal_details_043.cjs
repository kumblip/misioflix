'use strict';
// Behavioral regression coverage of the actual v0.4.43 MAL detail functions.
// Does not need Jellyfin, MyAnimeList, jsdom, or a network connection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../src/Jellyfin.Plugin.MisioFlix/Web/mal.js'), 'utf8');
const part = (from, to) => {
  const a = source.indexOf(from), b = source.indexOf(to, a + from.length);
  assert(a >= 0 && b > a, `Missing source fragment ${from} -> ${to}`);
  return source.slice(a, b);
};

// 1. Exact production status/large-poster mapping; absent verified MAL entry is pink.
const statusSource = part('  const statusState=', '  const statusLabel=');
const ratingSource = part('  function showDetailMalRating(', '  function showMalSaveToast(');
const entryFields = entry => entry?.my_list_status || entry || {};
const el = (_tag, cls, text) => ({className: cls, textContent: text || '', title: ''});
const {statusState, showDetailMalRating} = new Function('entryFields','el',
  `${statusSource}\n${ratingSource}\nreturn {statusState,showDetailMalRating};`)(entryFields,el);
function posterStatus(entry) {
  const page = {
    attrs: {}, label: null,
    classList: {add() {}},
    setAttribute(name, value) { this.attrs[name] = value; },
    querySelector(selector) {
      if (selector === '.mf-detail-mal-badge') return this.label;
      return {appendChild: child => {this.label = child;}};
    }
  };
  const panel = {closest: () => page};
  showDetailMalRating(panel, entry);
  return [page.attrs['data-mf-mal-watch'], page.label?.textContent];
}
assert.deepEqual(posterStatus(null), ['unwatched','★ Bez oceny · MAL']);
assert.equal(posterStatus(undefined)[0], 'unknown', 'Missing/unverified data must not turn pink');
assert.equal(posterStatus({status:'plan_to_watch'})[0], 'unwatched');
assert.equal(posterStatus({status:'dropped'})[0], 'unwatched');
assert.equal(posterStatus({status:'watching'})[0], 'started');
assert.equal(posterStatus({status:'on_hold'})[0], 'started');
assert.equal(posterStatus({status:'completed',score:9})[0], 'watched');
assert.equal(statusState({status:'unrecognized'}), 'unknown');

// 2. Exact production async request sequence: non-anime never reaches MAL.
const readSource = part('  function startDetailRead(', '  function mountDetails(');
const buildReader = new Function('readJson', 'updateSession','compact','valid',
  'connectionStatus','loadCache','rememberBinding','request','storeVisible',
  'ensureIndexFromSelectedAnime','cacheTime', `${readSource}\nreturn startDetailRead;`);
const id='a'.repeat(32), parent='b'.repeat(32), uid='c'.repeat(32);
async function checkReader(type, anime, entry, overlaysError=false) {
  const calls=[], statuses=[];
  const start = buildReader(async url => {
    calls.push(url);
    if (url.startsWith('/Users/')) return {Type: type, SeriesId: parent};
    if (url.includes('/api/overlays?')) {
      if (overlaysError) throw new Error('Unavailable overlays');
      return [{id, anime}];
    }
    if (url.includes('/api/mal/resolve?')) return {anime:true,malId:12345};
    throw new Error('Unexpected GET: '+url);
  }, (s, phase, message, extra) => {
    s.phase=phase; s.message=message; if (extra)Object.assign(s, extra);
    statuses.push({phase, verified: s.animeVerified});
  }, x=>String(x||'').replace(/-/g,'').toLowerCase(),
  x=>/^[a-f0-9]{32}$/.test(x),
  async()=>({connected:true}),()=>null,()=>{},
  async endpoint=>{calls.push(endpoint);return {connected:true,entry};},
  ()=>{},()=>{},60*60*1000);
  const session={id,userId:uid,phase:'idle',animeVerified:false};
  await start(session);
  return {session,calls,statuses};
}
(async()=>{
  for (const type of ['Movie','Series','Season']) {
    const {session,calls,statuses} = await checkReader(type,false,null);
    assert.equal(session.phase,'irrelevant',`Non-anime ${type} must be irrelevant`);
    assert.equal(session.animeVerified,false);
    assert(calls.some(url=>url.includes('/api/overlays?ids=')));
    assert(!calls.some(url=>url.includes('/api/mal/resolve?')));
    assert(!calls.some(url=>url.startsWith('/item?')));
    assert(statuses.every(s=>!s.verified));
  }
  const unlisted = await checkReader('Season',true,null);
  assert.equal(unlisted.session.phase,'ready');
  assert.equal(unlisted.session.animeVerified,true);
  assert.equal(unlisted.session.entry,null);
  assert(unlisted.calls.some(s=>s.includes('/api/mal/resolve?catalogId='+parent+'&seasonId='+id)),
    'Season MAL resolve must keep the parent SeriesId and season id');
  const watched = await checkReader('Series',true,{status:'completed',score:7});
  assert.equal(watched.session.phase,'ready');
  assert.equal(posterStatus(watched.session.entry)[0],'watched');
  const missing = await checkReader('Movie',true,null,true);
  assert.equal(missing.session.phase,'error');
  assert.equal(missing.session.animeVerified,false);
  assert(!missing.calls.some(s=>s.includes('/api/mal/resolve?')));

  // 3. The real painter must never reveal the panel before anime classification.
  const paintSource=part('  function paintSession(', '  function updateSession(');
  const panel = {isConnected:true, hidden:false,
    querySelector: () => ({replaceChildren(){}, append(){}})};
  const paint = new Function('currentDetailKey','detailId','currentUser','detailPanel',
    'detailGeneration','renderEntry','el','startDetailRead',`${paintSource}\nreturn paintSession;`)(
    'key',()=>id,uid,panel,1,()=>{},()=>({}),()=>{});
  const common={key:'key',id,userId:uid,phase:'loading',animeVerified:false,message:''};
  paint(common);
  assert.equal(panel.hidden,true, 'Initial MAL panel must be invisible even before first response');
  paint({...common,phase:'error'});
  assert.equal(panel.hidden,true, 'Classification error must not show MAL on normal movies');
  paint({...common,animeVerified:true});
  assert.equal(panel.hidden,false, 'Only positively identified anime may show MAL panel');
  paint({...common,animeVerified:true,phase:'irrelevant'});
  assert.equal(panel.hidden,true, 'Non-anime must remain hidden');
  assert(source.includes("panel.hidden=true; // No loading flash"), 'Mounted panel must start hidden');
  console.log('PASS 0.4.43: confirmed non-anime hidden, verified MAL null=pink, green/gold unchanged, SeasonId correct');
})().catch(e=>{console.error(e);process.exitCode=1;});
