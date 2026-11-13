/* MisioFlix 0.4.29: user-scoped home and independent BoxSet collection shelf.
 * No second site, no page/router replacement, no bulk catalog loading.
 * Requires the user to set native home slots to "Brak" in Jellyfin preferences.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_HOME_0424__) return;
  window.__MISIOFLIX_HOME_0424__ = true;

  const API = '/MisioFlix/api';
  const SHELF_LIMIT = 12;
  const RANDOM_LIMIT = 5;
  let homeRoot = null;
  let homeHost = null;
  let owner = '';
  let epoch = 0;
  let mounting = false;
  let resumeData = {items: [], hidden: []};
  let showHiddenResume = false;
  let librariesCache = [];
  let discoveryRefs = null;
  let processedGenreLink = '';
  const catalogCache = new Map();
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
  // The actual Jellyfin 12.4 Favorites header is href="#/home?tab=1".
  // Only tab=0 (or the default home route) may receive our custom shelves.
  function homeRouteFor(hash){
    if(!/^#\/(?:home)?(?:\?|$)/i.test(hash || '#/'))return false;
    try{
      const query=String(hash||'').split('?')[1]||'';
      const tab=new URLSearchParams(query).get('tab');
      return tab===null || tab==='0';
    }catch{return false;}
  }
  const homeRoute = () => homeRouteFor(window.location.hash || '#/');
  // A dedicated, paged collection directory. It is a distinct home subroute,
  // not an anchor to the carousel and not Jellyfin's global grouping option.
  const COLLECTIONS_URL = '#/home?mfCollections=1';
  function collectionsRoute(){
    if(!homeRoute())return false;
    try { return new URLSearchParams((window.location.hash||'').split('?')[1]||'').get('mfCollections')==='1'; }
    catch { return false; }
  }
  let collectionsPage = null;
  let collectionsLoad = {busy:false,loaded:false,offset:0,hasMore:true,requestId:0};
  const isCurrent = serial => homeRoot?.isConnected && epoch === serial && homeRoute() && currentToken() === owner;
  const authHeader = () => ({Authorization: `MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-home", Version="0.4.29", Token="${owner.replace(/["\r\n]/g, '')}"`});
  async function request(path, method='GET', payload, timeoutMs=18000) {
    const control = new AbortController();
    const timeout = window.setTimeout(() => control.abort(), timeoutMs);
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
  // Jellyfin 12.4: Modern /movies and /tv currently fail with React #130 in
  // this user's installation. Native appRouter.getRouteUrl() uses BOTH parentId
  // and serverId for the fallback /list route. v0.4.23 omitted serverId, leaving
  // the list spinning forever. Keep working /mixed (AnimePL) untouched.
  const LIBRARY_ROUTE = /^#\/(?:movies|tv)\?(?:[^#]*&)?topParentId=[0-9a-f-]{32,36}/i;
  function libraryServerId(href=''){
    const api=window.ApiClient||window.ConnectionManager?.getApiClient?.();
    const apiId=typeof api?.serverId==='function'?api.serverId():api?.serverId;
    if(validId(apiId))return compactId(apiId);
    const current=window.ConnectionManager?.getCurrentServer?.();
    if(validId(current?.Id))return compactId(current.Id);
    try{
      const fromLink=new URLSearchParams(String(href).split('?')[1]||'').get('serverId');
      if(validId(fromLink))return compactId(fromLink);
    }catch{}
    const native=document.querySelector('a[href*="serverId="]');
    if(native){
      try{
        const found=new URLSearchParams((native.getAttribute('href')||'').split('?')[1]||'').get('serverId');
        if(validId(found))return compactId(found);
      }catch{}
    }
    return '';
  }
  function libraryListUrl(id, href=''){
    if(!validId(id))return '';
    const server=libraryServerId(href);
    // Fail closed. A /list URL without serverId was the cause of the endless
    // spinner; never replace a working native URL with an incomplete fallback.
    if(!validId(server))return '';
    return '#/list?parentId='+encodeURIComponent(compactId(id))+'&serverId='+encodeURIComponent(server);
  }
  function safeLibraryHref(href,id){
    if(!LIBRARY_ROUTE.test(href||''))return href;
    return libraryListUrl(id,href)||href;
  }
  function interceptLibraryNavigation(event){
    const link=event.target.closest?.('a[href]');
    if(!link)return;
    const href=link.getAttribute('href')||'';
    if(!LIBRARY_ROUTE.test(href))return;
    let id='';
    try{id=new URLSearchParams(href.split('?')[1]).get('topParentId')||'';}catch{}
    const target=libraryListUrl(id,href);
    if(!target)return;
    // Native header shortcuts and our shelf buttons must use the same safe
    // destination. Never rewrite details, plugin pages, or arbitrary routes.
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    if(window.location.hash!==target)window.location.hash=target;
  }
  function normalizeLibraryRoute(){
    const route=window.location.hash||'';
    let id='',target='';
    if(LIBRARY_ROUTE.test(route)){
      try{id=new URLSearchParams(route.split('?')[1]).get('topParentId')||'';}catch{}
      target=libraryListUrl(id,route);
    }else if(/^#\/list\?parentId=[0-9a-f-]{32,36}$/i.test(route)){
      // Repair incomplete v0.4.23 deep links/bookmarks, but no other /list
      // links (genres, folders, people, etc.).
      try{id=new URLSearchParams(route.split('?')[1]).get('parentId')||'';}catch{}
      target=libraryListUrl(id,route);
    }
    if(!target || target===route)return false;
    window.location.replace(window.location.pathname+window.location.search+target);
    return true;
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
    if(item.anime){link.dataset.mfItemId=compactId(item.id);if(Number(item.malId)>0)link.dataset.mfMalId=String(item.malId);}
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
    badge(left,item.type==='BoxSet'?'KOLEKCJA':item.anime?'ANIME':item.type==='Movie'?'FILM':'SERIAL','mf-home-kind');
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
    if(item.type==='BoxSet'){
      const count=short(item.collectionCount);
      if(count)badge(left,count+' filmów','mf-home-collection-count');
    }else{
      if(item.type!=='Movie'){
        addStat(item.seasons,'Sezony','#f7b449');
        addStat(item.episodes,'Odcinki','#6bd1f6');
      }
      if(!item.anime)addStat(item.userRating,'Moja ocena','#f49fce',true);
    }
    if(count.childElementCount)link.appendChild(count);
    const chips=own('div','mf-home-genres');
    (Array.isArray(item.genres) ? item.genres.slice(0,3) : []).forEach(v=>{if(v)badge(chips,v,'mf-home-genre');});
    if(chips.childElementCount)link.appendChild(chips);
    // A collection has no single watched state: don't show a misleading frame.
    if(item.type!=='BoxSet'){
      const state=['unwatched','started','watched'].includes(item.watchStatus)?item.watchStatus:'unwatched';
      link.setAttribute('data-mf-watch',item.anime?'unknown':state);
    }
    return link;
  }
  function makeCard(item){
    const card=own('article','mf-home-card'+(item.type==='BoxSet'?' mf-home-collection-card':''));
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
    const head=append(own('h2',''),set(own('a','',lib.category==='collections'?'Kolekcje':lib.name),'href',lib.category==='collections'?COLLECTIONS_URL:safeLibraryHref(lib.href,lib.id)));
    const tools=own('div','mf-home-actions');
    const shuffle=own('button','mf-home-button mf-home-shuffle','Losuj ↻');
    shuffle.type='button';
    const reset=own('button','mf-home-button mf-home-latest','Ostatnio dodane');
    reset.type='button';reset.classList.add('mf-home-view-active');
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
      const endpoint=row.lib.category==='collections'
        ? '/home/collections?'
        : `/home/shelf?libraryId=${encodeURIComponent(row.lib.id)}&`;
      const data=await request(endpoint+
        `mode=${mode}&startIndex=${start}&limit=${mode==='random'?RANDOM_LIMIT:SHELF_LIMIT}`);
      if(!isCurrent(serial)||!row.section.isConnected)return;
      if(reset)row.scroll.replaceChildren();
      const list=Array.isArray(data.items)?data.items:[];
      list.forEach(item=>row.scroll.appendChild(makeCard(item)));
      row.offset=start+list.length;
      row.hasMore=Boolean(data.hasMore)&&list.length>0;
      row.mode=mode;
      // Both actions stay available: another click on Losuj draws five NEW choices.
      row.reset.classList.toggle('mf-home-view-active',mode==='latest');
      row.shuffle.classList.toggle('mf-home-view-active',mode==='random');
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
  // v0.4.22: playable cards reuse the proven native Jellyfin detail-page
  // Resume/Play button. Never route the playable click to its parent series.
  // The old detail-waiter remains an error fallback only.
  let resumePlaySerial = 0;
  const pause = ms => new Promise(resolve => window.setTimeout(resolve,ms));
  function playingLocally(){
    if([...document.querySelectorAll('video')].some(v=>!v.paused && !v.ended))return true;
    if(/^#\/(?:video|playback|player)(?:\?|\/|$)/i.test(window.location.hash))return true;
    return Boolean(document.querySelector('.videoPlayerContainer:not(.hide) video, .videoOsd:not(.hide) video'));
  }
  function nativePlayControl(){
    // Exclude hidden SPA pages and controls outside the actual details screen.
    const candidates=[...document.querySelectorAll([
      '.itemDetailPage:not(.hide) .btnResume',
      '.itemDetailPage:not(.hide) .btnPlay',
      '.itemDetailPage:not(.hide) [data-action="resume"]',
      '.itemDetailPage:not(.hide) [data-action="play"]',
      '.itemDetailsPage:not(.hide) .btnResume',
      '.itemDetailsPage:not(.hide) .btnPlay',
      '[data-testid="item-details"] [data-testid="resume-button"]',
      '[data-testid="item-details"] [data-testid="play-button"]',
      '#itemDetailPage:not(.hide) .btnResume',
      '#itemDetailPage:not(.hide) .btnPlay',
      '.detailsPage:not(.hide) .btnResume',
      '.detailsPage:not(.hide) .btnPlay',
      '[class*="itemDetails"] button',
      '[class*="ItemDetails"] button',
      '.itemDetailPage:not(.hide) button',
      '.itemDetailsPage:not(.hide) button',
      // React-based Jellyfin details may render accessible play buttons under main.
      'main button[aria-label="Odtwórz"]',
      'main button[aria-label="Wznów"]',
      'main button[aria-label="Play"]',
      'main button[aria-label="Resume"]'
    ].join(','))];
    const eligible=button=>{
      if(!button.isConnected || button.disabled || button.closest('[hidden],[aria-hidden="true"],.hide'))return false;
      if(!button.getClientRects().length)return false;
      const label=(button.getAttribute('aria-label')||button.title||button.textContent||'').trim();
      if(/zwiastun|trailer|losuj|shuffle|odtwórz wszystkie|play all/i.test(label))return false;
      return button.matches('.btnResume,.btnPlay,[data-action="play"],[data-action="resume"],[data-testid="resume-button"],[data-testid="play-button"]') ||
        /^(?:wznów|kontynuuj|odtwórz|odtwarzaj|play|resume|continue)(?:\b|\s|$)/i.test(label);
    };
    return candidates.find(eligible)||null;
  }
  async function playViaItemDetails(entry,serial){
    const targetId=compactId(entry.resumeId);
    const route=nativeDetails(targetId,entry.item.serverId);
    if(route==='#/home')return;
    window.location.hash=route; // exact playable movie/episode, NOT item.id (series)
    const start=Date.now();
    const maxWait=10000;
    while(serial===resumePlaySerial && Date.now()-start<maxWait){
      if(playingLocally())return;
      const hash=window.location.hash;
      if(!/^#\/details(?:\?|$)/i.test(hash))return;
      const actualId=new URLSearchParams(hash.slice(hash.indexOf('?')+1)).get('id');
      if(compactId(actualId)!==targetId)return;
      // Wait for the exact detail page to mount rather than clicking a stale
      // play button left in Jellyfin's cached/hidden SPA views.
      if(Date.now()-start>=200){
        const button=nativePlayControl();
        if(button){
          button.click(); // Jellyfin's genuine player/resume handler
          return;
        }
      }
      await pause(130);
    }
    if(serial===resumePlaySerial){
      console.warn('[MisioFlix] Odtwarzanie nie uruchomiło się; nie znaleziono przycisku odtwarzania w Jellyfin.');
      const warning=own('div','mf-home-play-warning','Nie udało się automatycznie uruchomić filmu. Kliknij Odtwórz na stronie odcinka lub filmu.');
      warning.setAttribute('role','status');document.body.appendChild(warning);
      window.setTimeout(()=>warning.remove(),6000);
    }
  }
  async function tryNativeResume(entry, serial){
    const item=entry.item||{};
    const api=window.ApiClient||window.ConnectionManager?.getApiClient?.();
    const server=validId(item.serverId)?compactId(item.serverId):
      compactId(typeof api?.serverId==='function'?api.serverId():api?.serverId);
    if(!validId(server))return false;
    // shortcuts.onClick is bound by Jellyfin to its ORIGINAL itemsContainer
    // (not document.body or arbitrary MisioFlix elements).
    const scope=[...document.querySelectorAll('#indexPage .itemsContainer, .homeTab .itemsContainer, .itemsContainer')]
      .find(node=>!node.closest('#mf-home-0412') && node.isConnected);
    if(!scope)return false;
    const proxy=own('div','itemAction mf-home-native-resume-proxy');
    proxy.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    const isEpisode=entry.resumeType==='Episode' || entry.season!=null || entry.episode!=null;
    for(const [key,value] of Object.entries({
      'data-id':compactId(entry.resumeId),'data-serverid':server,
      'data-type':isEpisode?'Episode':'Movie','data-mediatype':'Video',
      'data-isfolder':'false','data-positionticks':String(Math.max(0,Number(entry.positionTicks)||0))
    }))proxy.setAttribute(key,value);
    const button=own('button','mf-home-native-resume-action','');
    button.type='button';button.setAttribute('data-action','resume');
    proxy.appendChild(button);scope.appendChild(proxy);
    try{
      await pause(80); // give Jellyfin's delegated listener a stable ancestor
      if(serial!==resumePlaySerial)return false;
      const click=new MouseEvent('click',{bubbles:true,cancelable:true,view:window});
      button.dispatchEvent(click);
      // Shortcut must explicitly consume the event. Do not assume that the
      // click worked merely because the button exists.
      if(!click.defaultPrevented)return false;
      const startedAt=Date.now();
      while(serial===resumePlaySerial && Date.now()-startedAt<2200){
        if(playingLocally())return true;
        await pause(120);
      }
      return playingLocally();
    } catch(error){
      console.warn('[MisioFlix] Direct native resume unavailable',error);
      return false;
    } finally {proxy.remove();}
  }
  async function playResume(entry){
    if(!validId(entry.resumeId))return;
    const serial=++resumePlaySerial;
    // Fast path: try Jellyfin's actual playback shortcut without navigating.
    if(await tryNativeResume(entry,serial))return;
    if(serial!==resumePlaySerial)return;
    // Compatible fallback known to work on the user's Jellyfin build.
    if(typeof window.MisioFlixPlayItem==='function'){
      const started=await window.MisioFlixPlayItem(entry.resumeId);
      if(started || serial!==resumePlaySerial)return;
    }
    if(serial===resumePlaySerial)await playViaItemDetails(entry,serial);
  }
  function resumeTile(entry,hidden=false){
    const item=entry.item;
    const card=own('article',hidden?'mf-home-resume-card mf-home-resume-card-hidden':'mf-home-resume-card');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-label',`Odtwarzaj: ${item.title||''}`);
    const details=nativeDetails(item.id,item.serverId); // series root, or movie root
    const link=own('button','mf-home-resume-poster');link.type='button';
    link.setAttribute('aria-label','Odtwarzaj: '+(item.title||''));
    const image=imageFor(item);
    if(image){const img=own('img','');img.src=image;img.loading='lazy';img.alt='';link.appendChild(img);}
    const body=own('div','mf-home-resume-content');
    append(body,own('span','mf-home-resume-title',item.title||''));
    const label=entry.season!=null&&entry.episode!=null?`S${entry.season}:E${entry.episode}`:entry.nextUp?'Następny odcinek':'Film';
    body.appendChild(own('div','mf-home-resume-subtitle',label));
    if(Number(entry.progress)>0){
      const p=own('div','mf-home-progress');
      const bar=own('div','mf-home-progress-bar');
      bar.style.width=`${Math.max(0,Math.min(100,Number(entry.progress)))}%`;
      p.appendChild(bar);body.appendChild(p);
    }
    const info=set(own('a','mf-home-resume-info','i'),'href',details);
    info.setAttribute('aria-label','Informacje o: '+(item.title||''));
    info.setAttribute('title','Otwórz stronę główną filmu lub serialu');
    const actions=own('div','mf-home-resume-card-actions');
    const toggle=own('button','mf-home-resume-remove',hidden?'Przywróć':'×');
    toggle.type='button';
    toggle.setAttribute('aria-label',hidden?'Przywróć z ukrytych':'Ukryj z Oglądaj dalej (bez usuwania historii Jellyfin)');
    toggle.setAttribute('title',hidden?'Przywróć do Oglądaj dalej':'Ukryj kartę; historia Jellyfin pozostaje bez zmian');
    toggle.addEventListener('click',async()=>{
      toggle.disabled=true;
      try{
        await request(`/resume/${hidden?'restore':'hide'}`,'POST',{CatalogId:item.id});
        const from=hidden?resumeData.hidden:resumeData.items;
        const to=hidden?resumeData.items:resumeData.hidden;
        const index=from.findIndex(i=>i.item?.id===item.id);
        if(index>=0)to.push(...from.splice(index,1));
        paintResume();
      }catch(error){toggle.disabled=false;toggle.setAttribute('title','Nie udało się zapisać zmiany');}
    });
    actions.appendChild(toggle);
    if(hidden){
      const remove=own('button','mf-home-resume-permanent-remove','Usuń');
      remove.type='button';
      remove.setAttribute('title','Usuń z Oglądaj dalej i wyczyść zapisany punkt wznowienia; nie usuwa pliku wideo');
      remove.setAttribute('aria-label',`Usuń ${item.title||'pozycję'} z Oglądaj dalej`);
      remove.addEventListener('click',async()=>{
        if(!window.confirm('Usunąć tę pozycję z Oglądaj dalej? Zapisany punkt wznowienia zostanie wyczyszczony, ale plik wideo i status obejrzenia pozostaną bez zmian.'))return;
        remove.disabled=true;toggle.disabled=true;
        try{
          await request('/resume/remove','POST',{CatalogId:item.id,ResumeId:entry.resumeId});
          resumeData.hidden=resumeData.hidden.filter(i=>i.item?.id!==item.id);
          resumeData.items=resumeData.items.filter(i=>i.item?.id!==item.id);
          paintResume();
        }catch(error){remove.disabled=false;toggle.disabled=false;remove.setAttribute('title','Nie udało się usunąć pozycji');}
      });
      actions.appendChild(remove);
    }
    append(card,link,body,info,actions);
    card.addEventListener('click',event=>{
      if(event.target.closest('.mf-home-resume-info,.mf-home-resume-card-actions'))return;
      event.preventDefault();
      event.stopPropagation();
      void playResume(entry);
    });
    card.addEventListener('keydown',event=>{
      if(event.target!==card)return;
      if(event.key==='Enter'||event.key===' '){event.preventDefault();void playResume(entry);}
    });
    return card;
  }
  function paintResume(){
    const area=homeRoot?.querySelector('.mf-home-resume-items');
    const controls=homeRoot?.querySelector('.mf-home-hidden-toggle');
    if(!area||!controls)return;
    const oldOffset=area.scrollLeft;
    area.replaceChildren();
    if(!resumeData.items.length && !(showHiddenResume && resumeData.hidden.length)){
      area.appendChild(own('p','mf-home-empty','Nie masz rozpoczętych pozycji.'));
    }
    resumeData.items.forEach(v=>area.appendChild(resumeTile(v)));
    // Hidden titles belong to THIS same full-width carousel when requested.
    if(showHiddenResume)resumeData.hidden.forEach(v=>area.appendChild(resumeTile(v,true)));
    controls.textContent=`${showHiddenResume?'Ukryj ukryte':'Pokaż ukryte'} (${resumeData.hidden.length})`;
    controls.disabled=resumeData.hidden.length===0;
    controls.setAttribute('aria-expanded',String(showHiddenResume));
    controls.setAttribute('aria-pressed',String(showHiddenResume));
    area.scrollLeft=oldOffset;
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
  // Search stays outside the homepage flow. Open on demand, in a modal INSIDE
  // the original Jellyfin Web document, without a second router or page shell.
  const ANIME_GENRES = Object.freeze([
    'Akcja','Cyberpunk','Dramat','Ecchi','Eksperymentalne','Fantasy','Harem',
    'Hentai','Historyczne','Horror','Komedia','Kryminalne','Magia',
    'Magiczne dziewczynki','Mecha','Męski','Muzyczne','Nadprzyrodzone',
    'Obłęd','Slice of Life','Parodia','Przygodowe','Psychologiczne','Romans',
    'Sci-Fi','Sportowe','Steampunk','Szkoła','Thriller','Military','Yaoi',
    'Yuri','Gra otome','Isekai','Loli','Supermoce','Świat alternatywny',
    'Wojna','Przemoc','Sztuki Walki','Tsundere','Świat fantasy',
    'Overpowered protagonist','Władca Demonów','Villainess','Świat inny',
    'Protagonistka','RPG','Survival','W grze / VR','Crossdressing','Post Apo'
  ]);
  const ANIME_SET = new Set(ANIME_GENRES);
  let searchModal = null;
  let activeSearch = null;
  function normalized(value){
    return String(value || '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pl-PL').trim();
  }
  function optionNode(value,label){
    const node=own('option','',label);node.value=value;return node;
  }
  function sortCatalog(items){
    return [...items].sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'pl',{sensitivity:'base'}));
  }
  function toHomeCardItem(item){
    return {
      id:item.id, serverId:item.serverId||'', type:item.type||'Series',
      anime:Boolean(item.anime), title:item.title||'Brak tytułu',year:item.year||'',
      format:item.kind||item.format||'', description:item.plot||item.description||'',
      genres:Array.isArray(item.genres)?item.genres:[],
      hasPrimary:Boolean(item.hasPrimary??item.has_image),
      seasons:item.seasons??item.season_count??null,
      episodes:item.episodes??item.episode_count??null,
      userRating:item.userRating??item.rating??null,
      watchStatus:item.watchStatus||item.watch_status||'unwatched',
      malId:item.malId??item.mal_id??null
    };
  }
  // CATALOG LOADS ONLY AFTER THE USER OPENS SEARCH. Never on initial Home.
  async function getCatalogForSearch(libraryId=''){
    const key=validId(libraryId)?compactId(libraryId):'all';
    if(!catalogCache.has(key)){
      const path='/catalog'+(key==='all'?'':'?libraryId='+encodeURIComponent(key));
      const promise=request(path,'GET',undefined,90000).then(data=>({
        items:Array.isArray(data?.items)?data.items:[],
        genres:{anime:Array.isArray(data?.genres?.anime)?data.genres.anime:[],
                media:Array.isArray(data?.genres?.media)?data.genres.media:[]}
      })).catch(error=>{catalogCache.delete(key);throw error;});
      catalogCache.set(key,promise);
    }
    return await catalogCache.get(key);
  }
  // Library/type choices are mutually exclusive per title. Multiple green
  // choices are therefore OR within the group; red choices exclude. Genre
  // requirements remain AND as in the original KumaSearch.
  function filterChoice(map, key){
    return Number(map?.get(key)||0);
  }
  function allowGroup(value, map){
    if(!map || !map.size) return true;
    const allowed=[...map].filter(([,mode])=>mode===1).map(([key])=>key);
    const prohibited=[...map].filter(([,mode])=>mode===2).map(([key])=>key);
    if(prohibited.includes(value)) return false;
    return !allowed.length || allowed.includes(value);
  }
  function makeFilterGroup(title, caption){
    const wrap=own('div','mf-home-choice-group');
    wrap.appendChild(own('strong','mf-home-choice-label',title));
    const choices=own('div','mf-home-choice-options');
    choices.setAttribute('role','group');
    choices.setAttribute('aria-label',title);
    wrap.appendChild(choices);
    if(caption) wrap.appendChild(own('span','mf-home-choice-hint',caption));
    return {wrap,choices};
  }
  function renderChoiceGroup(container, options, values, onChange){
    container.replaceChildren();
    for(const option of options){
      const mode=filterChoice(values,option.id);
      const button=own('button',`mf-home-choice ${mode===1?'mf-genre-on':mode===2?'mf-genre-no':''}`,
        `${mode===1?'✓ ':mode===2?'✕ ':''}${option.label}`);
      button.type='button';
      button.setAttribute('data-filter-id',option.id);
      button.setAttribute('data-filter-state',String(mode));
      button.setAttribute('aria-pressed',String(mode!==0));
      button.setAttribute('title','Klikaj: neutralny → wymagaj → wyklucz → neutralny');
      button.addEventListener('click',()=>{
        const next=(mode+1)%3;
        if(next)values.set(option.id,next);else values.delete(option.id);
        renderChoiceGroup(container,options,values,onChange);
        onChange(option.id,next);
      });
      container.appendChild(button);
    }
  }
  // Scope catalogs by the authenticated user's REAL available Jellyfin views.
  // This also supplies a trustworthy library GUID to each search result.
  async function loadScopedCatalog(state){
    const libraries=state.scopedLibraries;
    if(!libraries.length)return {items:[]};
    const all=await Promise.all(libraries.map(async lib=>{
      const data=await getCatalogForSearch(lib.id);
      return data.items.map(item=>({...item,library_id:compactId(lib.id),library_name:lib.name}));
    }));
    return {items:all.flat()};
  }
  function closeSearch(){
    if(!searchModal)return;
    const opener=activeSearch?.opener;
    searchModal.remove();searchModal=null;activeSearch=null;
    document.body.classList.remove('mf-home-search-open');
    if(opener?.isConnected)opener.focus();
  }
  function catalogGenres(item,kind){
    const values=Array.isArray(item.genres)?item.genres:[];
    return kind==='anime'?values.filter(g=>ANIME_SET.has(g)):values;
  }
  // Index relationships by real Jellyfin GUIDs. Never merge two anime based
  // on their titles: different shows can share the same or similar names.
  function indexAnimeSeasons(state){
    const parents=new Map(state.pool.filter(item=>item.anime&&item.type==='Series'&&validId(item.id))
      .map(item=>[compactId(item.id),item]));
    const linked=new Map();
    for(const item of state.pool){
      if(!item.anime||item.type!=='Season'||!validId(item.parent_series_id))continue;
      const key=compactId(item.parent_series_id);
      if(!parents.has(key))continue; // only link parents allowed in the catalog
      if(!linked.has(key))linked.set(key,[]);
      linked.get(key).push(item);
    }
    state.seasonsBySeries=linked;
  }
  function titleMatches(item,term){
    return [item.title,...(Array.isArray(item.search_titles)?item.search_titles:[])]
      .some(value=>normalized(value).includes(term));
  }
  function relatedSeasons(item,state){
    return item.type==='Series'&&item.anime
      ? (state.seasonsBySeries?.get(compactId(item.id))||[])
      : [];
  }
  function termsForFilter(item,state){
    const ownGenres=catalogGenres(item,state.kind);
    if(state.kind!=='anime'||item.type!=='Series')return new Set(ownGenres.map(normalized));
    // In the aggregated result, a genre found in a linked NFO season counts
    // as a genre of the overall series. Counts and filtering use the same set.
    const all=[...ownGenres];
    relatedSeasons(item,state).forEach(season=>all.push(...catalogGenres(season,'anime')));
    return new Set(all.map(normalized));
  }
  function searchableText(item){
    return normalized([item.title,...(Array.isArray(item.search_titles)?item.search_titles:[]),
      item.year,item.plot,...(Array.isArray(item.genres)?item.genres:[])].join(' '));
  }
  function searchTile(item,state){
    const result=toHomeCardItem(item);
    if(state.kind!=='anime'||item.type!=='Series')return result;
    const children=relatedSeasons(item,state);
    // Prefer authoritative totals from the parent Series. Derive counts only
    // when complete enough, and never pass a single season off as the total.
    if(!result.seasons&&children.length)result.seasons=children.length;
    if(!result.episodes&&children.length&&children.every(s=>Number(s.episode_count)>0)){
      result.episodes=children.reduce((total,s)=>total+Number(s.episode_count),0);
    }
    return result;
  }
  function searchByType(item,state){
    const value=item.type;
    const kind=value==='Series'?'series':value==='Movie'?'movies':value==='Season'?'seasons':'';
    if(!kind)return false;
    // Old test fixtures and earlier search views may still supply one select.
    if(state.typeStates){
      if(!allowGroup(kind,state.typeStates))return false;
      return kind!=='seasons' || state.includeSeasons.checked;
    }
    if(state.type?.value==='series')return value==='Series';
    if(state.type?.value==='movies')return value==='Movie';
    if(state.type?.value==='seasons')return value==='Season';
    return value!=='Season'||state.includeSeasons.checked;
  }
  function fitsSearch(item,state,withText=true){
    if(state.unmatchedGenre)return false;
    if(state.libraryStates && !allowGroup(compactId(item.library_id),state.libraryStates))return false;
    if(!searchByType(item,state))return false;
    const terms=termsForFilter(item,state);
    for(const [term,mode] of state.genreStates){
      if(mode===1&&!terms.has(term))return false;
      if(mode===2&&terms.has(term))return false;
    }
    const q=normalized(state.input.value);
    if(withText&&q){
      if(searchableText(item).includes(q))return true;
      // Default anime search also reads the NFO titles of linked seasons and
      // Specials, but returns the ONE main series card. The checkbox adds
      // individually navigable season cards without replacing that result.
      if(state.kind==='anime'&&item.type==='Series'){
        return relatedSeasons(item,state).some(season=>titleMatches(season,q));
      }
      return false;
    }
    return true;
  }
  function closeWhenNavigate(state){
    state.grid.addEventListener('click',event=>{
      if(event.target.closest?.('a[href^="#/details?"]'))closeSearch();
    });
  }
  function paintSearchResults(state){
    state.matches=state.pool.filter(item=>fitsSearch(item,state));
    state.shown=Math.min(30,state.matches.length);
    state.grid.replaceChildren();
    for(const item of state.matches.slice(0,state.shown))state.grid.appendChild(makeCard(searchTile(item,state)));
    if(!state.matches.length)state.grid.appendChild(own('p','mf-home-empty','Brak wyników dla wybranych warunków.'));
    state.more.hidden=state.shown>=state.matches.length;
    state.status.textContent=`Wyniki: ${state.matches.length} · pokazano ${state.shown} · lista źródłowa: ${state.pool.length}`;
    suggestSearch(state);
  }
  function appendMoreResults(state){
    const more=state.matches.slice(state.shown,state.shown+30);
    more.forEach(item=>state.grid.appendChild(makeCard(searchTile(item,state))));
    state.shown+=more.length;
    state.more.hidden=state.shown>=state.matches.length;
    state.status.textContent=`Wyniki: ${state.matches.length} · pokazano ${state.shown} · lista źródłowa: ${state.pool.length}`;
  }
  function suggestSearch(state){
    const q=normalized(state.input.value);
    state.suggestions.replaceChildren();
    if(q.length<2){state.suggestions.hidden=true;return;}
    const titles=state.matches.filter(item=>titleMatches(item,q) ||
      (state.kind==='anime'&&item.type==='Series'&&
        relatedSeasons(item,state).some(season=>titleMatches(season,q)))).slice(0,8);
    for(const item of titles){
      const tile=searchTile(item,state);
      const link=own('a','mf-home-suggestion');
      link.href=nativeDetails(item.id,item.serverId);
      link.setAttribute('aria-label',`Otwórz w Jellyfin: ${item.title}`);
      const cover=own('span','mf-home-suggestion-cover');
      if(tile.hasPrimary){
        const url=imageFor(tile);
        if(url){
          const img=own('img','');
          img.alt='';img.loading='lazy';img.decoding='async';
          img.src=url.replace('maxHeight=480','maxHeight=120');
          cover.appendChild(img);
        }
      }
      const content=own('span','mf-home-suggestion-content');
      content.appendChild(own('span','mf-home-suggestion-title',item.title||'Bez tytułu'));
      const facts=own('span','mf-home-suggestion-facts');
      const year=item.year?String(item.year):'';
      const counts=[];
      if(year)counts.push(year);
      if(item.type==='Series'){
        if(tile.seasons!=null && Number(tile.seasons)>0)counts.push(`${short(tile.seasons)} sezonów`);
        if(tile.episodes!=null && Number(tile.episodes)>0)counts.push(`${short(tile.episodes)} odcinków`);
      }
      if(item.type==='Season')counts.push('Sezon / Specials');
      if(item.type==='Movie')counts.push('Film');
      facts.textContent=counts.join(' · ');
      content.appendChild(facts);
      if(state.kind==='anime'&&item.type==='Series'){
        const child=relatedSeasons(item,state).find(season=>titleMatches(season,q));
        if(child&&!titleMatches(item,q))content.appendChild(own('span','mf-home-suggestion-match',`Znaleziono po: ${child.title}`));
      }
      append(link,cover,content);
      link.addEventListener('click',closeSearch);
      state.suggestions.appendChild(link);
    }
    state.suggestions.hidden=!titles.length;
  }
  function updateGenreSummary(state){
    const chosen=[];
    for(const [term,mode] of state.genreStates){
      if(!mode)continue;
      chosen.push(`${mode===1?'✓':'✕'} ${state.genreNames.get(term)||term}`);
    }
    state.summary.textContent=chosen.length?'Wybrane filtry: '+chosen.join(' · '):'Brak aktywnych filtrów gatunkowych';
    state.toggle.textContent=(state.genresExpanded?'Ukryj':'Pokaż')+` gatunki (${state.genreNames.size})`;
    state.toggle.setAttribute('aria-expanded',String(state.genresExpanded));
    state.genres.hidden=!state.genresExpanded;
    state.help.hidden=!state.genresExpanded;
  }
  function drawGenreButtons(state){
    state.genres.replaceChildren();
    for(const [term,name] of state.genreNames){
      const mode=state.genreStates.get(term)||0;
      const count=state.genreCounts.get(term)||0;
      const button=own('button',`mf-home-genre-filter ${mode===1?'mf-genre-on':mode===2?'mf-genre-no':''}`,
        `${mode===1?'✓ ':mode===2?'✕ ':''}${name} (${count})`);
      button.type='button';button.setAttribute('aria-pressed',String(mode!==0));
      button.title='Kliknij: neutralny → wymagaj → wyklucz → neutralny';
      button.addEventListener('click',()=>{
        state.genreStates.set(term,(mode+1)%3);
        drawGenreButtons(state);
        paintSearchResults(state);
      });
      state.genres.appendChild(button);
    }
    updateGenreSummary(state);
  }
  function initializeGenres(state,data){
    const counts=new Map(), display=new Map();
    // Non-anime vocabulary comes EXCLUSIVELY from actual Jellyfin genres of
    // non-anime Movie/Series entries, never the 52-genre anime allowlist.
    // Anime counts represent parent series/movies, not every linked season.
    const countPool=state.pool.filter(item=>item.type==='Series'||item.type==='Movie');
    for(const item of countPool){
      const used=termsForFilter(item,state);
      for(const key of used){
        counts.set(key,(counts.get(key)||0)+1);
        const name=catalogGenres(item,state.kind).find(g=>normalized(g)===key) ||
          relatedSeasons(item,state).flatMap(s=>catalogGenres(s,state.kind)).find(g=>normalized(g)===key);
        if(!display.has(key))display.set(key,name || key);
      }
    }
    // Anime: EXACT fixed allowlist of 52 canonical genre names from KumaSearch.
    // Media: ONLY genres that appear in Jellyfin metadata of non-anime items.
    const names=state.kind==='anime'
      ? ANIME_GENRES.filter(g=>counts.has(normalized(g))).sort((a,b)=>a.localeCompare(b,'pl'))
      : [...display.values()].sort((a,b)=>a.localeCompare(b,'pl'));
    state.genreNames=new Map(names.map(name=>[normalized(name),name]));
    state.genreCounts=counts;
    state.genreStates=new Map();
    // Clicking a genre on a Jellyfin detail page opens the correct catalog
    // with its positive (green) AND filter already selected.
    if(state.initialGenre) {
      const key=normalized(state.initialGenre);
      if(state.genreNames.has(key))state.genreStates.set(key,1);
      else state.unmatchedGenre=state.initialGenre;
    }
    drawGenreButtons(state);
  }
  function createSearchModal(kind){
    const overlay=own('div','mf-home-search-overlay');
    overlay.setAttribute('role','presentation');
    const dialog=own('section','mf-home-search-dialog');
    dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-label',kind==='anime'?'Wyszukiwarka anime':'Wyszukiwarka filmów i seriali');
    const header=own('div','mf-home-search-modal-header');
    const heading=own('h2','',kind==='anime'?'Wyszukiwarka anime':'Wyszukiwarka filmów i seriali');
    const close=own('button','mf-home-button mf-home-search-close','✕ Zamknij');
    close.type='button';close.addEventListener('click',closeSearch);
    append(header,heading,close);
    const main=own('div','mf-home-search-modal-main');
    const tool=own('div','mf-home-search-toolbar');
    const searchWrap=own('div','mf-home-search-input-wrap');
    const input=own('input','mf-home-search-input');
    input.type='search';input.autocomplete='off';
    input.placeholder=kind==='anime'?'Tytuł serii, sezonu lub Speciala (NFO)…':'Szukaj filmów i seriali…';
    input.setAttribute('aria-label','Wyszukaj tytuł');
    const suggestions=own('div','mf-home-suggestions');suggestions.hidden=true;
    append(searchWrap,input,suggestions);
    const scopedLibraries=librariesCache.filter(lib=>kind==='anime'?lib.category==='anime':['movies','series'].includes(lib.category));
    const libraryChoices=makeFilterGroup('Biblioteki', 'Zielony: uwzględnij · czerwony: wyklucz · ponownie: obojętne');
    const libraryOptions=scopedLibraries.map(lib=>({id:compactId(lib.id),label:lib.name}));
    const typeChoices=makeFilterGroup('Typy produkcji', 'Możesz zaznaczyć kilka typów jednocześnie');
    const typeOptions=[{id:'series',label:'Serie'},{id:'movies',label:kind==='anime'?'Filmy / OVA / ONA':'Filmy'}];
    if(kind==='anime')typeOptions.push({id:'seasons',label:'Sezony / Specials'});
    const seasonLabel=own('label','mf-home-search-seasons');
    const includeSeasons=own('input','');includeSeasons.type='checkbox';
    seasonLabel.append(includeSeasons,document.createTextNode(' Pokaż osobne sezony / Specials'));
    if(kind!=='anime')seasonLabel.hidden=true;
    const reset=own('button','mf-home-button','Wyczyść filtry');reset.type='button';
    const refresh=own('button','mf-home-button','Odśwież dane');refresh.type='button';
    tool.append(searchWrap,seasonLabel,reset,refresh);
    const choicesWrap=own('div','mf-home-choice-groups');
    append(choicesWrap,libraryChoices.wrap,typeChoices.wrap);
    const genresHead=own('div','mf-home-genres-head');
    const genresTitle=own('h3','',kind==='anime'?'Gatunki anime':'Gatunki filmów i seriali');
    const toggle=own('button','mf-home-button','Pokaż gatunki');toggle.type='button';
    toggle.setAttribute('aria-expanded','false');
    append(genresHead,genresTitle,toggle);
    const summary=own('p','mf-home-search-summary','Brak aktywnych filtrów gatunkowych');
    const help=own('p','mf-home-search-help','1× zielony = wymagaj · 2× czerwony = wyklucz · 3× neutralny = wyłącz. Gatunki łączą się przez AND.');
    const genres=own('div','mf-home-genre-filters');
    const status=own('p','mf-home-search-status','Ładowanie katalogu…');
    status.setAttribute('role','status');
    const grid=own('div','mf-home-search-grid');
    const more=own('button','mf-home-button mf-home-search-more','Pokaż kolejne');more.type='button';more.hidden=true;
    main.append(tool,choicesWrap,genresHead,summary,help,genres,status,grid,more);
    dialog.append(header,main);overlay.appendChild(dialog);
    const state={kind, overlay, input, suggestions, includeSeasons, reset, refresh,
      scopedLibraries, libraryOptions, typeOptions, libraryChoices, typeChoices,
      libraryStates:new Map(), typeStates:new Map(),
      genres,genreStates:new Map(),genreNames:new Map(),genreCounts:new Map(),genresExpanded:true,
      toggle,summary,help,status,grid,more,pool:[],matches:[],shown:0,requestId:0};
    renderChoiceGroup(libraryChoices.choices,libraryOptions,state.libraryStates,()=>paintSearchResults(state));
    renderChoiceGroup(typeChoices.choices,typeOptions,state.typeStates,(selected,mode)=>{
      if(selected==='seasons'&&mode===1)includeSeasons.checked=true;
      paintSearchResults(state);
    });
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeSearch();});
    toggle.addEventListener('click',()=>{state.genresExpanded=!state.genresExpanded;updateGenreSummary(state);});
    includeSeasons.addEventListener('change',()=>paintSearchResults(state));
    let debounce;
    input.addEventListener('input',()=>{
      window.clearTimeout(debounce);
      debounce=window.setTimeout(()=>paintSearchResults(state),220);
    });
    input.addEventListener('keydown',e=>{if(e.key==='Enter')state.suggestions.hidden=true;});
    dialog.addEventListener('click',e=>{if(!searchWrap.contains(e.target))suggestions.hidden=true;});
    reset.addEventListener('click',()=>{
      input.value='';includeSeasons.checked=false;
      state.libraryStates.clear();state.typeStates.clear();state.genreStates.clear();
      state.unmatchedGenre='';state.initialGenre='';
      renderChoiceGroup(libraryChoices.choices,libraryOptions,state.libraryStates,()=>paintSearchResults(state));
      renderChoiceGroup(typeChoices.choices,typeOptions,state.typeStates,()=>paintSearchResults(state));
      drawGenreButtons(state);paintSearchResults(state);
      input.focus();
    });
    more.addEventListener('click',()=>appendMoreResults(state));
    refresh.addEventListener('click',()=>{
      for(const lib of state.scopedLibraries)catalogCache.delete(compactId(lib.id));
      loadSearch(state);
    });
    closeWhenNavigate(state);
    return state;
  }
  async function loadSearch(state){
    const job=++state.requestId;
    state.status.textContent='Odczytywanie katalogu — bez przeładowania strony Jellyfin…';
    state.refresh.disabled=true;
    try{
      const data=await loadScopedCatalog(state);
      if(state!==activeSearch || !state.overlay.isConnected || job!==state.requestId)return;
      state.pool=sortCatalog(data.items.filter(x=>state.kind==='anime'
        ? x.anime && ['Series','Movie','Season'].includes(x.type)
        : !x.anime && ['Series','Movie'].includes(x.type)));
      indexAnimeSeasons(state);
      initializeGenres(state,data);
      paintSearchResults(state);
      if(state.unmatchedGenre)state.status.textContent='Nie znaleziono gatunku „'+state.unmatchedGenre+'” w tej wyszukiwarce.';
    }catch(error){
      if(state===activeSearch && state.overlay.isConnected){
        state.status.textContent='Nie udało się odczytać katalogu. Użyj „Odśwież dane”.';
        state.grid.replaceChildren();
      }
    }finally{state.refresh.disabled=false;}
  }
  function openSearch(kind,initialGenre=''){
    if(!homeRoot?.isConnected)return;
    closeSearch();
    const opener=document.activeElement;
    const state=createSearchModal(kind);
    state.opener=opener;state.initialGenre=initialGenre;state.unmatchedGenre='';
    activeSearch=state;searchModal=state.overlay;
    document.body.appendChild(state.overlay);
    document.body.classList.add('mf-home-search-open');
    state.input.focus();
    void loadSearch(state);
  }
  function linkedGenreRequest(){
    if(!homeRoute())return null;
    try {
      const query=new URLSearchParams((window.location.hash||'').split('?')[1]||'');
      const kind=query.get('mfSearch');
      const genre=(query.get('mfGenre')||'').trim();
      if((kind==='anime'||kind==='media')&&genre&&genre.length<=100)return {kind,genre};
    } catch {}
    return null;
  }
  function maybeOpenLinkedGenre(){
    const selected=linkedGenreRequest();
    if(!selected){processedGenreLink='';return;}
    if(!homeRoot?.isConnected || !librariesCache.length)return;
    const signature=window.location.hash;
    if(processedGenreLink===signature)return;
    processedGenreLink=signature;
    openSearch(selected.kind,selected.genre);
  }
  function discoverySection(){
    const section=own('nav','mf-home-discovery');
    section.setAttribute('aria-label','Biblioteki i wyszukiwarki MisioFlix');
    const folderButtons=own('div','mf-home-folder-buttons');
    folderButtons.appendChild(own('p','mf-home-search-helper','Ładowanie bibliotek…'));
    section.appendChild(folderButtons);
    return {section,folderButtons};
  }
  function paintFolderButtons(){
    const box=discoveryRefs?.folderButtons;
    if(!box)return;
    box.replaceChildren();
    if(!librariesCache.length){
      box.appendChild(own('p','mf-home-search-helper','Brak dostępnych bibliotek.'));
    }
    for(const lib of librariesCache){
      // The new Collections view belongs only in its separate shelf, not in
      // the five established library buttons or the two search pop-outs.
      if(lib.category==='collections')continue;
      const link=set(own('a','mf-home-folder-button',lib.name),'href',safeLibraryHref(lib.href,lib.id));
      link.setAttribute('aria-label',`Otwórz bibliotekę ${lib.name}`);
      box.appendChild(link);
    }
    // Match the five native-style library buttons: an actual addressable
    // list view, never scrollIntoView on the home carousel.
    const collectionButton=set(own('a','mf-home-folder-button','Kolekcje'),'href',COLLECTIONS_URL);
    collectionButton.setAttribute('aria-label','Otwórz listę wszystkich kolekcji');
    box.appendChild(collectionButton);
    for(const [kind,name] of [['anime','Wyszukiwarka anime'],['media','Wyszukiwarka filmów i seriali']]){
      const btn=own('button','mf-home-folder-button mf-home-search-launch',name);
      btn.type='button';btn.setAttribute('aria-haspopup','dialog');
      btn.addEventListener('click',()=>openSearch(kind));
      box.appendChild(btn);
    }
  }
  function createCollectionsPage(){
    const section=own('section','mf-collections-page');
    section.setAttribute('aria-label','Wszystkie kolekcje');
    const header=own('div','mf-collections-page-header');
    const back=set(own('a','mf-collections-page-back','← Strona główna'),'href','#/home');
    const heading=own('h1','','Kolekcje');
    const summary=own('p','mf-collections-page-summary','Wszystkie kolekcje filmów i seriali');
    append(header,back,heading,summary);
    const grid=own('div','mf-collections-page-grid');
    const message=own('p','mf-home-empty','Ładowanie kolekcji…');
    grid.appendChild(message);
    const next=own('button','mf-home-button mf-collections-page-more','Pokaż kolejne');
    next.type='button';next.hidden=true;
    next.addEventListener('click',()=>void loadCollectionsPage(false));
    append(section,header,grid,next);
    return {section,grid,next,summary};
  }
  async function loadCollectionsPage(reset=false){
    if(!collectionsPage || !collectionsRoute() || !homeRoot?.isConnected || collectionsLoad.busy)return;
    if(!reset && (!collectionsLoad.hasMore || collectionsLoad.loaded===false && collectionsLoad.offset>0))return;
    const serial=epoch;
    const id=++collectionsLoad.requestId;
    collectionsLoad.busy=true;
    const start=reset?0:collectionsLoad.offset;
    if(reset){collectionsLoad.offset=0;collectionsLoad.hasMore=true;collectionsPage.grid.replaceChildren(own('p','mf-home-empty','Ładowanie kolekcji…'));}
    collectionsPage.next.disabled=true;
    try{
      // The server caps one authorized request at 24 items; paginate instead
      // of fetching the entire database or relying on a separate BoxSet view.
      const data=await request('/home/collections?mode=latest&startIndex='+start+'&limit=24');
      if(!isCurrent(serial)||id!==collectionsLoad.requestId||!collectionsPage?.section.isConnected)return;
      const items=Array.isArray(data.items)?data.items.filter(item=>item.type==='BoxSet'):[];
      if(reset || start===0)collectionsPage.grid.replaceChildren();
      for(const item of items)collectionsPage.grid.appendChild(makeCard(item));
      collectionsLoad.offset=start+items.length;
      collectionsLoad.hasMore=Boolean(data.hasMore)&&items.length>0;
      collectionsLoad.loaded=true;
      collectionsPage.next.textContent='Pokaż kolejne';
      collectionsPage.next.hidden=!collectionsLoad.hasMore;
      collectionsPage.summary.textContent=items.length||start ? 'Pobrano '+collectionsLoad.offset+' kolekcji' : 'Brak kolekcji';
      if(!collectionsPage.grid.childElementCount)collectionsPage.grid.appendChild(own('p','mf-home-empty','Nie znaleziono kolekcji.'));
    }catch{
      if(isCurrent(serial)&&collectionsPage?.section.isConnected){
        if(reset)collectionsPage.grid.replaceChildren(own('p','mf-home-empty','Nie udało się pobrać kolekcji.'));
        collectionsPage.next.textContent='Spróbuj ponownie';
        collectionsPage.next.hidden=false;
      }
    }finally{
      collectionsLoad.busy=false;
      if(collectionsPage?.next)collectionsPage.next.disabled=false;
    }
  }
  function syncCollectionsPage(){
    if(!homeRoot?.isConnected || !collectionsPage)return;
    const isList=collectionsRoute();
    homeRoot.classList.toggle('mf-collections-page-active',isList);
    if(isList && !collectionsLoad.loaded && !collectionsLoad.busy)void loadCollectionsPage(true);
  }
  function hero(shortcuts){
    const hero=own('section','mf-home-hero');
    const intro=own('div','mf-home-intro');
    const logo=own('img','mf-home-logo');logo.src='/MisioFlix/assets/logo.png';logo.alt='MisioFlix';
    const title=own('h1','', 'Twój świat filmów i anime');
    const sub=own('p','','Własna biblioteka. Oryginalny odtwarzacz Jellyfin.');
    append(intro,logo,title,sub);
    // The original right-hand hero zone now holds the library/search shortcuts.
    append(hero,intro,shortcuts);
    return hero;
  }
  function resumeShelf(){
    // All of the current user's resume items, not just the three that fit in the hero.
    const watch=own('section','mf-home-resume mf-home-resume-shelf');
    watch.setAttribute('aria-label','Oglądaj dalej');
    const header=own('div','mf-home-resume-head');
    const title=own('h2','','Oglądaj dalej');
    const actions=own('div','mf-home-actions');
    const toggle=own('button','mf-home-button mf-home-hidden-toggle','Pokaż ukryte (0)');
    toggle.type='button';toggle.disabled=true;toggle.setAttribute('aria-expanded','false');
    const prev=own('button','mf-home-nav','‹');prev.type='button';prev.setAttribute('aria-label','Przewiń Oglądaj dalej w lewo');
    const next=own('button','mf-home-nav','›');next.type='button';next.setAttribute('aria-label','Przewiń Oglądaj dalej w prawo');
    append(actions,toggle,prev,next);
    append(header,title,actions);
    const scroll=own('div','mf-home-resume-items');
    scroll.setAttribute('aria-label','Wszystkie pozycje Oglądaj dalej');
    scroll.appendChild(own('p','mf-home-empty','Ładowanie oglądanych…'));
    // Reuse the tested carousel drag/touch behavior without any pagination trigger.
    enableShelfDrag(scroll,{busy:true,hasMore:false,mode:'resume'});
    toggle.addEventListener('click',()=>{showHiddenResume=!showHiddenResume;paintResume();});
    prev.addEventListener('click',()=>scroll.scrollBy({left:-Math.max(400,scroll.clientWidth*.75),behavior:'smooth'}));
    next.addEventListener('click',()=>scroll.scrollBy({left:Math.max(420,scroll.clientWidth*.77),behavior:'smooth'}));
    append(watch,header,scroll);
    return watch;
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
      maybeOpenLinkedGenre();
      if(!Array.isArray(libs)||!libs.length){container.appendChild(own('p','mf-home-empty','Nie znaleziono dostępnych bibliotek.'));return;}
      // Collections are a separate home row, never Jellyfin's optional
      // 'group movies into collections' setting. Place directly after AnimePL.
      const valid=libs.filter(lib=>validId(lib.id) && ['anime','movies','series'].includes(lib.category));
      // A global BoxSet shelf is always available; /Users/Me/Views commonly
      // omits the Collections library entirely. No made-up parent GUIDs.
      const collectionsShelf={id:'collections',name:'Kolekcje',category:'collections',href:''};
      const animeViews=valid.filter(lib=>lib.category==='anime');
      const otherViews=valid.filter(lib=>lib.category!=='anime');
      const ordered=[...animeViews,collectionsShelf,...otherViews];
      for(const lib of ordered){
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
      librariesCache=[];paintFolderButtons();
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
      discoveryRefs = discoverySection();
      homeRoot.appendChild(hero(discoveryRefs.section));
      paintFolderButtons();
      showHiddenResume=false;
      homeRoot.appendChild(resumeShelf());
      collectionsPage=createCollectionsPage();
      collectionsLoad={busy:false,loaded:false,offset:0,hasMore:true,requestId:0};
      homeRoot.appendChild(collectionsPage.section);
      const rowsArea=own('div','mf-home-rows');
      rowsArea.appendChild(own('p','mf-home-empty','Ładowanie bibliotek…'));
      homeRoot.appendChild(rowsArea);
      host.prepend(homeRoot);
      document.documentElement.classList.add('mf-home-custom-active');
      syncCollectionsPage();
      void loadLibraries(serial);
      void loadResume(serial);
    }finally{mounting=false;}
  }
  function unmountHome(){
    if(homeRoot){
      closeSearch();homeRoot.remove();homeRoot=null;homeHost=null;
      discoveryRefs=null;collectionsPage=null;collectionsLoad.requestId++;epoch++;rows.clear();
    }
    document.documentElement.classList.remove('mf-home-custom-active');
  }
  function reconcile(){
    const token=currentToken();
    const visible=homeRoute() && Boolean(token);
    const host=visible ? (document.querySelector('#indexPage') || document.querySelector('.homePage') || document.querySelector('main')) : null;
    if(!visible||!host){
      processedGenreLink='';
      unmountHome();
      librariesCache=[];catalogCache.clear();
      owner=token;
      return;
    }
    if(owner!==token){
      owner=token;epoch++;
      closeSearch();homeRoot?.remove();homeRoot=null;homeHost=null;discoveryRefs=null;collectionsPage=null;collectionsLoad.requestId++;rows.clear();resumeData={items:[],hidden:[]};librariesCache=[];catalogCache.clear();
    }
    if(homeRoot && homeRoot.isConnected && homeHost===host){syncCollectionsPage();maybeOpenLinkedGenre();return;}
    homeRoot?.remove();mount(host);
  }
  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    window.setTimeout(()=>{queued=false;reconcile();},180);
  }
  // Jellyfin 12.4 can occasionally attach its native /mixed scroll component
  // before its scroll-controller method is available on the first cold load.
  // That failure is rendered by the native error boundary; normal navigation
  // remains entirely native. Recover only this exact error ONCE per library
  // visit, then leave it visible if it reoccurs (no refresh loops).
  const MIXED_RECOVERY_KEY = 'misioflix-native-mixed-scroll-retry';
  const mixedRoute = () => /^#\/mixed(?:[?&#]|$)/i.test(window.location.hash || '');
  let mixedRecoveryCheck = 0;
  function checkMixedScrollerError(){
    if(!mixedRoute() || mixedRecoveryCheck)return;
    mixedRecoveryCheck=window.setTimeout(()=>{
      mixedRecoveryCheck=0;
      if(!mixedRoute() || !document.body)return;
      const bodyText=document.body.textContent||'';
      if(!bodyText.includes('TypeError') ||
         !bodyText.includes('e.addScrollEventListener is not a function'))return;
      try{
        if(sessionStorage.getItem(MIXED_RECOVERY_KEY)==='1')return;
        sessionStorage.setItem(MIXED_RECOVERY_KEY,'1');
      }catch{return;} // fail closed: never reload in a loop if storage is blocked
      window.location.reload(); // one retry, same user/library/filter/URL
    },300);
  }

  function start(){
    if(!normalizeLibraryRoute())reconcile();
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape' && searchModal){event.preventDefault();closeSearch();}
    });
    document.addEventListener('click',interceptLibraryNavigation,true);
    // The native header lives OUTSIDE our injected home. Clear our subtree on
    // pointerdown, before Jellyfin's React click router mounts a different view.
    // Never remove a clicked card/modal from under its own handler.
    document.addEventListener('pointerdown',event=>{
      if(!homeRoot || event.button!==0)return;
      const link=event.target.closest?.('header a[href],.skinHeader a[href],.MuiAppBar-root a[href],nav a[href]');
      // The hero's library shortcuts are inside our OWN <nav>. Removing
      // homeRoot on pointerdown destroys the <a> BEFORE the browser's click
      // event and default navigation. Collection links were unaffected because
      // they target a home subroute; AnimePL / other libraries ended at blank
      // #/home. Let our links navigate first; hashchange handles unmounting.
      if(!link || homeRoot.contains(link))return;
      // A genuine Jellyfin header link lives outside MisioFlix's subtree.
      if(!homeRouteFor(link.getAttribute('href')||''))unmountHome();
    },true);
    window.addEventListener('hashchange',()=>{
      // Once the user leaves the library a future cold load may retry once.
      if(!mixedRoute()){
        if(mixedRecoveryCheck){window.clearTimeout(mixedRecoveryCheck);mixedRecoveryCheck=0;}
        try{sessionStorage.removeItem(MIXED_RECOVERY_KEY);}catch{}
      }
      if(!homeRoute())unmountHome();
      if(!normalizeLibraryRoute())schedule();
      checkMixedScrollerError();
    });
    window.addEventListener('pageshow',schedule);
    document.addEventListener('viewshow',schedule);
    const observer=new MutationObserver(mutations=>{
      // The native error boundary is outside MisioFlix's home route. Only
      // inspect it on /mixed; do not alter a functioning scroll component.
      if(mixedRoute())checkMixedScrollerError();
      if(!homeRoute() && !homeRoot)return;
      // Do not rescan due to MisioFlix card insertion or image load.
      if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1 && !n.closest?.('#mf-home-0412'))))schedule();
      if(homeRoot && !homeRoot.isConnected)schedule();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    checkMixedScrollerError();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
