'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const web=path.resolve(__dirname,'../../src/Jellyfin.Plugin.MisioFlix/Web');
const mal=fs.readFileSync(path.join(web,'mal.js'),'utf8');
const sim=fs.readFileSync(path.join(web,'simkl.js'),'utf8');
const part=(src,a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert(i>=0&&j>i);return src.slice(i,j)};
function element(tag, cls, text){return {tag,className:cls||'',textContent:String(text??''),parentElement:null,isConnected:false,title:'',children:[],replaceChildren(...children){this.children=[];this.append(...children)},append(...children){for(const child of children){child.parentElement=this;child.isConnected=true;this.children.push(child)}},prepend(child){child.parentElement=this;child.isConnected=true;this.children.unshift(child)},remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}this.parentElement=null;this.isConnected=false}}}
function pageState(){
 const year=element('span','','2022');const row=element('div','itemMiscInfo-primary');row.append(year);
 const actions=element('div','mainDetailButtons');actions.append(element('button','','▶'));
 const name=element('div','nameContainer');const info=element('div','infoWrapper');info.append(name,row);
 const lookup={'.mf-detail-mal-badge':null,'.mf-simkl-detail-score':null};
 const page={dataset:{},attributes:{},classList:{add(){}},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},querySelector(q){if(q.includes('.itemMiscInfo-primary'))return row;if(q==='.detailRibbon .infoWrapper')return info;if(q==='.mainDetailButtons')return actions;if(q in lookup)return lookup[q];return null}};
 return {page,row,actions,lookup,year};
}
const statusSource=part(mal,'  const statusState=', '  const statusLabel=');
const ratingSource=part(mal,'  function showDetailMalRating(', '  function showMalSaveToast(');
const showMal=new Function('entryFields','el','malHasActiveResume',`${statusSource}\n${ratingSource}\nreturn showDetailMalRating;`)(e=>e?.my_list_status||e||{},element,()=>false);
{
 const s=pageState();const old=s.page.querySelector.bind(s.page);s.page.querySelector=q=>q==='.mf-detail-mal-badge'?s.lookup[q]:old(q);
 s.row.prepend=function(child){child.parentElement=this;child.isConnected=true;this.children.unshift(child);s.lookup['.mf-detail-mal-badge']=child};
 showMal({closest:()=>s.page},{status:'completed',score:7},{catalogId:'a'.repeat(32),seasonId:null,seasonNumber:null});
 assert.equal(s.row.children[0].className,'mf-detail-mal-badge');assert.equal(s.row.children[1],s.year);
 assert.equal(s.row.children[0].textContent,'★ 7/10 · MAL');assert.equal(s.actions.children.length,1);
 showMal({closest:()=>s.page},{status:'completed',score:9},{catalogId:'a'.repeat(32),seasonId:null,seasonNumber:null});
 assert.equal(s.row.children.length,2,'MAL must not create duplicate badges');
 assert.equal(s.row.children[0].textContent,'★ 9/10 · MAL');
}
const simSource=part(sim,'  function decorateDetailFrame(session){','  function updateAllFrames(){');
const showSim=new Function('pageFor','resumeForUser','resumeSeasons','simklFrame','el','simklPaw',`${simSource}\nreturn decorateDetailFrame;`)(
 ()=>sSim.page,new Set(),new Map(),()=> 'unwatched',element,()=>element('svg','mf-simkl-score-paw'));
const sSim=pageState();const oldSim=sSim.page.querySelector.bind(sSim.page);sSim.page.querySelector=q=>q==='.mf-simkl-detail-score'?sSim.lookup[q]:oldSim(q);
sSim.row.prepend=function(child){child.parentElement=this;child.isConnected=true;this.children.unshift(child);sSim.lookup['.mf-simkl-detail-score']=child};
const session={id:'b'.repeat(32),phase:'ready',catalogId:'a'.repeat(32),seasonId:null,episodeId:null,data:{relevant:true,connected:true,kind:'movies',entry:{score:8}}};
showSim(session);
assert.equal(sSim.row.children[0].className,'mf-simkl-detail-score');assert.equal(sSim.row.children[1],sSim.year);
assert.equal(sSim.row.children[0].children[0].textContent,'8/10');assert.equal(sSim.actions.children.length,1);
session.data.entry.score=9;showSim(session);assert.equal(sSim.row.children.length,2,'Simkl must not create duplicate badges');
assert.equal(sSim.row.children[0].children[0].textContent,'9/10');
const malcss=fs.readFileSync(path.join(web,'mal-frames.css'),'utf8'),simcss=fs.readFileSync(path.join(web,'simkl.css'),'utf8');
assert(malcss.includes('.detailRibbon .mf-detail-mal-badge'));
assert(simcss.includes('.detailRibbon .mf-simkl-detail-score'));
assert(!simcss.includes('.mf-detail-mal-badge'));
console.log('PASS v0.4.64: MAL and Simkl ratings before year, own CSS, no action-button intrusion');
