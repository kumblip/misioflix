/* MisioFlix 0.4.14: ONLY custom shelves INSIDE Jellyfin's native home view.
 * No second site, no page/router replacement, no bulk catalog loading.
 * Requires the user to set native home slots to "Brak" in Jellyfin preferences.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_HOME_0414__) return;
  window.__MISIOFLIX_HOME_0414__ = true;

  const API = '/MisioFlix/api';
  const SHELF_LIMIT = 12;
  let homeRoot = null;
  let homeHost = null;
  let owner = '';
  let epoch = 0;
  let mounting = false;
  let resumeData = {items: [], hidden: []};
  let librariesCache = [];
  let discoveryRefs = null;
  let catalogCachePromise = null;
  const rows = new Map();
  const own = (t, cls, value) => {
    const e = document.createElement(t);
    if (cls) e.className = cls;
    if (value !== undefined) e.textContent = String(value);
    return e;
  };
  const set = (node, attr, val) => { node.setAttribute(attr, String(val)); return node; };
  const append = (node, ...children) => { for (const child of children) node.appendChild(child); return node; };
  const validId = value => /^[0-9a-f]{32}$/i.test(String(value || '').replace(/-/g, ''));
  const compactId = value => String(value || '').replace(/-/g, '').toLowerCase();
  const currentToken = () => {
    const api = window.ApiClient || window.ConnectionManager?.getApiClient?.();
    const token = api ? (typeof api.accessToken === 'function' ? api.accessToken() : api.accessToken) : '';
    return typeof token === 'string' ? token : '';
  };
  const homeRoute = () => /^#\/(?:home)?(?:\?|$)/i.test(window.location.hash || '#/');
  const isCurrent = serial => homeRoot?.isConnected && epoch === serial && homeRoute() && currentToken() === owner;
  const authHeader = () => ({Authorization: `MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-home", Version="0.4.14", Token="${owner.replace(/["\r\n]/g, '')}"`});
  async function request(path, method='GET', payload) {
    const control = new AbortController();
    const timeout = window.setTimeout(() => control.abort(), 18000);
    try {
      const result = await fetch(API + path, {
        method, cache:'no-store', signal:control.signal,
        headers: {...authHeader(), ...(payload ? {'Content-Type':'application/json'} : {})},
        ...(payload ? {body:JSON.stringify(payload)} : {})
      });
      if (!result.ok) throw new Error(`HTTP ${result.status}`);
      return await result.json();
    } finally { window.clearTimeout(timeout); }
  }
  function paw(color) {
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('aria-hidden','true');
    svg.classList.add('mf-home-paw');
    svg.style.color=color;
    for(const [cx,cy] of [[5,8.7],[9.5,5.8],[14.5,5.8],[19,8.7]]){
      const node=document.createElementNS(ns,'ellipse');
      for(const [k,v] of [['cx',cx],['cy',cy],['rx',1.9],['ry',2.55],['fill','currentColor']])node.setAttribute(k,String(v));
      svg.appendChild(node);
    }
    const foot=document.createElementNS(ns,'path');
    foot.setAttribute('d','M12.2 10.6c-2.2 0-3.5 1.9-5.2 4-.9 1.1-1.8 2.3-1.8 3.6 0 1.6 1.3 2.7 2.8 2.7 1.4 0 2.5-.9 4-.9s2.6.9 4 .9c1.5 0 2.8-1.1 2.8-2.7 0-1.3-.9-2.5-1.8-3.6-1.7-2.1-3-4.8-4Z');
    foot.setAttribute('fill','currentColor');svg.appendChild(foot);
    return svg;
  }
  const short = (v, rating=false) => {
    if (v === undefined || v === null || v === '') return '';
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return '';
    return rating ? n.toFixed(1) : n > 99 ? '99+' : String(Math.floor(n));
  };
  function nativeDetails(id, serverId){
    // Preserve the same URL shape as Jellyfin's own details links, including serverId.
    if(!validId(id))return '#/home';
    let server=String(serverId||'');
    if(!validId(server)){
      const client=window.ApiClient||window.ConnectionManager?.getApiClient?.();
      const candidate=typeof client?.serverId==='function'?client.serverId():client?.serverId;
      server=String(candidate||'');
    }
    if(!validId(server)){
      const sample=document.querySelector('a[href*="/details?id="][href*="serverId="]');
      const match=sample?.getAttribute('href')?.match(/[?&]serverId=([0-9a-f-]{32,36})/i);
      server=match?.[1]||'';
    }
    return '#/details?id='+encodeURIComponent(compactId(id))+
      (validId(server)?'&serverId='+encodeURIComponent(compactId(server)):'');
  }
  function imageFor(item){
    return validId(item?.id) && item?.hasPrimary
      ? `/Items/${compactId(item.id)}/Images/Primary?maxHeight=480&quality=84`
      : '';
  }
  function badge(parent, content, cls){
    const b=own('span',cls,content);
    parent.appendChild(b);
    return b;
  }
  function makePoster(item){
    const link=set(own('a','mf-home-poster'), 'href', nativeDetails(item.id,item.serverId));
    link.setAttribute('aria-label',`Szczegóły: ${item.title || 'Pozycja'}`);
    const imgUrl=imageFor(item);
    if(imgUrl){
      const img=own('img','mf-home-cover');
      img.setAttribute('alt','');
      img.setAttribute('loading','lazy');
      img.setAttribute('decoding','async');
      img.src=imgUrl;
      img.addEventListener('error',()=>{img.remove(); link.classList.add('mf-home-no-cover');},{once:true});
      link.appendChild(img);
    }else link.classList.add('mf-home-no-cover');
    const left=own('div','mf-home-top-left');
    badge(left,item.anime?'ANIME':item.type==='Movie'?'FILM':'SERIAL','mf-home-kind');
    if(item.year)badge(left,String(item.year).slice(0,14),'mf-home-year');
    link.appendChild(left);
    const count=own('div','mf-home-stats');
    const addStat=(v,label,color,rating=false)=>{
      const val=short(v,rating);
      if(!val)return;
      const stat=own('div','mf-home-stat');
      stat.setAttribute('title',label);
      append(stat,own('span','',val),paw(color));
      count.appendChild(stat);
    };
    if(item.type!=='Movie'){
      addStat(item.seasons,'Sezony','#f7b449');
      addStat(item.episodes,'Odcinki','#6bd1f6');
    }
    addStat(item.userRating,'Moja ocena','#f49fce',true);
    if(count.childElementCount)link.appendChild(count);
    const chips=own('div','mf-home-genres');
    (Array.isArray(item.genres) ? item.genres.slice(0,3) : []).forEach(v=>{if(v)badge(chips,v,'mf-home-genre');});
    if(chips.childElementCount)link.appendChild(chips);
    const state=['unwatched','started','watched'].includes(item.watchStatus)?item.watchStatus:'unwatched';
    link.setAttribute('data-mf-watch',state);
    return link;
  }
  function makeCard(item){
    const card=own('article','mf-home-card');
    append(card,makePoster(item));
    const content=own('div','mf-home-card-body');
    const title=set(own('a','mf-home-card-title',item.title||'Brak tytułu'), 'href',nativeDetails(item.id,item.serverId));
    const description=own('p','mf-home-card-desc',item.description||'');
    append(content,title,description);
    append(card,content);
    return card;
  }
  // Pointer-driven mouse / stylus drag, with native touch swiping preserved.
  // A real click still follows the ORIGINAL Jellyfin detail link.
  function enableShelfDrag(scroll, row) {
    const threshold = 7;
    let gesture = null;
    let suppressClickUntil = 0;
    scroll.addEventListener('dragstart', event => {
      // Prevent browser-native link/image ghost dragging, not navigation.
      if (event.target.closest?.('a, img')) event.preventDefault();
    });
    scroll.addEventListener('pointerdown', event => {
      if (event.button !== 0 || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
      if (event.target.closest?.('button, input, textarea, select, [contenteditable="true"]')) return;
      gesture = {id:event.pointerId, startX:event.clientX, startY:event.clientY,
        scrollStart:scroll.scrollLeft, moved:false};
    });
    scroll.addEventListener('pointermove', event => {
      const g=gesture;
      if (!g || event.pointerId !== g.id) return;
      const dx=event.clientX-g.startX;
      const dy=event.clientY-g.startY;
      if (!g.moved) {
        if (Math.abs(dx) < threshold) return;
        if (Math.abs(dx) <= Math.abs(dy)) {gesture=null;return;}
        g.moved=true;
        scroll.classList.add('mf-home-dragging');
        try {scroll.setPointerCapture(event.pointerId);} catch (_) {}
      }
      if (event.cancelable) event.preventDefault();
      scroll.scrollLeft = g.scrollStart - dx;
    }, {passive:false});
    function endDrag(event) {
      const g=gesture;
      if (!g || event.pointerId !== g.id) return;
      gesture=null;
      scroll.classList.remove('mf-home-dragging');
      if (scroll.hasPointerCapture?.(event.pointerId)) {
        try {scroll.releasePointerCapture(event.pointerId);} catch (_) {}
      }
      if (g.moved) suppressClickUntil=performance.now()+300;
    }
    scroll.addEventListener('pointerup',endDrag);
    scroll.addEventListener('pointercancel',endDrag);
    scroll.addEventListener('lostpointercapture',event => {
      if (gesture?.id===event.pointerId) endDrag(event);
    });
    scroll.addEventListener('click',event=>{
      // Drag must never open an anime/movie, or trigger its action buttons.
      if (performance.now() < suppressClickUntil) {
        suppressClickUntil=0;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },true);
    // A swipe or a mouse drag reaching the end should load the next page.
    let scheduled=false;
    scroll.addEventListener('scroll',()=>{
      if (scheduled) return;
      scheduled=true;
      requestAnimationFrame(()=>{
        scheduled=false;
        if (!row.busy && row.hasMore && row.mode==='latest' &&
            scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth-360) {
          void loadShelf(row,'latest',false);
        }
      });
    },{passive:true});
  }
  function shelfShell(lib){
    const section=own('section','mf-home-shelf');
    section.setAttribute('data-mf-library', lib.id);
    const top=own('div','mf-home-shelf-heading');
    const head=append(own('h2',''),set(own('a','',lib.name),'href',lib.href));
    const tools=own('div','mf-home-actions');
    const shuffle=own('button','mf-home-button mf-home-shuffle','Losuj ↻');
    shuffle.type='button';
    const reset=own('button','mf-home-button mf-home-latest','Ostatnio dodane');
    reset.type='button';reset.hidden=true;
    const prev=own('button','mf-home-nav','‹');prev.type='button';prev.setAttribute('aria-label',`Przewiń ${lib.name} w lewo`);
    const next=own('button','mf-home-nav','›');next.type='button';next.setAttribute('aria-label',`Przewiń ${lib.name} w prawo`);
    append(tools,shuffle,reset,prev,next);
    append(top,head,tools);
    const scroll=own('div','mf-home-shelf-scroll');
    scroll.setAttribute('aria-label',lib.name);
    const message=own('p','mf-home-empty','Ładowanie pozycji…');
    scroll.appendChild(message);
    append(section,top,scroll);
    const row={lib,section,scroll,shuffle,reset,prev,next,mode:'latest',offset:0,hasMore:false,busy:false};
    enableShelfDrag(scroll,row);
    shuffle.addEventListener('click',()=>loadShelf(row,'random',true));
    reset.addEventListener('click',()=>loadShelf(row,'latest',true));
    prev.addEventListener('click',()=>scroll.scrollBy({left:-Math.max(400,scroll.clientWidth*0.75),behavior:'smooth'}));
    next.addEventListener('click',async()=>{
      const nearEnd=scroll.scrollLeft+scroll.clientWidth>=scroll.scrollWidth-220;
      if(nearEnd&&row.hasMore&&!row.busy&&row.mode==='latest')await loadShelf(row,'latest',false);
      scroll.scrollBy({left:Math.max(420,scroll.clientWidth*.77),behavior:'smooth'});
    });
    return row;
  }
  async function loadShelf(row,mode,reset){
    if(row.busy || !homeRoot?.isConnected)return;
    const serial=epoch;
    row.busy=true;
    const start=reset?0:row.offset;
    if(reset){
      row.scroll.replaceChildren(own('p','mf-home-empty','Ładowanie…'));
      row.scroll.scrollLeft=0;
    }
    row.shuffle.disabled=true;
    row.reset.disabled=true;
    try{
      const data=await request(`/home/shelf?libraryId=${encodeURIComponent(row.lib.id)}`+
        `&mode=${mode}&startIndex=${start}&limit=${SHELF_LIMIT}`);
      if(!isCurrent(serial)||!row.section.isConnected)return;
      if(reset)row.scroll.replaceChildren();
      const list=Array.isArray(data.items)?data.items:[];
      list.forEach(item=>row.scroll.appendChild(makeCard(item)));
      row.offset=start+list.length;
      row.hasMore=Boolean(data.hasMore)&&list.length>0;
      row.mode=mode;
      row.reset.hidden=mode==='latest';
      row.shuffle.hidden=mode==='random';
      if(!row.scroll.childElementCount)row.scroll.appendChild(own('p','mf-home-empty','Brak pozycji w tej bibliotece.'));
    }catch(e){
      if(!isCurrent(serial))return;
      const msg=own('p','mf-home-empty','Nie udało się pobrać biblioteki. ');
      const again=own('button','mf-home-button','Spróbuj ponownie');
      again.type='button';again.addEventListener('click',()=>loadShelf(row,mode,reset));
      msg.appendChild(again);
      if(reset)row.scroll.replaceChildren(msg);
      else row.scroll.appendChild(msg);
    }finally{
      row.busy=false;row.shuffle.disabled=false;row.reset.disabled=false;
    }
  }
  function resumeTile(entry,hidden=false){
    const item=entry.item;
    const card=own('article','mf-home-resume-card');
    const link=set(own('a','mf-home-resume-poster'), 'href',nativeDetails(entry.resumeId,item.serverId));
    link.setAttribute('aria-label','Przejdź do odtwarzania: '+(item.title||''));
    const image=imageFor(item);
    if(image){const img=own('img','');img.src=image;img.loading='lazy';img.alt='';link.appendChild(img);}
    const body=own('div','mf-home-resume-content');
    append(body,set(own('a','mf-home-resume-title',item.title||''),'href',nativeDetails(entry.resumeId,item.serverId)));
    const label=entry.season && entry.episode?`S${entry.season}:E${entry.episode}`:entry.nextUp?'Następny odcinek':'Film';
    body.appendChild(own('div','mf-home-resume-subtitle',label));
    if(Number(entry.progress)>0){
      const p=own('div','mf-home-progress');
      const bar=own('div','mf-home-progress-bar');
      bar.style.width=`${Math.max(0,Math.min(100,Number(entry.progress)))}%`;
      p.appendChild(bar);body.appendChild(p);
    }
    const x=own('button','mf-home-resume-remove',hidden?'Przywróć':'×');
    x.type='button';x.setAttribute('aria-label',hidden?'Przywróć z ukrytych':'Ukryj z Oglądaj dalej');
    x.addEventListener('click',async()=>{
      x.disabled=true;
      try{
        await request(`/resume/${hidden?'restore':'hide'}`,'POST',{CatalogId:item.id});
        const from=hidden?resumeData.hidden:resumeData.items;
        const to=hidden?resumeData.items:resumeData.hidden;
        const index=from.findIndex(i=>i.item?.id===item.id);
        if(index>=0)to.push(...from.splice(index,1));
        paintResume();
      }catch(e){x.disabled=false;x.setAttribute('title','Nie udało się zapisać zmiany');}
    });
    append(card,link,body,x);
    return card;
  }
  function paintResume(){
    const area=homeRoot?.querySelector('.mf-home-resume-items');
    const controls=homeRoot?.querySelector('.mf-home-hidden-toggle');
    const hiddenArea=homeRoot?.querySelector('.mf-home-resume-hidden');
    if(!area||!controls||!hiddenArea)return;
    area.replaceChildren();
    if(!resumeData.items.length)area.appendChild(own('p','mf-home-empty','Nie masz rozpoczętych pozycji.'));
    else resumeData.items.forEach(v=>area.appendChild(resumeTile(v)));
    controls.textContent=`Ukryte (${resumeData.hidden.length})`;
    controls.hidden=!resumeData.hidden.length;
    hiddenArea.replaceChildren();
    resumeData.hidden.forEach(v=>hiddenArea.appendChild(resumeTile(v,true)));
  }
  async function loadResume(serial){
    try{
      const data=await request('/home/resume');
      if(!isCurrent(serial))return;
      resumeData={items:Array.isArray(data.items)?data.items:[],hidden:Array.isArray(data.hidden)?data.hidden:[]};
      paintResume();
    }catch(e){
      if(!isCurrent(serial))return;
      homeRoot.querySelector('.mf-home-resume-items')?.replaceChildren(own('p','mf-home-empty','Nie udało się załadować oglądanych pozycji.'));
    }
  }
  function normalized(value){
    return String(value || '')
      .toLocaleLowerCase('pl')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .trim();
  }
  function optionNode(value,label){
    const node=own('option','',label);
    node.value=value;
    return node;
  }
  function fillSelect(select, values, allLabel){
    const current=select.value;
    select.replaceChildren(optionNode('', allLabel));
    (Array.isArray(values)?values:[]).forEach(v=>{ if(v) select.appendChild(optionNode(v, v)); });
    if(current && [...select.options].some(o=>o.value===current)) select.value=current;
  }
  function normalizeType(value){
    const kind=String(value||'').toLowerCase();
    if(kind==='movie' || kind==='film') return 'movie';
    if(kind==='series' || kind==='serial') return 'series';
    return 'all';
  }
  function matchType(item, filter){
    const wanted=normalizeType(filter);
    if(wanted==='all') return true;
    return wanted==='movie' ? item.type==='Movie' : item.type==='Series';
  }
  function sortCatalog(items){
    return [...items].sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'pl',{sensitivity:'base'}));
  }
  function toHomeCardItem(item){
    return {
      id:item.id,
      serverId:item.serverId || '',
      type:item.type || 'Series',
      anime:Boolean(item.anime),
      title:item.title || 'Brak tytułu',
      year:item.year || '',
      format:item.kind || item.format || '',
      description:item.plot || item.description || '',
      genres:Array.isArray(item.genres)?item.genres:[],
      hasPrimary:Boolean(item.hasPrimary ?? item.has_image),
      seasons:item.seasons ?? item.season_count ?? null,
      episodes:item.episodes ?? item.episode_count ?? null,
      userRating:item.userRating ?? item.rating ?? null,
      watchStatus:item.watchStatus || item.watch_status || 'unwatched'
    };
  }
  async function getCatalogForSearch(){
    if(!catalogCachePromise){
      catalogCachePromise=request('/catalog').then(data=>({
        items:Array.isArray(data?.items)?data.items:[],
        genres:{
          anime:Array.isArray(data?.genres?.anime)?data.genres.anime:[],
          media:Array.isArray(data?.genres?.media)?data.genres.media:[]
        }
      })).catch(error=>{ catalogCachePromise=null; throw error; });
    }
    return await catalogCachePromise;
  }
  function searchPanel(kind){
    const panel=own('section','mf-home-search-panel');
    panel.setAttribute('data-mf-search-kind',kind);
    const heading=own('h3','',kind==='anime'?'Wyszukiwarka anime':'Wyszukiwarka filmów i seriali');
    const helper=own('p','mf-home-search-helper',kind==='anime'
      ? 'Szukaj po tytule, opisie i gatunku z NFO anime.'
      : 'Szukaj po bibliotekach nie-anime, z gatunkami pobranymi przez Jellyfin.');
    const form=own('form','mf-home-search-form');
    const query=own('input','mf-home-search-input');
    query.type='search';
    query.placeholder=kind==='anime'?'Tytuł anime, opis lub gatunek':'Film, serial, opis lub gatunek';
    query.autocomplete='off';
    const genre=own('select','mf-home-search-select');
    genre.appendChild(optionNode('', 'Wszystkie gatunki'));
    const type=own('select','mf-home-search-select');
    type.append(optionNode('', 'Wszystko'), optionNode('series', 'Seriale'), optionNode('movie', 'Filmy'));
    const submit=own('button','mf-home-button mf-home-search-submit','Szukaj');
    submit.type='submit';
    const clear=own('button','mf-home-button mf-home-search-clear','Wyczyść');
    clear.type='button';
    append(form,query,genre,type,submit,clear);
    const status=own('p','mf-home-search-status','');
    const results=own('div','mf-home-search-results');
    results.hidden=true;
    const resultsHead=own('div','mf-home-search-results-head');
    const resultsTitle=own('h4','',kind==='anime'?'Wyniki anime':'Wyniki filmów i seriali');
    const resultsMeta=own('span','mf-home-search-results-meta','');
    append(resultsHead,resultsTitle,resultsMeta);
    const grid=own('div','mf-home-search-grid');
    const more=own('button','mf-home-button mf-home-search-more','Pokaż więcej');
    more.type='button';
    more.hidden=true;
    append(results,resultsHead,grid,more);
    append(panel,heading,helper,form,status,results);
    const state={kind, panel, form, query, genre, type, submit, clear, status, results, resultsTitle, resultsMeta, grid, more, matches:[], shown:0};
    clear.addEventListener('click',()=>{
      query.value=''; genre.value=''; type.value=''; state.matches=[]; state.shown=0;
      status.textContent=''; results.hidden=true; grid.replaceChildren(); more.hidden=true;
    });
    more.addEventListener('click',()=>paintSearchResults(state,false));
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      await runSearch(state);
    });
    return state;
  }
  function discoverySection(){
    const section=own('section','mf-home-discovery');
    const folders=own('div','mf-home-folder-bar');
    append(folders,own('h2','','Przejdź do bibliotek'));
    const folderButtons=own('div','mf-home-folder-buttons');
    folderButtons.appendChild(own('p','mf-home-search-helper','Ładowanie skrótów do bibliotek…'));
    folders.appendChild(folderButtons);
    const searchWrap=own('div','mf-home-search-panels');
    const anime=searchPanel('anime');
    const media=searchPanel('media');
    append(searchWrap,anime.panel,media.panel);
    append(section,folders,searchWrap);
    return {section, folderButtons, anime, media};
  }
  function paintFolderButtons(){
    const box=discoveryRefs?.folderButtons;
    if(!box) return;
    box.replaceChildren();
    if(!librariesCache.length){
      box.appendChild(own('p','mf-home-search-helper','Brak dostępnych bibliotek.'));
      return;
    }
    for(const lib of librariesCache){
      const link=set(own('a','mf-home-folder-button',lib.name),'href',lib.href);
      link.setAttribute('aria-label',`Otwórz bibliotekę ${lib.name}`);
      box.appendChild(link);
    }
  }
  async function runSearch(state){
    state.submit.disabled=true;
    state.status.textContent='Ładowanie katalogu…';
    try{
      const data=await getCatalogForSearch();
      const pool=(data.items||[]).filter(item=>state.kind==='anime'?item.anime:!item.anime);
      const q=normalized(state.query.value);
      const genre=state.genre.value;
      const type=state.type.value;
      const matches=sortCatalog(pool.filter(item=>{
        if(genre && !(Array.isArray(item.genres)&&item.genres.includes(genre))) return false;
        if(type && !matchType(item, type)) return false;
        if(!q) return true;
        const hay=normalized([item.title,item.plot,item.description,(Array.isArray(item.genres)?item.genres.join(' '):'')].join(' '));
        return hay.includes(q);
      }));
      state.matches=matches;
      state.shown=0;
      paintSearchResults(state,true);
      state.status.textContent=`Znaleziono ${matches.length} pozycji.`;
    }catch(e){
      state.status.textContent='Nie udało się pobrać katalogu do wyszukiwania.';
      state.results.hidden=true;
    }finally{
      state.submit.disabled=false;
    }
  }
  function paintSearchResults(state, reset){
    if(reset){
      state.grid.replaceChildren();
      state.results.hidden=false;
      state.shown=0;
    }
    const batch=24;
    const next=state.matches.slice(state.shown, state.shown+batch);
    next.forEach(item=>state.grid.appendChild(makeCard(toHomeCardItem(item))));
    state.shown += next.length;
    state.resultsTitle.textContent=state.kind==='anime'?'Wyniki anime':'Wyniki filmów i seriali';
    state.resultsMeta.textContent = state.matches.length
      ? `Pokazane ${state.shown} z ${state.matches.length}`
      : 'Brak wyników';
    if(!state.matches.length){
      state.grid.replaceChildren(own('p','mf-home-empty','Brak wyników dla podanych filtrów.'));
    }
    state.more.hidden = state.shown >= state.matches.length || !state.matches.length;
  }
  async function primeSearchGenres(){
    if(!discoveryRefs) return;
    try{
      const data=await getCatalogForSearch();
      fillSelect(discoveryRefs.anime.genre, data.genres?.anime || [], 'Wszystkie gatunki');
      fillSelect(discoveryRefs.media.genre, data.genres?.media || [], 'Wszystkie gatunki');
      discoveryRefs.anime.status.textContent='';
      discoveryRefs.media.status.textContent='';
    }catch(e){
      discoveryRefs.anime.status.textContent='Nie udało się załadować listy gatunków.';
      discoveryRefs.media.status.textContent='Nie udało się załadować listy gatunków.';
    }
  }
  function hero(){
    const hero=own('section','mf-home-hero');
    const intro=own('div','mf-home-intro');
    const logo=own('img','mf-home-logo');logo.src='/MisioFlix/assets/logo.png';logo.alt='MisioFlix';
    const title=own('h1','', 'Twój świat filmów i anime');
    const sub=own('p','','Własna biblioteka. Oryginalny odtwarzacz Jellyfin.');
    append(intro,logo,title,sub);
    const watch=own('div','mf-home-resume');
    const header=own('div','mf-home-resume-head');
    header.appendChild(own('h2','','Oglądaj dalej'));
    const toggle=own('button','mf-home-button mf-home-hidden-toggle','Ukryte');
    toggle.type='button';toggle.hidden=true;
    toggle.addEventListener('click',()=>{
      const hidden=watch.querySelector('.mf-home-resume-hidden');
      hidden.hidden=!hidden.hidden;
      toggle.setAttribute('aria-expanded',String(!hidden.hidden));
    });
    header.appendChild(toggle);
    const row=own('div','mf-home-resume-items');row.appendChild(own('p','mf-home-empty','Ładowanie oglądanych…'));
    const hiddenArea=own('div','mf-home-resume-hidden');hiddenArea.hidden=true;
    append(watch,header,row,hiddenArea);
    append(hero,intro,watch);
    return hero;
  }
  async function loadLibraries(serial){
    const container=homeRoot?.querySelector('.mf-home-rows');
    if(!container)return;
    try{
      const libs=await request('/home/libraries');
      if(!isCurrent(serial))return;
      container.replaceChildren();rows.clear();
      librariesCache = Array.isArray(libs) ? libs : [];
      paintFolderButtons();
      if(!Array.isArray(libs)||!libs.length){container.appendChild(own('p','mf-home-empty','Nie znaleziono dostępnych bibliotek.'));return;}
      // Keep the order supplied by Jellyfin, but do not include Collections in this release.
      for(const lib of libs){
        if(!validId(lib.id)||!['anime','movies','series'].includes(lib.category))continue;
        const row=shelfShell(lib);
        rows.set(lib.id,row);
        container.appendChild(row.section);
      }
      if(!rows.size){container.appendChild(own('p','mf-home-empty','Brak bibliotek dla karuzel.'));return;}
      if(typeof IntersectionObserver==='function'){
        const observer=new IntersectionObserver(entries=>{
          for(const entry of entries){
            if(!entry.isIntersecting)continue;
            observer.unobserve(entry.target);
            const row=rows.get(entry.target.getAttribute('data-mf-library'));
            if(row)void loadShelf(row,'latest',true);
          }
        },{rootMargin:'600px 0px'});
        for(const row of rows.values())observer.observe(row.section);
      }else for(const row of rows.values())void loadShelf(row,'latest',true);
    }catch(e){
      if(!isCurrent(serial))return;
      container.replaceChildren(own('p','mf-home-empty','Nie udało się pobrać bibliotek. Odśwież stronę lub sprawdź wtyczkę.'));
    }
  }
  function mount(host){
    if(mounting)return;
    mounting=true;
    try{
      epoch++;
      const serial=epoch;
      homeRoot=own('div','mf-home-0412');
      homeRoot.id='mf-home-0412';
      homeHost=host;
      homeRoot.appendChild(hero());
      discoveryRefs = discoverySection();
      homeRoot.appendChild(discoveryRefs.section);
      const rowsArea=own('div','mf-home-rows');
      rowsArea.appendChild(own('p','mf-home-empty','Ładowanie bibliotek…'));
      homeRoot.appendChild(rowsArea);
      host.prepend(homeRoot);
      document.documentElement.classList.add('mf-home-custom-active');
      void loadLibraries(serial);
      void loadResume(serial);
      void primeSearchGenres();
    }finally{mounting=false;}
  }
  function reconcile(){
    const token=currentToken();
    const visible=homeRoute() && Boolean(token);
    const host=visible ? (document.querySelector('#indexPage') || document.querySelector('.homePage') || document.querySelector('main')) : null;
    if(!visible||!host){
      if(homeRoot){homeRoot.remove();homeRoot=null;homeHost=null;discoveryRefs=null;epoch++;rows.clear();}
      document.documentElement.classList.remove('mf-home-custom-active');
      librariesCache=[];catalogCachePromise=null;
      owner=token;
      return;
    }
    if(owner!==token){
      owner=token;epoch++;
      homeRoot?.remove();homeRoot=null;homeHost=null;discoveryRefs=null;rows.clear();resumeData={items:[],hidden:[]};librariesCache=[];catalogCachePromise=null;
    }
    if(homeRoot && homeRoot.isConnected && homeHost===host)return;
    homeRoot?.remove();mount(host);
  }
  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    window.setTimeout(()=>{queued=false;reconcile();},180);
  }
  function start(){
    reconcile();
    window.addEventListener('hashchange',schedule);
    window.addEventListener('pageshow',schedule);
    document.addEventListener('viewshow',schedule);
    const observer=new MutationObserver(mutations=>{
      if(!homeRoute() && !homeRoot)return;
      // Do not rescan due to MisioFlix card insertion or image load.
      if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1 && !n.closest?.('#mf-home-0412'))))schedule();
      if(homeRoot && !homeRoot.isConnected)schedule();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
