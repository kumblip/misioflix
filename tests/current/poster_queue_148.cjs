'use strict';
// 149 replaces the retired 148 queue test in-place so ZIP overlays need no file deletion.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
for(const name of ['POSTER_MAX_ACTIVE','POSTER_HEIGHTS','posterWaiting','posterActive','posterSizedUrl','queuePoster','prunePosterQueue','drainPosterQueue']) assert(!src.includes(name),`retired poster queue symbol: ${name}`);
const start=src.indexOf('  function imageFor('),end=src.indexOf('  function ensureHomeCollectionPreviewObserver(){',start);
assert(start>=0&&end>start);
const ctx={compactId:id=>id.replace(/-/g,''),validId:id=>typeof id==='string'&&id.length===32};
vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
const id='a'.repeat(32);
assert.equal(ctx.imageFor({id,hasPrimary:true}),`/Items/${id}/Images/Primary?maxHeight=480&quality=84`);
assert(src.includes("img.src='/Items/'+encodeURIComponent(id)+'/Images/Primary?maxHeight=480&quality=82'"));
assert(src.includes('img.src=imgUrl;'));
assert(src.includes("img.src=image;img.loading='lazy'"));
assert(src.includes("img.setAttribute('loading','lazy')"));
console.log('PASS 0.4.149: restored fixed poster URLs and native lazy loading; custom queue absent');
