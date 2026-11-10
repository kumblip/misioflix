/* MisioFlix 0.4.9 - progressive enhancements to ORIGINAL Jellyfin Web.
 * No separate page, no catalog request, no router changes, no player replacement.
 * Native Jellyfin cards are ONLY decorated with small noninteractive ornaments.
 * Netflin is a design/selector reference; this is original MisioFlix code.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_NATIVE_SKIN_049__) return;
  window.__MISIOFLIX_NATIVE_SKIN_049__ = true;

  const CARD = '.card, .MuiCard-root, [data-testid="item-card"], [data-testid="media-card"]';
  const IMAGE = '.cardImageContainer, .MuiCardMedia-root, [data-testid="media-image"]';
  const TITLE = 'h1,h2,h3,h4,.sectionTitle,.sectionTitleTextButton,.MuiTypography-h4,.MuiTypography-h5';
  const WATCH_BTN = 'button[is="emby-playstatebutton"][data-played]';
  const PROGRESS = '.itemProgressBarForeground,.resumeProgress,.resumeProgressBar,.playbackProgress,[data-testid="progress-indicator"]';
  const STATE_ICON = '.playedIndicator,.playedIndicatorIcon,[data-testid="played-indicator"],[aria-label="Played"],[aria-label="Obejrzane"]';
  const sectionLabels = [
    ['resume', /^(kontynuuj odtwarzanie|oglądaj dalej|continue watching|resume)$/i],
    ['libraries', /^(moje multimedia|my media|moje biblioteki|my libraries)$/i],
    ['latest', /(ostatnio dodane|niedawno dodane|recently added|latest media)/i]
  ];

  const svgNS = 'http://www.w3.org/2000/svg';
  const pawPath = 'M12.2 10.6c-2.2 0-3.5 1.9-5.2 4-.9 1.1-1.8 2.3-1.8 3.6 0 1.6 1.3 2.7 2.8 2.7 1.4 0 2.5-.9 4-.9s2.6.9 4 .9c1.5 0 2.8-1.1 2.8-2.7 0-1.3-.9-2.5-1.8-3.6-1.7-2.1-3-4-4.8-4Z';

  const text = el => String(el?.textContent || '').trim();
  function makeEl(tag, name, content) {
    const e = document.createElement(tag);
    e.className = name;
    if (content !== undefined) e.textContent = content;
    return e;
  }
  function paw(color) {
    const s = document.createElementNS(svgNS, 'svg');
    s.setAttribute('viewBox','0 0 24 24');
    s.setAttribute('aria-hidden','true');
    s.classList.add('mf-paw');
    s.style.color=color;
    const pad=(cx,cy,rx,ry)=> {
      const p=document.createElementNS(svgNS,'ellipse');
      p.setAttribute('cx',String(cx));p.setAttribute('cy',String(cy));
      p.setAttribute('rx',String(rx));p.setAttribute('ry',String(ry));
      p.setAttribute('fill','currentColor');
      s.appendChild(p);
    };
    pad(4.9,8.9,1.9,2.6);pad(9.3,5.8,1.9,2.6);pad(14.7,5.8,1.9,2.6);pad(19.1,8.9,1.9,2.6);
    const main=document.createElementNS(svgNS,'path');
    main.setAttribute('d',pawPath);main.setAttribute('fill','currentColor');s.appendChild(main);
    return s;
  }
  function closestSection(node) {
    let p = node.parentElement;
    let backup=null;
    for(let i=0;p&&i<6;i++,p=p.parentElement){
      if (p===document.body || p===document.documentElement) break;
      if (!backup) backup=p;
      if (p.matches?.('section,.verticalSection,.homeSection,[data-testid="home-section"]')) return p;
      const cards=p.querySelectorAll?.(CARD).length || 0;
      const heads=p.querySelectorAll?.(TITLE).length || 0;
      if (cards>0 && cards<=110 && heads<=2) return p;
      const buttons=p.querySelectorAll?.('button,a,[role="button"]').length || 0;
      if (buttons>=2 && buttons<=25 && i>=1 && heads<=2) return p;
    }
    return backup;
  }
  function markSections(){
    const headings=[...document.body.querySelectorAll(TITLE)].slice(0,110);
    for(const h of headings){
      const t=text(h);
      if(!t || t.length>130)continue;
      let kind='';
      for(const [id,re] of sectionLabels){if(re.test(t)){kind=id;break;}}
      if(!kind)continue;
      const section=closestSection(h);
      if(!section || section===document.body)continue;
      if(section.dataset.mfSection!==kind)section.dataset.mfSection=kind;
      section.classList.add('mf-section');
      if(kind==='latest'){
        // Each shelf is identified by its ORIGINAL heading; no mixing of libraries.
        const lib=t.replace(/\s*[—-]\s*(ostatnio dodane|niedawno dodane|recently added|latest media).*/i,'').trim();
        if(lib && section.dataset.mfShelf!==lib)section.dataset.mfShelf=lib;
        if(/anime/i.test(lib))section.dataset.mfAnimeShelf='1';
      }
    }
    // Hide redundant desktop library buttons only if original header already gives access.
    const nativeHeader=document.querySelector('.skinHeader,.MuiAppBar-root');
    const libraryLinks=nativeHeader?.querySelectorAll('a[href*="topParentId"],a[href*="collectionType"]') || [];
    document.documentElement.classList.toggle('mf-has-native-lib-links',libraryLinks.length>=2);
  }
  function watchState(card){
    // The original play-state button is authoritative for single media items.
    const progress=card.querySelector(PROGRESS);
    if(progress){
      const width=progress.style?.width || '';
      const now=progress.getAttribute?.('aria-valuenow');
      if(!/^(0|0%)$/.test(width.trim()) && now!=='0')return 'started';
    }
    const played=card.querySelector(WATCH_BTN);
    if(played?.getAttribute('data-played')==='true' || card.querySelector(STATE_ICON))return 'watched';
    if(played?.getAttribute('data-played')==='false'){
      // For series, unplayed count alone cannot distinguish untouched vs partially watched.
      const type=(card.getAttribute('data-type') || '').toLowerCase();
      if(type==='series' || type==='season') return '';
      return 'unwatched';
    }
    return '';
  }
  function cardKind(card){
    if(card.getAttribute('data-mf-anime')==='1')return 'anime';
    const library=card.closest('[data-mf-anime-shelf="1"]');
    if(library)return 'anime';
    const type=(card.getAttribute('data-type') || card.getAttribute('data-itemtype') || '').toLowerCase();
    if(type==='movie')return 'film';
    if(type==='series' || type==='season')return 'serial';
    if(type==='episode')return 'odcinek';
    return '';
  }
  function cardYear(card){
    const raw=card.getAttribute('data-mf-year') || text(card.querySelector('.cardText-secondary bdi,.cardText-secondary'));
    const match=raw.match(/\b(?:19|20)\d{2}\b/);
    return match?match[0]:'';
  }
  function shortNumber(v, decimal=false){
    if(v===undefined || v===null || String(v).trim()==='')return '';
    const n=Number(String(v).trim().replace(',','.'));
    if(!Number.isFinite(n) || n<0)return '';
    if(decimal)return n<=10 && n>0?n.toFixed(1):'';
    return n>99?'99+':String(Math.floor(n));
  }
  function stats(card,kind){
    const result=[];
    if(kind==='anime'||kind==='serial'){
      // Values MUST be total seasons/episodes, never Jellyfin's pink UNPLAYED badge.
      const seasons=shortNumber(card.getAttribute('data-mf-seasons'));
      const eps=shortNumber(card.getAttribute('data-mf-episodes'));
      if(seasons)result.push({value:seasons,label:'Sezony',cls:'season',color:'#f4ad46'});
      if(eps)result.push({value:eps,label:'Odcinki',cls:'episodes',color:'#65c9eb'});
    }
    // Ratings are PERSONAL: do not use CommunityRating or the like button.
    const rating=shortNumber(card.getAttribute('data-mf-user-rating'),true);
    if(rating)result.push({value:rating,label:'Moja ocena',cls:'rating',color:'#ee9fc9'});
    return result;
  }
  function genres(card){
    // An external metadata enrichment may set data-mf-genres from NFO for anime.
    // Never copy anime genres from Jellyfin's generic catalog as a fallback.
    const raw=card.getAttribute('data-mf-genres')||'';
    return [...new Set(raw.split(/[|,;]/).map(x=>x.trim()).filter(Boolean))].slice(0,3);
  }
  function attachOverlay(card){
    const surface=card.querySelector('.cardScalable,.MuiCardMedia-root');
    if(!surface)return;
    const kind=cardKind(card), year=cardYear(card);
    const info=card.getAttribute('data-mf-format')||'';
    const pawStats=stats(card,kind), chips=genres(card);
    const stamp=JSON.stringify([kind,year,info,pawStats.map(s=>s.value),chips]);
    let overlay=surface.querySelector(':scope > .mf-native-overlay');
    if(overlay?.getAttribute('data-mf-signature')===stamp)return;
    if(overlay)overlay.remove();
    if(!kind&&!year&&!pawStats.length&&!chips.length)return;
    overlay=makeEl('div','mf-native-overlay');
    overlay.setAttribute('aria-hidden','true');
    overlay.setAttribute('data-mf-signature',stamp);
    const top=makeEl('div','mf-native-top');
    const topLeft=makeEl('div','mf-native-top-left');
    if(kind){
      const labels={anime:'ANIME',film:'FILM',serial:'SERIAL',odcinek:'ODCINEK'};
      topLeft.appendChild(makeEl('span','mf-native-kind',labels[kind]));
    }
    if(year){
      const format=(info&&kind!=='film')?` · ${info}`:'';
      topLeft.appendChild(makeEl('span','mf-native-year',year+format));
    }
    top.appendChild(topLeft);
    if(pawStats.length){
      const stack=makeEl('div','mf-native-stats');
      for(const s of pawStats){
        const stat=makeEl('div',`mf-native-stat mf-native-stat-${s.cls}`);
        stat.setAttribute('title',s.label);
        stat.appendChild(makeEl('span','mf-native-stat-number',s.value));
        stat.appendChild(paw(s.color));
        stack.appendChild(stat);
      }
      top.appendChild(stack);
    }
    overlay.appendChild(top);
    if(chips.length){
      const tags=makeEl('div','mf-native-genres');
      for(const g of chips)tags.appendChild(makeEl('span','mf-native-genre',g));
      overlay.appendChild(tags);
    }
    surface.appendChild(overlay);
  }
  function markCards(){
    let n=0;
    for(const card of document.body.querySelectorAll(CARD)){
      if(card.closest('.dialog,#dashboardPage,[role="dialog"]'))continue;
      if(!card.querySelector(IMAGE))continue;
      card.dataset.mfCard='1';
      const kind=cardKind(card);
      if(kind)card.dataset.mfKind=kind;
      else card.removeAttribute('data-mf-kind');
      if(card.getAttribute('data-mf-overlay-ready')!=='1'){
        const state=watchState(card);
        if(state)card.dataset.mfWatch=state;
        else card.removeAttribute('data-mf-watch');
      }
      // Very small DOM ornament inside Jellyfin's native image wrapper: noninteractive.
      if(n++<220)attachOverlay(card);
    }
  }
  // Nonblocking, permission-filtered metadata for VISIBLE original cards only.
  // Never downloads /api/catalog or enumerates the user's whole library.
  // If the overlay endpoint is missing, the native card continues working.
  let seenCards=new WeakSet();
  let io=null;
  let overlayQueue=new Map();
  let hydrationBusy=false;
  let hydrationTimer=null;
  let overlayDisabled=false;
  let ownerToken='';
  const metadataCache=new Map();
  function apiToken(){
    const c=window.ApiClient||window.ConnectionManager?.getApiClient?.();
    const t=c?(typeof c.accessToken==='function'?c.accessToken():c.accessToken):'';
    return typeof t==='string'?t:'';
  }
  function useMetadata(card,data){
    if(!data||typeof data!=='object')return;
    const set=(name,v)=>{
      if(v===undefined||v===null||v==='')card.removeAttribute(name);
      else card.setAttribute(name,String(v));
    };
    if(data.anime)card.setAttribute('data-mf-anime','1');
    card.setAttribute('data-mf-overlay-ready','1');
    set('data-mf-year',data.year);
    set('data-mf-format',data.format);
    set('data-mf-seasons',data.seasons);
    set('data-mf-episodes',data.episodes);
    set('data-mf-user-rating',data.userRating);
    set('data-mf-genres',Array.isArray(data.genres)?data.genres.slice(0,3).join('|'):'');
    const status=data.watchStatus;
    if(['unwatched','started','watched'].includes(status))card.setAttribute('data-mf-watch',status);
    attachOverlay(card);
  }
  async function flushMetadata(){
    hydrationTimer=null;
    if(hydrationBusy||overlayDisabled||!overlayQueue.size)return;
    const token=apiToken();
    if(!token)return;
    const picked=[...overlayQueue.entries()].slice(0,18);
    for(const [id] of picked)overlayQueue.delete(id);
    const requested=token;
    hydrationBusy=true;
    try{
      const headers={Authorization:'MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-theme", Version="0.4.9", Token="'+token.replace(/["\r\n]/g,'')+'"'};
      const q=picked.map(([id])=>id).join(',');
      const controller=new AbortController();
      const timeout=window.setTimeout(()=>controller.abort(),9000);
      let response;
      try{
        response=await fetch('/MisioFlix/api/overlays?ids='+encodeURIComponent(q),{
          headers,cache:'no-store',signal:controller.signal
        });
      }finally{clearTimeout(timeout);}
      if(!response.ok){
        if(response.status===404||response.status===401||response.status===403) overlayDisabled=true;
        return;
      }
      const entries=await response.json();
      if(apiToken()!==requested)return; // user switched account during request
      for(const entry of Array.isArray(entries)?entries:[]){
        const key=String(entry.id||'').toLowerCase().replace(/-/g,'');
        if(key)metadataCache.set(key,entry);
      }
      for(const [id,card] of picked){
        const data=metadataCache.get(id);
        if(card.isConnected&&data)useMetadata(card,data);
      }
    }catch(e){
      // Connection errors must never interfere with native Jellyfin cards.
      if(!window.__MISIOFLIX_OVERLAY_WARNED__){
        window.__MISIOFLIX_OVERLAY_WARNED__=true;
        console.warn('MisioFlix: dodatkowe metadane niedostępne; oryginalne karty działają dalej.');
      }
    }finally{
      hydrationBusy=false;
      if(overlayQueue.size&&!overlayDisabled)hydrationTimer=window.setTimeout(flushMetadata,350);
    }
  }
  function queueMetadata(card){
    const id=String(card.getAttribute('data-id')||'').toLowerCase().replace(/-/g,'');
    if(!/^[0-9a-f]{32}$/.test(id))return;
    if(metadataCache.has(id)){useMetadata(card,metadataCache.get(id));return;}
    overlayQueue.set(id,card);
    if(!hydrationTimer&&!hydrationBusy) hydrationTimer=window.setTimeout(flushMetadata,750);
  }
  function observeVisible(){
    if(overlayDisabled||!apiToken()||typeof IntersectionObserver!=='function')return;
    if(!io){
      io=new IntersectionObserver(entries=>{
        for(const entry of entries){
          if(!entry.isIntersecting)continue;
          io.unobserve(entry.target);
          queueMetadata(entry.target);
        }
      },{rootMargin:'160px 0px',threshold:0.01});
    }
    for(const card of document.body.querySelectorAll(CARD)){
      if(seenCards.has(card))continue;
      if(!card.getAttribute('data-id'))continue;
      if(!card.querySelector(IMAGE))continue;
      seenCards.add(card);
      io.observe(card);
    }
  }
  function accountGuard(){
    const t=apiToken();
    if(t===ownerToken)return;
    ownerToken=t;
    overlayQueue.clear();metadataCache.clear();
    if(io){io.disconnect();io=null;}
    seenCards=new WeakSet();overlayDisabled=false;
    for(const card of document.body.querySelectorAll('[data-mf-card="1"]')){
      for(const key of ['data-mf-year','data-mf-format','data-mf-genres',
        'data-mf-seasons','data-mf-episodes','data-mf-user-rating',
        'data-mf-anime','data-mf-overlay-ready','data-mf-watch'])card.removeAttribute(key);
      card.querySelector('.mf-native-overlay')?.remove();
    }
  }

  let pending=false;
  let observer;
  function decorate(){
    pending=false;
    if(!document.body)return;
    accountGuard();
    markSections();
    markCards();
    observeVisible();
  }
  function schedule(){
    if(pending)return;
    pending=true;
    window.setTimeout(decorate,190);
  }
  function init(){
    document.documentElement.classList.add('misioflix-skin');
    // Optional cleanup of older pre-0.4.7 portal artifacts only.
    document.querySelector('#mf-portal')?.remove();
    document.querySelector('#mf-launch')?.remove();
    decorate();
    observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-played','aria-valuenow']});
    document.addEventListener('click',event=>{
      const button=event.target?.closest?.(WATCH_BTN);
      if(button){
        const card=button.closest(CARD);
        if(card){
          const id=String(card.getAttribute('data-id')||'').toLowerCase().replace(/-/g,'');
          metadataCache.delete(id);
          card.removeAttribute('data-mf-overlay-ready');
          window.setTimeout(()=>queueMetadata(card),850);
        }
      }
      schedule();
    },{passive:true});
    window.addEventListener('pageshow',schedule);
    window.addEventListener('hashchange',schedule);
    document.addEventListener('viewshow',schedule);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
