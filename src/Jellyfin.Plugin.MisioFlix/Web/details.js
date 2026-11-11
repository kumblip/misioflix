/* MisioFlix 0.4.22 — a compact layout for ORIGINAL Jellyfin item details (Jellyfin 12.4 DOM verified).
 * Reparents Jellyfin's existing nodes; does not change player, URL handling,
 * series/season links, metadata, playback state, or media files.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_DETAILS_0422__) return;
  window.__MISIOFLIX_DETAILS_0422__ = true;

  const API = '/MisioFlix/api';
  const ID = /^[0-9a-f]{32}$/i;
  let timer = 0;
  let generation = 0;
  let playbackGeneration = 0;
  let lastItem = '';
  let lastPage = null;
  let observer;
  let previousDetailsRoute = '';
  let lastKnownHash = window.location.hash || '#/home';
  const kindRequests = new Map();

  const create = (tag, cls, value) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value !== undefined) el.textContent = String(value);
    return el;
  };
  const compact = id => String(id || '').replace(/-/g,'').toLowerCase();
  const valid = id => ID.test(compact(id));
  const client = () => window.ApiClient || window.ConnectionManager?.getApiClient?.();
  const userId = () => {
    const api = client();
    return typeof api?.getCurrentUserId === 'function' ? api.getCurrentUserId() : '';
  };
  const token = () => {
    const api = client();
    const value = typeof api?.accessToken === 'function' ? api.accessToken() : api?.accessToken;
    return typeof value === 'string' ? value : '';
  };
  function headers() {
    return {Authorization: `MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-details", Version="0.4.22", Token="${token().replace(/["\r\n]/g,'')}"`};
  }
  function itemRoute() {
    const hash = window.location.hash || '';
    if (!/^#\/details(?:\?|$)/i.test(hash)) return '';
    try {
      const id = new URLSearchParams(hash.slice(hash.indexOf('?')+1)).get('id');
      return valid(id) ? compact(id) : '';
    } catch { return ''; }
  }
  function serverId() {
    const api = client();
    const id = typeof api?.serverId === 'function' ? api.serverId() : api?.serverId;
    if (valid(id)) return compact(id);
    try { return compact(new URLSearchParams(window.location.hash.split('?')[1] || '').get('serverId')); }
    catch { return ''; }
  }
  function detailsRoute(id) {
    const s = serverId();
    return '#/details?id=' + encodeURIComponent(compact(id)) + (valid(s)?'&serverId='+encodeURIComponent(s):'');
  }
  // Jellyfin 12.4 may keep an old details DOM during SPA navigation. Prefer the
  // visible page whose *native* item button identifies the requested media.
  // The pasted console snapshot can also contain multiple serialized page trees.
  function activeDetailsPage(id = itemRoute()) {
    const pages = [...document.querySelectorAll('#itemDetailPage')];
    const visible = pages.filter(page => {
      if (!page.isConnected || page.hidden || page.classList.contains('hide')) return false;
      let ancestor = page;
      while (ancestor && ancestor.nodeType === 1) {
        if (ancestor.hidden || ancestor.classList.contains('hide')) return false;
        const style = window.getComputedStyle(ancestor);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        ancestor = ancestor.parentElement;
      }
      return page.getClientRects().length > 0 && !!page.querySelector('.detailPagePrimaryContainer');
    });
    const knownId = page => compact(page.querySelector('.mainDetailButtons .btnPlaystate[data-id]')?.dataset.id ||
      page.querySelector('.mainDetailButtons .btnUserRating[data-id]')?.dataset.id);
    const matching = visible.filter(page => knownId(page) === id);
    if (matching.length) return matching[matching.length - 1];
    // During transitions, do not attach our layout to stale details for another item.
    const waiting = visible.filter(page => !valid(knownId(page)));
    return waiting.length ? waiting[waiting.length - 1] : null;
  }
  // Small, authenticated batch endpoint: classify the actual Jellyfin item
  // by the configured NFO anime root, NOT by overlapping genre names.
  function itemKind(id) {
    id = compact(id);
    if (!valid(id)) return Promise.resolve(null);
    if (!kindRequests.has(id)) {
      const promise = fetch(API + '/overlays?ids=' + encodeURIComponent(id), {
        headers: headers(), cache: 'no-store'
      }).then(response => {
        if (!response.ok) throw new Error('Classification HTTP ' + response.status);
        return response.json();
      }).then(rows => {
        const item = Array.isArray(rows) ? rows.find(row => compact(row.id) === id) : null;
        return item ? (item.anime === true ? 'anime' : 'media') : null;
      }).catch(error => {
        kindRequests.delete(id);
        console.warn('[MisioFlix] Cannot determine source library for genre:', error);
        return null;
      });
      kindRequests.set(id, promise);
    }
    return kindRequests.get(id);
  }
  // The real Jellyfin 12.4 DOM uses /list?genreId= links underneath
  // .itemDetailsGroup. Redirect ONLY genre clicks, not tags/person links.
  async function onGenreClick(event) {
    const link = event.target.closest?.('.itemDetailsGroup a[href*="genreId="]');
    if (!link) return;
    const page = link.closest('#itemDetailPage');
    const id = itemRoute();
    if (!id || !page || activeDetailsPage(id) !== page) return;
    const genre = link.textContent.trim();
    if (!genre) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const kind = await itemKind(id);
    if (!kind || itemRoute() !== id) {
      console.warn('[MisioFlix] Genre navigation deferred: cannot verify anime/media library.');
      return;
    }
    window.location.hash = '#/home?mfSearch=' + encodeURIComponent(kind) +
      '&mfGenre=' + encodeURIComponent(genre);
  }
  function ensureBackButton(page) {
    const container = page.querySelector('.detailPagePrimaryContainer');
    if (!container || container.querySelector(':scope > .mf-detail-back')) return;
    const back = create('button','mf-detail-back','← Wstecz');
    back.type='button';
    back.setAttribute('aria-label','Wróć do poprzedniej strony');
    back.addEventListener('click',() => {
      if (previousDetailsRoute && previousDetailsRoute !== window.location.hash) {
        window.history.back();
      } else {
        window.location.hash='#/home';
      }
    });
    container.prepend(back);
  }
  function nativePlayButton(page, resume = true) {
    const candidates = resume ? ['.btnResume:not(.hide)', '.btnPlay:not(.hide)', '.btnReplay:not(.hide)'] : ['.btnPlay:not(.hide)', '.btnResume:not(.hide)', '.btnReplay:not(.hide)'];
    for (const selector of candidates) {
      const button = page.querySelector('.mainDetailButtons ' + selector);
      if (button && !button.disabled && !button.closest('.hide') && button.getClientRects().length) return button;
    }
    return null;
  }
  // Known-good Jellyfin 12.4 fallback: navigate to the EXACT playable item's
  // details page, then press Jellyfin's real player/resume button after render.
  async function playEpisode(id) {
    if (!valid(id)) return;
    const target = compact(id);
    const playSerial = ++playbackGeneration;
    window.location.hash = detailsRoute(target);
    const start = Date.now();
    while (Date.now() - start < 10000 && playSerial === playbackGeneration) {
      if (itemRoute() !== target) return;
      if (Date.now() - start >= 750) {
        const page = activeDetailsPage(target);
        const button = page && nativePlayButton(page, true);
        if (button) { button.click(); return true; }
      }
      await new Promise(resolve => window.setTimeout(resolve, 140));
    }
    console.warn('[MisioFlix] Nie znaleziono przycisku odtwarzania w szczegółach odcinka.');
    return false;
  }
  // Expose the already verified native-button path to the homepage carousel.
  window.MisioFlixPlayItem = playEpisode;
  async function getItem(id) {
    const api = client();
    const uid = userId();
    if (!valid(id) || !api || !valid(uid)) return null;
    if (typeof api.getItem === 'function') {
      try { return await api.getItem(uid, id); }
      catch (err) { console.warn('[MisioFlix] Item details read failed', err); }
    }
    // For hosts where the legacy API client is exposed without getItem.
    const url = typeof api.getUrl === 'function' ? api.getUrl('Users/'+uid+'/Items/'+id) : '/Users/'+uid+'/Items/'+id;
    const response = await fetch(url, {headers:headers(),cache:'no-store'});
    return response.ok ? response.json() : null;
  }
  async function firstEpisode(seriesId, seasonId = '') {
    const uid = userId();
    if (!valid(uid) || !valid(seriesId) || !token()) return null;
    const query = new URLSearchParams({UserId:compact(uid),IsMissing:'false',EnableUserData:'true',StartIndex:'0',Limit:'120'});
    if (valid(seasonId)) query.set('SeasonId', compact(seasonId));
    const relative = 'Shows/'+compact(seriesId)+'/Episodes?'+query.toString();
    const api = client();
    const url = typeof api?.getUrl === 'function' ? api.getUrl(relative) : '/'+relative;
    const response = await fetch(url,{headers:headers(),cache:'no-store'});
    if (!response.ok) return null;
    const data = await response.json();
    const options = (Array.isArray(data.Items)?data.Items:[]).filter(e => valid(e.Id) && Number(e.IndexNumber)>0);
    options.sort((a,b) => (Number(a.ParentIndexNumber || 0) || 999)-(Number(b.ParentIndexNumber || 0) || 999) || Number(a.IndexNumber)-Number(b.IndexNumber));
    return options[0] || null;
  }
  async function recentEpisode(seriesId, seasonNumber = null) {
    if (!valid(seriesId) || !token()) return null;
    const response = await fetch(API+'/resume',{headers:headers(),cache:'no-store'});
    if (!response.ok) return null;
    const data = await response.json();
    const entries = [...(Array.isArray(data.items)?data.items:[]), ...(Array.isArray(data.hidden)?data.hidden:[])];
    const matching = entries.filter(e => compact(e.catalog_id)===compact(seriesId) && valid(e.id) &&
      (seasonNumber===null || Number(e.season)===Number(seasonNumber)));
    matching.sort((a,b) => (a.next_up?1:0)-(b.next_up?1:0));
    return matching[0] || null;
  }
  function setQuickCard(rail, {id, label, subtitle, image, active, progress}, serial, mode) {
    if (serial !== generation || !rail.isConnected) return;
    const slot = rail.querySelector('.mf-detail-quick-slot');
    if (!slot) return;
    const card = create('button','mf-detail-quick-card');
    card.type='button';
    card.setAttribute('aria-label', label+(subtitle?' — '+subtitle:''));
    const imageUrl = image && valid(id) ? `/Items/${compact(id)}/Images/Primary?maxWidth=360&quality=78` : '';
    if (imageUrl) {
      const picture=create('img','mf-detail-quick-thumb');
      picture.alt=''; picture.loading='lazy';picture.src=imageUrl;
      picture.addEventListener('error',()=>{picture.remove();card.classList.add('mf-detail-quick-no-thumb');},{once:true});
      card.appendChild(picture);
    }
    const body=create('span','mf-detail-quick-text');
    body.append(create('span','mf-detail-quick-label',label),create('span','mf-detail-quick-subtitle',subtitle||''));
    if (progress>0) {
      const bar=create('span','mf-detail-quick-progress');
      const fill=create('span','mf-detail-quick-progress-fill');
      fill.style.width=Math.max(0,Math.min(100,Number(progress)))+'%';
      bar.append(fill);body.append(bar);
    }
    const play=create('span','mf-detail-quick-icon','▶');play.setAttribute('aria-hidden','true');
    card.append(body,play);
    card.addEventListener('click',()=>{
      if (mode==='native') {
        const button = nativePlayButton(activeDetailsPage(itemRoute()),active);
        if (button) button.click();
      } else { void playEpisode(id); }
    });
    slot.replaceChildren(card);
  }
  async function loadQuick(page, itemId, rail, serial) {
    const slot=rail.querySelector('.mf-detail-quick-slot');
    if (!slot || serial!==generation) return;
    slot.replaceChildren(create('span','mf-detail-loading','Wczytywanie odcinka…'));
    let item;
    try { item=await getItem(itemId); }
    catch (error) { console.warn('[MisioFlix] Detail metadata unavailable',error); }
    if (serial!==generation || !rail.isConnected) return;
    const type=String(item?.Type||'');
    page.dataset.mfDetailType = type;
    if (type && !['Movie','Episode','Series','Season'].includes(type)) { restoreLayout(page); return; }
    if (type==='Movie' || type==='Episode') {
      const ticks=Number(item?.UserData?.PlaybackPositionTicks)||0;
      setQuickCard(rail,{id:itemId,label:ticks>0?'Wznów oglądanie':'Odtwórz',subtitle: type==='Episode' ? `S${item.ParentIndexNumber||'?'}:E${item.IndexNumber||'?'}` : 'Film',active:ticks>0},serial,'native');
      return;
    }
    if (type!=='Series' && type!=='Season') {slot.replaceChildren();return;}
    const seriesId=type==='Series'?itemId:compact(item?.SeriesId);
    if (!valid(seriesId)) {slot.replaceChildren();return;}
    const seasonNo=type==='Season'?item?.IndexNumber:null;
    try {
      const recent=await recentEpisode(seriesId,seasonNo);
      if (serial!==generation || !rail.isConnected)return;
      if (recent) {
        const text=recent.season!=null&&recent.episode!=null ? `S${recent.season}:E${recent.episode}` : 'Odcinek';
        const continuing=!recent.next_up && Number(recent.position_ticks)>0;
        setQuickCard(rail,{id:recent.id,label:continuing?'Kontynuuj oglądanie':'Oglądaj następny odcinek',subtitle:text,active:continuing,progress:continuing?recent.progress_percent:0,image:true},serial,'episode');
        page.classList.add('mf-detail-has-quick-episode');
        return;
      }
    } catch(error) {console.warn('[MisioFlix] Could not load current episode',error);}
    try {
      const first=await firstEpisode(seriesId,type==='Season'?itemId:'');
      if (serial!==generation || !rail.isConnected)return;
      if (first) {
        const subtitle=`S${first.ParentIndexNumber??'?'}:E${first.IndexNumber??'?'}`;
        setQuickCard(rail,{id:first.Id,label:'Oglądaj pierwszy odcinek',subtitle,image:true,active:false},serial,'episode');
        page.classList.add('mf-detail-has-quick-episode');
        return;
      }
    } catch(error) {console.warn('[MisioFlix] Could not load first episode',error);}
    slot.replaceChildren();
  }

  const savedLocations=new WeakMap();
  function relocate(element, destination){
    if (!element || !element.parentNode) return;
    const marker=document.createComment('MisioFlix original position');
    element.parentNode.insertBefore(marker,element);
    savedLocations.get(destination.closest('#itemDetailPage'))?.push([element,marker]);
    destination.appendChild(element);
  }
  function restoreLayout(page){
    const moves=savedLocations.get(page);
    if(moves){
      for(const [element,marker] of moves.slice().reverse())if(marker.isConnected)marker.replaceWith(element);
    }
    savedLocations.delete(page);
    page.querySelector('.mf-detail-back')?.remove();
    page.querySelector('.mf-detail-cast-button')?.remove();
    page.querySelector('.mf-detail-cast-panel')?.remove();
    page.querySelector(':scope .mf-detail-grid')?.remove();
    page.classList.remove('mf-detail-compact','mf-detail-has-quick-episode');
    page.removeAttribute('data-mf-detail-type');
    page.removeAttribute('data-mf-detail-id');
  }
  function ensureLayout(page) {
    const container=page.querySelector('.detailPagePrimaryContainer');
    const secondary=page.querySelector('.detailPageSecondaryContainer');
    if (!container || !secondary) return null;
    const existing=container.querySelector(':scope > .mf-detail-grid');
    if (existing) return existing;
    const image=container.querySelector(':scope > .detailImageContainer');
    const ribbon=container.querySelector(':scope > .detailRibbon');
    const main=container.querySelector(':scope > .detailPagePrimaryContent');
    if (!image || !ribbon || !main) return null;

    savedLocations.set(page,[]);
    const grid=create('div','mf-detail-grid');
    const rail=create('aside','mf-detail-poster-rail');
    const content=create('div','mf-detail-main');
    const quick=create('div','mf-detail-quick-slot');
    quick.setAttribute('aria-label','Oglądaj lub kontynuuj');
    // Place the layout shell before moving Jellyfin's native elements.
    container.append(grid);
    grid.append(rail,content);
    relocate(image,rail);
    rail.appendChild(quick);
    relocate(ribbon,content);
    relocate(main,content);
    const nav=create('div','mf-detail-series-sections');
    content.append(nav);
    for(const selector of [
      '#childrenCollapsible','#listChildrenCollapsible','#specialsCollapsible',
      '.moreFromSeasonSection','#additionalPartsCollapsible'
    ]){
      const element=page.querySelector(selector);
      if (element) relocate(element,nav);
    }
    const meta=main.querySelector('.itemDetailsGroup');
    if (meta) {
      const castButton=create('button','mf-detail-cast-button','Obsada');
      castButton.type='button';
      castButton.setAttribute('aria-expanded','false');
      const castPanel=create('section','mf-detail-cast-panel');
      castPanel.hidden=true;
      castButton.addEventListener('click',()=>{
        const expand=castPanel.hidden;
        castPanel.hidden=!expand;
        castButton.setAttribute('aria-expanded',String(expand));
      });
      meta.after(castButton,castPanel);
      for (const selector of ['#castCollapsible','#guestCastCollapsible']) {
        const element=page.querySelector(selector);
        if (element) relocate(element,castPanel);
      }
      syncCastButton(page);
    }
    page.classList.add('mf-detail-compact');
    return grid;
  }
  // Jellyfin leaves #castCollapsible/.hide in the DOM even when no people exist.
  // Keep the button hidden until the existing native cast cards become available.
  function syncCastButton(page) {
    const button = page.querySelector('.mf-detail-cast-button');
    const panel = page.querySelector('.mf-detail-cast-panel');
    if (!button || !panel) return;
    const available = [...panel.children].some(section =>
      !section.classList.contains('hide') &&
      !!section.querySelector('.itemsContainer .card, .itemsContainer .cardBox, .itemsContainer [data-id]'));
    button.hidden = !available;
    if (!available) {
      panel.hidden = true;
      button.setAttribute('aria-expanded','false');
    }
  }
  function clampSimilar(page){
    const list=page.querySelector('#similarCollapsible .similarContent');
    if (!list) return;
    for (const [index,card] of [...list.children].entries()) {
      card.classList.toggle('mf-detail-similar-extra',index>=5);
      if(index>=5)card.setAttribute('aria-hidden','true');
      else card.removeAttribute('aria-hidden');
    }
  }
  function update() {
    const id=itemRoute();
    const page=activeDetailsPage(id);
    if (!id || !page) return;
    const grid=ensureLayout(page);
    if (!grid) return;
    ensureBackButton(page);
    clampSimilar(page);
    syncCastButton(page);
    if (id===lastItem && page===lastPage) return;
    lastItem=id;lastPage=page;
    const serial=++generation;
    void itemKind(id);
    page.dataset.mfDetailId=id;
    page.classList.remove('mf-detail-has-quick-episode');
    page.querySelector('.mf-detail-quick-slot')?.replaceChildren();
    const panel=page.querySelector('.mf-detail-cast-panel');
    if(panel)panel.hidden=true;
    page.querySelector('.mf-detail-cast-button')?.setAttribute('aria-expanded','false');
    void loadQuick(page,id,grid.querySelector('.mf-detail-poster-rail'),serial);
  }
  function schedule() {
    if(timer) return;
    timer=window.setTimeout(()=>{timer=0;update();},160);
  }
  function init() {
    schedule();
    observer=new MutationObserver(changes=>{
      // Ignore image/style/class changes to avoid observer-triggered re-layout.
      if(changes.some(change=>change.type==='childList'))schedule();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    // Capture before the native delegated Jellyfin router handles genre links.
    document.addEventListener('click',onGenreClick,true);
    for(const name of ['hashchange','pageshow','popstate']) window.addEventListener(name,()=>{
      const next = window.location.hash || '#/home';
      if (/^#\/details(?:\?|$)/i.test(next) && next !== lastKnownHash &&
          /^#\//.test(lastKnownHash)) previousDetailsRoute=lastKnownHash;
      lastKnownHash=next;
      if(itemRoute()!==lastItem)generation++;
      schedule();
    });
    document.addEventListener('viewshow',schedule);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
