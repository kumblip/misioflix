'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');
function cut(a,b){const i=source.indexOf(a),j=source.indexOf(b,i+a.length);assert(i>=0&&j>i);return source.slice(i,j)}
const code=cut('  function displaySearchCatalog(state,data,preserveFilters=false){','  function openSearch(kind,initialGenre=');
const fake={items:[{anime:true,type:'Series',title:'A'},{anime:true,type:'Series',title:'B'}],needsRefresh:false};
const ctx={sortCatalog:items=>items,indexAnimeSeasons:()=>{},
 initializeGenres(state){state.genreNames=new Map([['akcja','Akcja']]);state.genreCounts=new Map([['akcja',2]]);state.genreStates=new Map()},
 drawGenreButtons(state){state.rendered=[...state.genreStates]},
 paintSearchResults(state){state.matches=state.pool;state.shown=1},
 appendMoreResults(state){state.shown=Math.min(state.shown+1,state.matches.length)},
 refreshScopedCatalog:async()=>fake,loadScopedCatalog:async()=>fake,
};vm.createContext(ctx);vm.runInContext(code,ctx);
const state={kind:'anime',pool:[{anime:true,type:'Series',title:'Previous'}],genreStates:new Map([['akcja',1],['stary',2]]),genreNames:new Map([['akcja','Akcja'],['stary','Stary gatunek']]),
 shown:2,scroller:{scrollTop:220},overlay:{isConnected:true},requestId:0,
 status:{textContent:''},refresh:{disabled:false}};
ctx.activeSearch=state;
(async()=>{
 await ctx.loadSearch(state,true);
 assert.equal(state.genreStates.get('akcja'),1);
 assert.equal(state.genreStates.get('stary'),2,'deleted genre is still excluded until user clears it');
 assert.equal(state.genreCounts.get('stary'),0,'deleted genre is still visible as zero');
 assert.equal(state.scroller.scrollTop,220);
 assert.equal(state.shown,2);
 assert.equal(state.refresh.disabled,false);
 console.log('PASS v0.4.105 manual refresh preserves genre AND/NOT, removed genre, scroll, visible results');
})().catch(e=>{console.error(e);process.exitCode=1});
