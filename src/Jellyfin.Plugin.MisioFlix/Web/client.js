/* MisioFlix 0.4.19 - progressive enhancements to ORIGINAL Jellyfin Web.
 * No separate page, no catalog request, no router changes, no player replacement.
 * Native Jellyfin cards are ONLY decorated with small noninteractive ornaments.
 * Netflin is a design/selector reference; this is original MisioFlix code.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_NATIVE_SKIN_0411__) return;
  window.__MISIOFLIX_NATIVE_SKIN_0411__ = true;

  // Jellyfin 12.4's #/mixed (AnimePL) keeps its original card/router/scroller.
  // Reuse the same noninteractive visual ornaments as v0.4.29, not a separate
  // plain-text CSS lookalike. Cards may be recycled: always check data-id.
  const modernMixedRoute=()=>/^#\/mixed(?:[?&#]|$)/i.test(window.location?.hash||'');
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
    if(modernMixedRoute())return; // Preserve the native Jellyfin virtual list unchanged.
    const headings=[...document.body.querySelectorAll(TITLE)].slice(0,110);
    for(const h of headings){
      // v0.4.19 home shelves live in their own scoped subtree, not native sections.
      if(h.closest?.('#mf-home-0412'))continue;
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
    const libraryLinks=[...(document.querySelectorAll?.('header a[href*="topParentId"], .skinHeader a[href*="topParentId"], .MuiAppBar-root a[href*="topParentId"], .headerTabs a[href*="topParentId"]') || document.body.querySelectorAll('a[href*="topParentId"]'))];
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
    const rawRating=card.getAttribute('data-mf-user-rating');
    const rating=shortNumber(rawRating,kind!=='anime'||!Number.isInteger(Number(rawRating)));
    if(kind==='anime'&&rating)result.push({value:rating,label:'Moja ocena MAL',cls:'rating',color:'#ee9fc9'});
    return result;
  }
  function genres(card){
    // An external metadata enrichment may set data-mf-genres from NFO for anime.
    // Never copy anime genres from Jellyfin's generic catalog as a fallback.
    const raw=card.getAttribute('data-mf-genres')||'';
    return [...new Set(raw.split(/[|,;]/).map(x=>x.trim()).filter(Boolean))].slice(0,3);
  }
  function attachOverlay(card){
    // v0.4.29 ornament: same markup and paw icons in home/native library views.
    // No href, router, card owner or scrolling element is replaced.
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
  // Enrich the ORIGINAL Jellyfin card, never its link or layout controller.
  // For anime this text is supplied ONLY from NFO on the server.
  function attachDescription(card, raw) {
    const box=card.querySelector('.cardBox');
    if(!box)return;
    let d=box.querySelector('.mf-native-description');
    const value=String(raw||'').replace(/\s+/g,' ').trim();
    if(!value){d?.remove();card.removeAttribute('data-mf-has-summary');return;}
    if(!d){d=makeEl('div','mf-native-description');box.appendChild(d);}
    // textContent ensures file metadata can never inject HTML.
    if(d.textContent!==value)d.textContent=value;
    card.setAttribute('data-mf-has-summary','1');
  }
  function cardIsAnimePoster(card){
    const kind=cardKind(card);
    // Episode stills are intrinsically 16:9: preserve them, do not crop faces.
    return kind==='anime' && !['Episode','Video'].includes(card.getAttribute('data-type')||'');
  }
  // v0.4.29 library presentation, including in #/mixed. Only previously
  // existing Jellyfin cards are decorated, never copied or recreated.
  function clearMixedCard(card){
    card.querySelector('.cardScalable')?.removeAttribute('data-mf-mixed-heading');
    card.querySelector('.cardScalable')?.removeAttribute('data-mf-mixed-format');
    card.querySelector('.cardScalable')?.removeAttribute('data-mf-mixed-stats');
    card.querySelector('.cardImageContainer')?.removeAttribute('data-mf-mixed-genres');
    card.querySelector('.cardBox')?.removeAttribute('data-mf-mixed-description');
  }
  function paintMixedCard(card){
    // Same v0.4.29 overlay is used for every Jellyfin anime card.
    if(card.getAttribute('data-mf-anime')==='1')attachOverlay(card);
  }
  function markCards(){
    document.documentElement.classList.toggle('mf-modern-mixed-route',modernMixedRoute());
    let n=0;
    for(const card of document.body.querySelectorAll(CARD)){
      if(card.closest('.dialog,#dashboardPage,[role="dialog"]'))continue;
      // Virtualized #/mixed slots can be reused for a DIFFERENT anime.
      resetCardIfReused(card);
      if(!card.querySelector(IMAGE))continue;
      if(modernMixedRoute() && (!card.closest('.itemsContainer') || !card.getAttribute('data-id')))continue;
      clearMixedCard(card); // Remove v0.4.37 pseudo data attributes, if any.
      card.dataset.mfCard='1';
      const kind=cardKind(card);
      if(kind)card.dataset.mfKind=kind;
      else card.removeAttribute('data-mf-kind');
      if(cardIsAnimePoster(card))card.setAttribute('data-mf-anime-poster','1');
      else card.removeAttribute('data-mf-anime-poster');
      const secondary=card.querySelector('.cardText-secondary');
      const year=cardYear(card);
      if(year && /^\s*(?:19|20)\d{2}\s*$/.test(text(secondary)))card.setAttribute('data-mf-redundant-year','1');
      else card.removeAttribute('data-mf-redundant-year');
      if(card.getAttribute('data-mf-overlay-ready')!=='1'){
        const state=watchState(card);
        if(cardKind(card)==='anime')card.dataset.mfWatch='unknown';
        else if(state)card.dataset.mfWatch=state;
        else card.removeAttribute('data-mf-watch');
      }
      // v0.4.29's exact paw/genre/year badge DOM, pointer-events:none.
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
  // Jellyfin's SPA can build a card before the lazy image URL is available.
  // On a full reload Jellyfin may already have selected Primary; on client-side
  // navigation (#/home or #/) it can later replace that image with Thumb.
  // Correct ONLY a real landscape Thumb/Backdrop and only if Jellyfin confirms
  // that the item has a Primary poster. We do not create another card or URL
  // router, and never alter Episode images or film images.
  function syncPrimaryPoster(card,data){
    if(!data?.hasPrimary || !cardIsAnimePoster(card))return;
    const image=card.querySelector('.cardImageContainer');
    if(!image)return;
    const raw=String(image.style?.backgroundImage || '');
    if(/\/Images\/Primary(?:[?\"'\s)]|$)/i.test(raw)){
      card.setAttribute('data-mf-primary-image','1');
      return;
    }
    if(!/\/Images\/(?:Thumb|Backdrop)(?:[?\"'\s)]|$)/i.test(raw))return;
    const id=String(card.getAttribute('data-id')||'').toLowerCase().replace(/-/g,'');
    if(!/^[0-9a-f]{32}$/.test(id))return;
    const url=`/Items/${id}/Images/Primary?maxHeight=460&quality=86`;
    image.style.backgroundImage=`url(\"${url}\")`;
    card.setAttribute('data-mf-primary-image','1');
  }
  function resetCardIfReused(card){
    const id=String(card.getAttribute('data-id')||'').toLowerCase().replace(/-/g,'');
    if(!id)return;
    const prev=card.getAttribute('data-mf-item-id');
    if(prev && prev!==id){
      io?.unobserve(card);
      seenCards.delete(card);
      for(const cards of overlayQueue.values())cards.delete(card);
      for(const attr of ['data-mf-year','data-mf-format','data-mf-genres',
        'data-mf-seasons','data-mf-episodes','data-mf-user-rating','data-mf-anime',
        'data-mf-overlay-ready','data-mf-watch','data-mf-mal-id','data-mf-primary-image',
        'data-mf-simkl-series','data-mf-simkl-season','data-mf-simkl-watch',
        'data-mf-has-summary','data-mf-anime-poster','data-mf-redundant-year']){
        card.removeAttribute(attr);
      }
      card.querySelector('.mf-native-overlay')?.remove();
      card.querySelector('.mf-native-description')?.remove();
      card.classList.remove('mf-simkl-native-media','mf-simkl-season-media');
      card.removeAttribute('data-mf-simkl-watch');
      card.removeAttribute('data-mf-simkl-score');
      card.querySelectorAll('.mf-collection-preview,.mf-collection-label').forEach(node=>node.remove());
      card.classList.remove('mf-collection-card','mf-collection-has-preview','mf-physical-folder','mf-empty-folder');
      card.removeAttribute('data-mf-collection-type');
      card.removeAttribute('data-mf-folder-observed');
    }
    card.setAttribute('data-mf-item-id',id);
  }
  function useMetadata(card,data){
    if(!data||typeof data!=='object')return;
    // One visual component for Home's native cards, AnimePL and other libraries:
    // restore the proven v0.4.29 overlay instead of the pseudo-content imitation.
    const before=card.getAttribute('data-mf-mal-id')||'';
    const set=(name,v)=>{
      if(v===undefined||v===null||v==='')card.removeAttribute(name);
      else card.setAttribute(name,String(v));
    };
    if(data.anime)card.setAttribute('data-mf-anime','1');
    else card.removeAttribute('data-mf-anime');
    card.setAttribute('data-mf-overlay-ready','1');
    set('data-mf-year',data.year);
    set('data-mf-format',data.format);
    set('data-mf-seasons',data.seasons);
    set('data-mf-episodes',data.episodes);
    // Simkl seasonal frame binding stays distinct from AnimePL and MAL.
    set('data-mf-simkl-series',data.anime?null:data.simklSeriesId);
    set('data-mf-simkl-season',data.anime?null:data.simklSeasonNumber);
    set('data-mf-user-rating',data.anime?null:data.userRating);
    set('data-mf-mal-id',data.anime?data.malId:null);
    set('data-mf-genres',Array.isArray(data.genres)?data.genres.slice(0,3).join('|'):'');
    attachDescription(card,data.description);
    if(cardIsAnimePoster(card))card.setAttribute('data-mf-anime-poster','1');
    else card.removeAttribute('data-mf-anime-poster');
    syncPrimaryPoster(card,data);
    const status=data.watchStatus;
    if(data.anime){
      // Only the logged-in MAL user's own list controls anime frames. Preserve
      // already-hydrated MAL status on re-renders of the SAME anime.
      if(before!==String(data.malId||'')){
        card.setAttribute('data-mf-watch','unknown');
        card.removeAttribute('data-mf-user-rating');
      }
    }else if(['unwatched','started','watched'].includes(status)){
      card.setAttribute('data-mf-watch',status);
    }else card.removeAttribute('data-mf-watch');
    attachOverlay(card);
    if(data.anime && before!==String(data.malId||''))
      window.dispatchEvent(new Event('misioflix-mal-binding-ready'));
    if(!data.anime && data.simklSeriesId && data.simklSeasonNumber!==null && data.simklSeasonNumber!==undefined)
      window.dispatchEvent(new Event('misioflix-simkl-season-ready'));
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
      const headers={Authorization:'MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-theme", Version="0.4.19", Token="'+token.replace(/["\r\n]/g,'')+'"'};
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
      for(const [id,cards] of picked){
        const data=metadataCache.get(id);
        if(data)for(const card of cards){
          if(card.isConnected && String(card.getAttribute('data-id')||'').toLowerCase().replace(/-/g,'')===id)
            useMetadata(card,data);
        }
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
    if(!overlayQueue.has(id))overlayQueue.set(id,new Set());
    overlayQueue.get(id).add(card);
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
      for(const key of ['data-mf-mal-id','data-mf-item-id','data-mf-year','data-mf-format','data-mf-genres',
        'data-mf-seasons','data-mf-episodes','data-mf-user-rating',
        'data-mf-anime','data-mf-overlay-ready','data-mf-watch',
        'data-mf-simkl-series','data-mf-simkl-season','data-mf-simkl-watch'])card.removeAttribute(key);
      clearMixedCard(card);
      card.removeAttribute('data-mf-description');
      card.querySelector('.mf-native-overlay')?.remove();
      card.querySelector('.mf-native-description')?.remove();
      card.removeAttribute('data-mf-has-summary');
      card.removeAttribute('data-mf-anime-poster');
      card.removeAttribute('data-mf-redundant-year');
      card.removeAttribute('data-mf-primary-image');
    }
  }


  // v0.4.25: Folder/BoxSet items in Jellyfin 12's legacy /list are NOT movies.
  // Preserve real Jellyfin cards and route actual folder identifiers, never
  // replace their type with Movie or guess a destination from their names.
  const MF_GUID = /^[0-9a-f]{32}$/i;
  const mfCompact = value => String(value||'').replace(/-/g,'').toLowerCase();
  const mfValid = value => MF_GUID.test(mfCompact(value));
  const folderPreviewCache = new Map();
  const folderLoading = new Set();
  let folderIO = null;
  let folderPreviewUser = '';
  function mfApi(){return window.ApiClient||window.ConnectionManager?.getApiClient?.();}
  function mfServerId(){
    const api=mfApi();
    const fromApi=typeof api?.serverId==='function'?api.serverId():api?.serverId;
    if(mfValid(fromApi))return mfCompact(fromApi);
    const current=window.ConnectionManager?.getCurrentServer?.();
    if(mfValid(current?.Id))return mfCompact(current.Id);
    try{
      const fromHash=new URLSearchParams((window.location?.hash||'').split('?')[1]||'').get('serverId');
      if(mfValid(fromHash))return mfCompact(fromHash);
    }catch{}
    return '';
  }
  function mfLibraryRoute(){
    const hash=window.location?.hash||'';
    return /^#\/(?:list|mixed|movies|tv)\?/i.test(hash) && /[?&](?:parentId|topParentId)=[0-9a-f-]{32,36}/i.test(hash);
  }
  function mfFolderType(card){
    const type=String(card.getAttribute('data-type')||card.getAttribute('data-itemtype')||
      card.querySelector('.cardText-first [data-type]')?.getAttribute('data-type')||'').toLowerCase();
    if(type==='boxset')return 'boxset';
    if(type==='folder'||type==='collectionfolder')return 'folder';
    if(type)return '';
    // Legacy Jellyfin sometimes puts folder information only on its title action.
    const isfolder=card.getAttribute('data-isfolder')||card.querySelector('.cardText-first [data-isfolder]')?.getAttribute('data-isfolder');
    return isfolder==='true'?'folder':'';
  }
  function mfFolderId(card){
    const id=card.getAttribute('data-id')||card.querySelector('.cardText-first [data-id]')?.getAttribute('data-id');
    return mfValid(id)?mfCompact(id):'';
  }
  function mfFolderUrl(card){
    const type=mfFolderType(card),id=mfFolderId(card),server=mfServerId();
    if(!type||!id||!server)return '';
    return type==='boxset'
      ? '#/details?id='+encodeURIComponent(id)+'&serverId='+encodeURIComponent(server)
      : '#/list?parentId='+encodeURIComponent(id)+'&serverId='+encodeURIComponent(server);
  }
  function onMfFolderClick(event){
    if(!/^#\/list\?/i.test(window.location?.hash||'')||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const target=event.target;
    if(!(target instanceof Element))return;
    const card=target.closest('.card');
    if(!card||!mfFolderType(card)||card.closest('#mf-home-0412,.dialog,[role="dialog"]'))return;
    // Preserve native watched/menu/actions; the body, thumbnail and title open folder.
    if(target.closest('button,input,select,textarea,[role="button"],.cardOverlayButton,.cardOverlayButton-br,.cardOverlayButton-tl,[data-action="menu"],[data-action="played"]'))return;
    const url=mfFolderUrl(card);
    if(!url)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    if(window.location.hash!==url)window.location.hash=url;
  }
  function mfBackButton(){
    let button=document.querySelector('#mf-library-back-home');
    if(!mfLibraryRoute()){
      button?.remove();
      return;
    }
    if(button)return;
    button=makeEl('button','mf-library-back-home','← Strona główna');
    button.id='mf-library-back-home';button.type='button';
    button.setAttribute('aria-label','Wróć do strony głównej MisioFlix');
    button.addEventListener('click',()=>{window.location.hash='#/home';});
    // Float at the lower edge (theme.css), outside native React-owned toolbar and card grid.
    document.body.insertAdjacentElement('beforeend',button); // Outside Jellyfin's React-managed subtree.
  }
  function mfDecorateFolders(){
    // Modern /mixed (AnimePL) is already working: do not alter its React cards.
    if(!/^#\/list\?/i.test(window.location?.hash||''))return;
    const api=mfApi();
    const uid=typeof api?.getCurrentUserId==='function'?mfCompact(api.getCurrentUserId()):'';
    if(folderPreviewUser!==uid){
      folderPreviewUser=uid;folderPreviewCache.clear();folderLoading.clear();
      document.querySelectorAll('.card[data-mf-folder-observed]').forEach(card=>card.removeAttribute('data-mf-folder-observed'));
    }
    for(const card of document.querySelectorAll('.card[data-id]')){
      const type=mfFolderType(card);
      if(!type||!mfFolderId(card)||card.closest('#mf-home-0412'))continue;
      card.classList.add('mf-collection-card');
      card.dataset.mfCollectionType=type;
      card.classList.toggle('mf-physical-folder',type==='folder');
      card.removeAttribute('data-mf-watch');
      const surface=card.querySelector('.cardScalable');
      if(surface && !surface.querySelector(':scope > .mf-collection-label')){
        const label=makeEl('span','mf-collection-label',type==='boxset'?'KOLEKCJA':'FOLDER');
        label.setAttribute('aria-hidden','true');surface.appendChild(label);
      }
      // Keep all native Jellyfin buttons, links, progress and item data intact.
      if(!uid||!mfValid(uid)||!surface||folderPreviewCache.get(uid+':'+mfFolderId(card))==='no-image')continue;
      if(!folderIO && typeof IntersectionObserver==='function'){
        folderIO=new IntersectionObserver(entries=>{
          for(const entry of entries){
            if(entry.isIntersecting){folderIO.unobserve(entry.target);void mfLoadFolderPreview(entry.target);}
          }
        },{rootMargin:'130px 0px',threshold:0.01});
      }
      if(folderIO && card.dataset.mfFolderObserved!==mfFolderId(card)){
        card.dataset.mfFolderObserved=mfFolderId(card);folderIO.observe(card);
      }
    }
  }
  async function mfLoadFolderPreview(card){
    const api=mfApi(),uid=typeof api?.getCurrentUserId==='function'?mfCompact(api.getCurrentUserId()):'';
    const id=mfFolderId(card),type=mfFolderType(card),key=uid+':'+id;
    if(!mfValid(uid)||!id||!type)return;
    const cached=folderPreviewCache.get(key);
    if(cached){mfPaintFolderPreview(card,cached);return;}
    if(folderLoading.has(key))return;
    folderLoading.add(key);
    try{
      const token=typeof api?.accessToken==='function'?api.accessToken():api?.accessToken;
      if(typeof token!=='string'||!token)return;
      const params=new URLSearchParams({ParentId:id,Recursive:'false',Limit:'12',Fields:'PrimaryImageAspectRatio',ImageTypeLimit:'1'});
      const response=await fetch('/Users/'+encodeURIComponent(uid)+'/Items?'+params.toString(),{
        headers:{Authorization:'MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-folders", Version="0.4.26", Token="'+token.replace(/["\r\n]/g,'')+'"'},
        cache:'no-store'
      });
      if(!response.ok)return;
      const data=await response.json();
      const children=Array.isArray(data.Items)?data.Items:[];
      if(type==='folder' && children.length===0 && data.TotalRecordCount===0){
        card.classList.add('mf-empty-folder');
        const label=card.querySelector('.mf-collection-label');
        if(label)label.textContent='PUSTY FOLDER';
      }
      const ids=children
        .filter(item=>mfValid(item?.Id)&&item?.ImageTags?.Primary)
        .slice(0,4).map(item=>mfCompact(item.Id));
      // If no children have posters, retain native folder icon unchanged.
      folderPreviewCache.set(key,ids.length?ids:'no-image');
      if(ids.length && card.isConnected && mfFolderId(card)===id)mfPaintFolderPreview(card,ids);
    }catch{
      // Visual enhancement must never break opening the original folder.
    }finally{folderLoading.delete(key);}
  }
  function mfPaintFolderPreview(card,ids){
    if(!Array.isArray(ids)||!ids.length||!card.isConnected)return;
    const image=card.querySelector('.cardImageContainer');
    if(!image||image.querySelector(':scope > .mf-collection-preview'))return;
    // Do not replace existing collection posters with a collage.
    const background=String(image.style?.backgroundImage||'').trim();
    if(background && !/^(none|initial|unset|inherit)$/i.test(background))return;
    const grid=makeEl('div','mf-collection-preview'+(ids.length===1?' mf-collection-preview-single':''));
    grid.setAttribute('aria-hidden','true');
    ids.forEach(id=>{
      const poster=document.createElement('img');poster.loading='lazy';poster.alt='';
      poster.src='/Items/'+encodeURIComponent(id)+'/Images/Primary?maxHeight=340&quality=82';
      grid.appendChild(poster);
    });
    image.appendChild(grid);card.classList.add('mf-collection-has-preview');
  }

  let pending=false;
  let observer;
  function playerIsVisible(){
    // Let the ORIGINAL Jellyfin video surface and its controls use native
    // Jellyfin CSS while playing. This avoids theme/player style conflicts;
    // it does not change codecs, streams or Jellyfin playback code.
    for(const video of (document.querySelectorAll?.('video') || [])){
      const shell=video.closest('.videoPlayerContainer,.htmlvideoplayer,.videoPlayer,[data-testid="video-player"]');
      if(!shell)continue;
      const rect=video.getBoundingClientRect();
      if(rect.width>100 && rect.height>80)return true;
    }
    return false;
  }
  function syncPlayerSkin(){
    document.documentElement.classList.toggle('misioflix-skin',!playerIsVisible());
  }
  function decorate(){
    pending=false;
    if(!document.body)return;
    syncPlayerSkin();
    accountGuard();
    markSections();
    markCards();
    mfBackButton();
    mfDecorateFolders();
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
    // Jellyfin re-renders and lazy-loads images after SPA navigation without
    // firing DOMContentLoaded. Observe those inline image changes, but do not
    // re-scan the entire catalogue for each thumbnail or our own inline fix.
    observer=new MutationObserver(changes=>{
      let needsScan=false;
      for(const change of changes){
        if(change.type==='attributes' && change.attributeName==='style'){
          const image=change.target;
          if(!image.classList?.contains('cardImageContainer'))continue;
          const card=image.closest('.card[data-mf-anime-poster="1"]');
          if(!card)continue;
          const id=String(card.getAttribute('data-id')||'').toLowerCase().replace(/-/g,'');
          const data=metadataCache.get(id);
          if(data)syncPrimaryPoster(card,data);
        }else{
          needsScan=true;
        }
      }
      if(needsScan)schedule();
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,
      attributeFilter:['data-played','aria-valuenow','data-id','style']});
    document.addEventListener('click',onMfFolderClick,true);
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
    // MAL JS updates only the personal anime attributes; rebuild their decorative
    // overlay after those attributes change. Other libraries remain untouched.
    window.addEventListener('misioflix-mal-cards-updated',()=>{
      for(const card of document.querySelectorAll('.card[data-mf-card="1"][data-mf-anime="1"]')){
        if(modernMixedRoute())paintMixedCard(card);
        else attachOverlay(card);
      }
    });
    window.addEventListener('pageshow',schedule);
    window.addEventListener('hashchange',schedule);
    document.addEventListener('viewshow',schedule);
    for(const evt of ['play','pause','ended','loadedmetadata'])
      document.addEventListener(evt,schedule,true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
