/* MisioFlix 0.4.68 — non-reparenting details + independently anchored poster panel.
 * The native image, ribbon, metadata and secondary sections stay in place;
 * a CSS grid and a few owned nodes create the approved presentation.
 * The native player, item ID, user status, URL and media files stay untouched.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_DETAILS_0423__) return;
  window.__MISIOFLIX_DETAILS_0423__ = true;

  const API = '/MisioFlix/api';
  const ID = /^[0-9a-f]{32}$/i;
  let timer = 0;
  let generation = 0;
  let playbackGeneration = 0;
  let lastItem = '';
  let lastPage = null;
  let observer;
  const kindRequests = new Map();
  const nfoOverlayCache = new Map();
  // Native metadata editor runs on original Jellyfin node hierarchy.
  // CSS-only arrangement leaves the hierarchy unchanged even on editor clicks.
  let nativeEditSuspended = false;
  let nativeEditItem = '';
  let nativeEditDialogSeen = false;
  let nativeEditObserver = null;
  // Geometry is applied to MisioFlix-owned UI only. Never detach/reparent
  // Jellyfin's poster, sliders, cards, sections or player to arrange the rail.
  let railResizeObserver = null;
  let trackedRailPage = null;
  let trackedRailImage = null;
  let trackedRailElement = null;
  let railFrame = 0;

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
    return {Authorization: `MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-details", Version="0.4.23", Token="${token().replace(/["\r\n]/g,'')}"`};
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
        if (item) nfoOverlayCache.set(id, item);
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
  // Jellyfin's detail page scrolls inside its own SPA container, not always
  // document.scrollingElement. Reset the actual scroll panes on navigation.
  function resetDetailScroll() {
    try { window.scrollTo(0, 0); } catch { /* embedded webviews */ }
    const nodes = [document.scrollingElement, ...document.querySelectorAll(
      '#itemDetailPage, .mainAnimatedPages, .mainScrollFrame, .page.scrollY, .page.scrollable, .mainDrawerScrollContainer')];
    for (const node of nodes) {
      if (!node) continue;
      try { node.scrollTop = 0; } catch { /* detached view */ }
    }
  }
  function navigateTop(route) {
    window.location.hash = route;
    resetDetailScroll();
    // Jellyfin can restore an old scroll offset after the hash transition.
    for (const delay of [0, 120, 320]) {
      window.setTimeout(() => {
        if (window.location.hash === route) resetDetailScroll();
      }, delay);
    }
  }
  function openDetails(id) {
    if (valid(id)) navigateTop(detailsRoute(id));
  }
  // Deterministic, one-level navigation for ALL supported detail types.
  // No browser history: Episode -> Season -> Series -> MisioFlix home;
  // Movie / Series -> MisioFlix home.
  function ensureBackButton(page) {
    const container=page.querySelector('.detailPageWrapperContainer');
    if(!container || container.querySelector(':scope > .mf-detail-back'))return;
    const back=create('button','mf-detail-back','← Wstecz');
    back.type='button';
    back.setAttribute('aria-label','Wróć poziom wyżej');
    back.addEventListener('click',()=>{
      // Resolve from the current item's own DTO, not the previous hash.
      const type=page.dataset.mfDetailType;
      const parentSeries=page.dataset.mfDetailSeriesId;
      const parentSeason=page.dataset.mfDetailSeasonId;
      if(type==='Episode' && valid(parentSeason)){
        openDetails(parentSeason);return;
      }
      if((type==='Season'||type==='Episode') && valid(parentSeries)){
        openDetails(parentSeries);return;
      }
      navigateTop('#/home');
    });
    container.prepend(back);
  }
  function clearAnimeSeasonControls(page) {
    page.classList.remove('mf-detail-anime-season');
    page.querySelector('.mf-detail-anime-breadcrumb')?.remove();
    page.querySelector('.mf-detail-season-nav')?.remove();
  }
  // Only Jellyfin's actual child seasons are listed: never join productions
  // based on titles. This uses the same authenticated Shows endpoint as the
  // native episode reader and does not replace/reparent a Jellyfin element.
  async function getSeriesSeasons(seriesId) {
    const uid=userId();
    if (!valid(uid) || !valid(seriesId) || !token()) return [];
    const api=client();
    const q=new URLSearchParams({UserId:compact(uid),IsMissing:'false'});
    const relative='Shows/'+compact(seriesId)+'/Seasons?'+q.toString();
    const url=typeof api?.getUrl==='function' ? api.getUrl(relative) : '/'+relative;
    const response=await fetch(url,{headers:headers(),cache:'no-store'});
    if(!response.ok) throw new Error('Seasons HTTP '+response.status);
    const data=await response.json();
    const rows=(Array.isArray(data.Items)?data.Items:[])
      .filter(x => valid(x?.Id) && (!x?.Type || x.Type==='Season'));
    // An unnumbered season is listed by its real name, not a fabricated Sxx.
    rows.sort((a,b)=>{
      const na=Number(a.IndexNumber),nb=Number(b.IndexNumber);
      const aa=a.IndexNumber!=null&&Number.isInteger(na)&&na>=0;
      const bb=b.IndexNumber!=null&&Number.isInteger(nb)&&nb>=0;
      return (aa?na:99999)-(bb?nb:99999) || String(a.Name||'').localeCompare(String(b.Name||''),'pl');
    });
    return rows;
  }
  function seasonButtonLabel(season) {
    const raw=season?.IndexNumber;
    const number=Number(raw);
    return raw!=null && Number.isInteger(number) && number>=0
      ? 'S'+String(number).padStart(2,'0') : String(season?.Name||'Sezon');
  }
  // Season navigation works for anime AND ordinary TV series. The breadcrumb
  // ANIME > Season remains anime-only. No native DOM reparenting.
  async function syncAnimeDetailsControls(page,item,id,serial) {
    const type=String(item?.Type||'');
    const rawSeriesId=valid(item?.SeriesId)?item.SeriesId
      :type==='Season' && valid(item?.ParentId)?item.ParentId:'';
    page.dataset.mfDetailSeriesId=valid(rawSeriesId)?compact(rawSeriesId):'';
    page.dataset.mfDetailSeasonId=valid(item?.SeasonId)?compact(item.SeasonId)
      :type==='Episode' && valid(item?.ParentId)?compact(item.ParentId):'';
    clearAnimeSeasonControls(page);
    // Season switcher must not wait for potentially slow NFO classification.
    if(type==='Season' && valid(rawSeriesId) && compact(rawSeriesId)!==id){
      const seriesId=compact(rawSeriesId);
      const primary=page.querySelector('.detailPagePrimaryContainer > .detailPagePrimaryContent');
      if(primary){
        const nav=create('nav','mf-detail-season-nav');
        nav.setAttribute('aria-label','Wybierz sezon serialu');
        const row=create('div','mf-detail-season-buttons');
        row.append(create('span','mf-detail-season-loading','Ładowanie sezonów…'));
        nav.append(row);
        // Jellyfin 12.4: #listChildrenCollapsible contains #childrenContent.
        // It is nested inside .detailSection, NOT a sibling of primaryContent.
        // Insert directly BEFORE this native episode section; never append to
        // primaryContent (that placed our buttons AFTER all episodes).
        const episodes=page.querySelector('#listChildrenCollapsible');
        const episodeAnchor=episodes || page.querySelector('#childrenContent');
        if(!episodeAnchor?.parentNode){
          // Delay retry while native Jellyfin fills the episode container.
          // Never append after the episodes, or prevent the anime breadcrumb.
          window.setTimeout(() => {
            if (serial !== generation || itemRoute() !== id || !page.isConnected) return;
            const ready = page.querySelector('#listChildrenCollapsible') || page.querySelector('#childrenContent');
            if (ready?.parentNode && !nav.isConnected) ready.parentNode.insertBefore(nav, ready);
          }, 400);
        } else episodeAnchor.parentNode.insertBefore(nav,episodeAnchor);
        try{
          const seasons=await getSeriesSeasons(seriesId);
          if(serial!==generation || itemRoute()!==id || !page.isConnected)return;
          row.replaceChildren();
          for(const season of seasons){
            const sid=compact(season.Id);
            const button=create('button','mf-detail-season-switch',seasonButtonLabel(season));
            button.type='button';
            const active=sid===id;
            button.classList.toggle('mf-detail-season-active',active);
            if(active){button.setAttribute('aria-current','page');button.disabled=true;}
            const label=String(season.Name||'Sezon');
            button.title=label;
            button.setAttribute('aria-label',seasonButtonLabel(season)+' — '+label+(active?' (obecny)':''));
            if(!active)button.addEventListener('click',()=>openDetails(sid));
            row.append(button);
          }
          if(!seasons.length)nav.remove();
        }catch(error){
          console.warn('[MisioFlix] Nie można pobrać sezonów serialu:',error);
          if(nav.isConnected)nav.remove();
        }
      }
    }
    const kind=await itemKind(id);
    if(serial!==generation || itemRoute()!==id || !page.isConnected)return;
    const anime=kind==='anime';
    page.dataset.mfAnimeDetails=anime?'1':'0';
    if(!anime || type!=='Season' || !valid(rawSeriesId))return;
    const seriesId=compact(rawSeriesId);
    if(seriesId===id)return;
    page.classList.add('mf-detail-anime-season');
    const ribbon=page.querySelector('.detailPagePrimaryContainer > .detailRibbon');
    const info=ribbon?.querySelector('.infoWrapper');
    if(info){
      const crumb=create('div','mf-detail-anime-breadcrumb');
      crumb.setAttribute('aria-label','Położenie w anime');
      const parent=create('button','mf-detail-anime-parent','ANIME');
      parent.type='button';
      parent.setAttribute('aria-label','Otwórz szczegóły całego anime');
      parent.addEventListener('click',()=>openDetails(seriesId));
      const separator=create('span','mf-detail-anime-separator','›');
      separator.setAttribute('aria-hidden','true');
      // The authoritative type is <tag>Typ: ...</tag> in this season.nfo.
      // The authenticated, bounded overlay API already reads that NFO.
      const seasonType = String(nfoOverlayCache.get(id)?.format || '').trim();
      let seasonName = String(item.Name || 'Sezon');
      if (seasonType && !seasonName.toLocaleLowerCase('pl').endsWith(('('+seasonType+')').toLocaleLowerCase('pl')))
        seasonName += ' (' + seasonType + ')';
      const name=create('span','mf-detail-anime-season-title',seasonName);
      crumb.append(parent,separator,name);
      info.prepend(crumb);
    }
  }
  function nativePlayButton(page, resume = true) {
    const candidates = resume ? ['.btnResume:not(.hide)', '.btnPlay:not(.hide)', '.btnReplay:not(.hide)'] : ['.btnPlay:not(.hide)', '.btnResume:not(.hide)', '.btnReplay:not(.hide)'];
    for (const selector of candidates) {
      const button = page.querySelector('.mainDetailButtons ' + selector);
      if (button && !button.disabled && !button.closest('.hide') && button.getClientRects().length) return button;
    }
    return null;
  }
  // v0.4.140: single, default playback path for Home resume and episode
  // clicks. No hidden shortcut proxies and no unconditional delay.
  // The exact playable ID and current hash must match before a native click.
  async function playEpisode(id) {
    if (!valid(id)) return false;
    const target = compact(id);
    const playSerial = ++playbackGeneration;
    const oldPage = activeDetailsPage();
    if (itemRoute() !== target) window.location.hash = detailsRoute(target);
    const start = Date.now();
    while (Date.now() - start < 10000 && playSerial === playbackGeneration) {
      if (itemRoute() !== target) return false;
      const page = activeDetailsPage(target);
      const button = page && nativePlayButton(page, true);
      // Jellyfin reuses SPA details DOM. Never click the previous title's
      // native play control even when it is still visible during navigation.
      const nativeId = compact(page?.querySelector('.mainDetailButtons .btnPlaystate[data-id]')?.dataset.id ||
        page?.querySelector('.mainDetailButtons .btnUserRating[data-id]')?.dataset.id || '');
      // When Jellyfin has not stamped the native item ID yet, require a
      // newly mounted page. Reused/old SPA DOM must never start the wrong item.
      if (button && (nativeId === target || (!valid(nativeId) && page !== oldPage))) {
        button.click();
        return true;
      }
      await new Promise(resolve => window.setTimeout(resolve, 60));
    }
    console.warn('[MisioFlix] Nie znaleziono gotowego przycisku odtwarzania dla właściwego tytułu.');
    return false;
  }
  // Expose the already verified native-button path to the homepage carousel.
  window.MisioFlixPlayItem = playEpisode;
  // Home still uses the native Play/Resume handoff when the details layout is off.
  if (document.currentScript?.getAttribute('data-mf-playback-only') === 'true') return;
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
  // v0.4.98: BoxSet poster preview is display-only. It does not upload an
  // image, modify a BoxSet or move any Jellyfin-owned DOM node.
  async function showCollectionDetailPreview(page,item,id,serial){
    if(String(item?.Type)!=='BoxSet' || item?.ImageTags?.Primary || item?.PrimaryImageTag)return;
    const uid=userId(),activeToken=token();
    if(!valid(uid)||!activeToken || !valid(id))return;
    const container=page.querySelector('.detailPagePrimaryContainer > .detailImageContainer');
    const host=container?.querySelector('.cardImageContainer')||container;
    if(!host || host.querySelector(':scope > .mf-detail-collection-preview'))return;
    const query=new URLSearchParams({ParentId:id,Recursive:'false',StartIndex:'0',Limit:'32',
      EnableImages:'true',ImageTypeLimit:'1',EnableUserData:'false'});
    const api=client();
    const relative='Users/'+compact(uid)+'/Items?'+query;
    const url=typeof api?.getUrl==='function'?api.getUrl(relative):'/'+relative;
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(url,{headers:headers(),signal:controller.signal});
      if(!response.ok)return;
      const data=await response.json();
      if(serial!==generation || itemRoute()!==id || !page.isConnected || token()!==activeToken)return;
      const ids=(Array.isArray(data.Items)?data.Items:[])
        .filter(row=>valid(row?.Id)&&row?.ImageTags?.Primary)
        .slice(0,4).map(row=>compact(row.Id));
      if(!ids.length)return;
      const poster=create('div','mf-detail-collection-preview');
      poster.setAttribute('aria-hidden','true');
      ids.forEach(childId=>{
        const img=create('img');
        img.loading='lazy';img.decoding='async';img.alt='';
        img.src='/Items/'+encodeURIComponent(childId)+'/Images/Primary?maxHeight=480&quality=82';
        img.addEventListener('error',()=>{
          img.remove();
          if(!poster.childElementCount){
            poster.remove();host.classList.remove('mf-detail-collection-preview-host');
          }else poster.dataset.count=String(poster.childElementCount);
        },{once:true});
        poster.append(img);
      });
      poster.dataset.count=String(poster.childElementCount);
      host.classList.add('mf-detail-collection-preview-host');
      host.append(poster);
    }catch{
      // Native placeholder remains on network or authorization failures.
    }finally{window.clearTimeout(timeout);}
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
    void syncAnimeDetailsControls(page,item,itemId,serial);
    if (type && !['Movie','Episode','Series','Season'].includes(type)) {
      restoreLayout(page);
      // A collection is otherwise untouched except for its title and a
      // read-only visual preview if Jellyfin has no native Primary image.
      if (type==='BoxSet'){
        page.classList.add('mf-detail-collection-title-small');
        void showCollectionDetailPreview(page,item,itemId,serial);
      }
      return;
    }
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

  // The primary details and the native sections have independent heights.
  // A single CSS grid row cannot keep the left rail immediately below the
  // poster while the right column contains arbitrarily tall seasons/episodes.
  // Anchor ONLY our own rail to the image's actual measured bottom; leave
  // Jellyfin-owned nodes in their original DOM positions for the native editor.
  function positionPosterRail(page) {
    if (!page?.isConnected || !page.classList.contains('mf-detail-compact')) return;
    const wrapper=page.querySelector('.detailPageWrapperContainer.mf-detail-grid');
    const image=page.querySelector('.detailPagePrimaryContainer > .detailImageContainer');
    const rail=page.querySelector('.detailPagePrimaryContainer > .mf-detail-poster-rail');
    if (!wrapper || !image || !rail) return;
    if (window.matchMedia?.('(max-width:850px)').matches) {
      wrapper.classList.remove('mf-detail-rail-anchored');
      for (const name of ['--mf-rail-x','--mf-rail-y','--mf-rail-width','--mf-rail-min-height'])
        wrapper.style.removeProperty(name);
      return;
    }
    const frame=wrapper.getBoundingClientRect();
    const poster=image.getBoundingClientRect();
    if (poster.width < 40 || poster.height < 40) return;
    const x=poster.left-frame.left;
    const y=poster.bottom-frame.top+14;
    // Anchor under the real poster, including asymmetric art and window zoom.
    wrapper.style.setProperty('--mf-rail-x',x.toFixed(2)+'px');
    wrapper.style.setProperty('--mf-rail-y',y.toFixed(2)+'px');
    wrapper.style.setProperty('--mf-rail-width',poster.width.toFixed(2)+'px');
    wrapper.classList.add('mf-detail-rail-anchored');
    // The rail is out of flow on desktop. Reserve enough vertical space if
    // a film has no collections/similar, or if the MAL/Simkl editor expands.
    const railHeight=rail.getBoundingClientRect().height;
    wrapper.style.setProperty('--mf-rail-min-height',Math.ceil(y+railHeight+24)+'px');
  }
  function queueRailPosition(page) {
    if (railFrame || !page) return;
    railFrame=window.requestAnimationFrame(()=>{
      railFrame=0;
      if (page.isConnected) positionPosterRail(page);
    });
  }
  function watchPosterRail(page) {
    const image=page.querySelector('.detailPagePrimaryContainer > .detailImageContainer');
    const rail=page.querySelector('.detailPagePrimaryContainer > .mf-detail-poster-rail');
    if (!image || !rail) return;
    if (trackedRailPage===page && trackedRailImage===image && trackedRailElement===rail) return;
    railResizeObserver?.disconnect();railResizeObserver=null;
    trackedRailPage=page;trackedRailImage=image;trackedRailElement=rail;
    if (typeof ResizeObserver==='function') {
      railResizeObserver=new ResizeObserver(()=>queueRailPosition(page));
      railResizeObserver.observe(image);
      railResizeObserver.observe(rail);
    }
  }
  function stopPosterRail(page) {
    if (trackedRailPage===page) {
      railResizeObserver?.disconnect();railResizeObserver=null;
      trackedRailPage=null;trackedRailImage=null;trackedRailElement=null;
      if (railFrame) {window.cancelAnimationFrame(railFrame);railFrame=0;}
    }
    const wrapper=page?.querySelector('.detailPageWrapperContainer.mf-detail-grid');
    if (wrapper) {
      wrapper.classList.remove('mf-detail-rail-anchored');
      for (const name of ['--mf-rail-x','--mf-rail-y','--mf-rail-width','--mf-rail-min-height'])
        wrapper.style.removeProperty(name);
    }
  }

  // v0.4.67: NEVER reparent a Jellyfin-owned node. Its older webcomponents
  // run attachedCallback/detachedCallback when an existing subtree is moved,
  // including a broken addScrollEventListener callback in Jellyfin 12.4.
  // Keep image, ribbon, content, seasons and cast in their ORIGINAL parents;
  // CSS grid lays them out without triggering any legacy component lifecycle.
  function restoreLayout(page){
    if(!page) return;
    stopPosterRail(page);
    page.querySelector('.mf-detail-back')?.remove();
    page.querySelector('.mf-detail-poster-rail')?.remove();
    page.querySelector('.mf-detail-cast-button')?.remove();
    page.querySelector('.mf-detail-cast-panel')?.remove();
    for(const collage of page.querySelectorAll('.mf-detail-collection-preview')){
      collage.parentElement?.classList.remove('mf-detail-collection-preview-host');
      collage.remove();
    }
    clearAnimeSeasonControls(page);
    const wrapper=page.querySelector('.detailPageWrapperContainer');
    wrapper?.classList.remove('mf-detail-grid');
    page.querySelector('.detailPageSecondaryContainer')?.classList.remove('mf-detail-series-sections');
    page.classList.remove('mf-detail-compact','mf-detail-has-quick-episode','mf-detail-cast-expanded','mf-detail-collection-title-small');
    page.removeAttribute('data-mf-detail-type');
    page.removeAttribute('data-mf-anime-details');
    page.removeAttribute('data-mf-detail-series-id');
    page.removeAttribute('data-mf-detail-season-id');
    page.removeAttribute('data-mf-detail-id');
  }
  function ensureLayout(page) {
    const wrapper=page.querySelector('.detailPageWrapperContainer');
    const container=page.querySelector('.detailPagePrimaryContainer');
    const secondary=page.querySelector('.detailPageSecondaryContainer');
    if (!wrapper || !container || !secondary || !wrapper.contains(secondary)) return null;
    // Same native nodes as the approved compact layout. We only add our own
    // small rail/controls and CSS classes; no appendChild of Jellyfin nodes.
    const image=container.querySelector(':scope > .detailImageContainer');
    const ribbon=container.querySelector(':scope > .detailRibbon');
    const main=container.querySelector(':scope > .detailPagePrimaryContent');
    if (!image || !ribbon || !main) return null;
    let rail=container.querySelector(':scope > .mf-detail-poster-rail');
    if (!rail) {
      rail=create('aside','mf-detail-poster-rail');
      const quick=create('div','mf-detail-quick-slot');
      quick.setAttribute('aria-label','Oglądaj lub kontynuuj');
      rail.append(quick);
      container.append(rail);
    }
    // The secondary container holds the original seasons/episodes/cast. MAL
    // and Simkl already use .mf-detail-series-sections to discover them.
    secondary.classList.add('mf-detail-series-sections');
    wrapper.classList.add('mf-detail-grid');
    const meta=main.querySelector('.itemDetailsGroup');
    if (meta && !main.querySelector('.mf-detail-cast-button')) {
      const castButton=create('button','mf-detail-cast-button','Obsada');
      castButton.type='button';
      castButton.setAttribute('aria-expanded','false');
      const castPanel=create('section','mf-detail-cast-panel');
      castPanel.hidden=true;
      castButton.addEventListener('click',()=>{
        const expand=!page.classList.contains('mf-detail-cast-expanded');
        page.classList.toggle('mf-detail-cast-expanded',expand);
        castPanel.hidden=!expand;
        castButton.setAttribute('aria-expanded',String(expand));
      });
      meta.after(castButton,castPanel);
    }
    page.classList.add('mf-detail-compact');
    return wrapper;
  }
  // Jellyfin leaves #castCollapsible/.hide in the DOM even when no people exist.
  // Keep the button hidden until the existing native cast cards become available.
  function syncCastButton(page) {
    const button=page.querySelector('.mf-detail-cast-button');
    const panel=page.querySelector('.mf-detail-cast-panel');
    if(!button || !panel) return;
    const sections=['#castCollapsible','#guestCastCollapsible']
      .map(selector=>page.querySelector(selector)).filter(Boolean);
    const available=sections.some(section =>
      !section.classList.contains('hide') &&
      !!section.querySelector('.itemsContainer .card, .itemsContainer .cardBox, .itemsContainer [data-id]'));
    button.hidden=!available;
    if(!available){
      page.classList.remove('mf-detail-cast-expanded');
      panel.hidden=true;
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
    // Do not move React/Jellyfin-owned detail nodes while its native editor
    // asynchronously creates and owns a modal dialog.
    if(nativeEditSuspended) return;
    const id=itemRoute();
    const page=id?activeDetailsPage(id):null;
    if(lastPage && (!id || (page && lastPage!==page))){
      restoreLayout(lastPage);
      lastPage=null;lastItem='';generation++;
    }
    if (!id || !page) return;
    const grid=ensureLayout(page);
    if (!grid) return;
    watchPosterRail(page);
    positionPosterRail(page);
    ensureBackButton(page);
    clampSimilar(page);
    syncCastButton(page);
    if (id===lastItem && page===lastPage) return;
    lastItem=id;lastPage=page;
    const serial=++generation;
    void itemKind(id);
    page.dataset.mfDetailId=id;
    page.classList.remove('mf-detail-has-quick-episode');
    page.removeAttribute('data-mf-anime-details');
    page.removeAttribute('data-mf-detail-series-id');
    page.removeAttribute('data-mf-detail-season-id');
    clearAnimeSeasonControls(page);
    page.querySelector('.mf-detail-quick-slot')?.replaceChildren();
    const panel=page.querySelector('.mf-detail-cast-panel');
    if(panel)panel.hidden=true;
    page.classList.remove('mf-detail-cast-expanded');
    page.querySelector('.mf-detail-cast-button')?.setAttribute('aria-expanded','false');
    void loadQuick(page,id,grid.querySelector('.mf-detail-poster-rail'),serial);
  }
  // v0.4.67: the native editor must open WITHOUT a second disconnection
  // of Jellyfin's own DOM. Nothing to restore: the layout is now CSS-only.
  // Only temporarily suspend our observers while the dialog is in use.
  function nativeMetadataDialogVisible() {
    return [...document.querySelectorAll('.editItemMetadataForm')]
      .some(form => form.isConnected && form.getClientRects().length > 0);
  }
  function nativeMetadataDialogExists() {
    return !!document.querySelector('.editItemMetadataForm');
  }
  function finishNativeMetadataEdit() {
    if(!nativeEditSuspended)return;
    nativeEditSuspended=false;
    nativeEditObserver?.disconnect?.();nativeEditObserver=null;
    nativeEditDialogSeen=false;nativeEditItem='';
    schedule();
  }
  function isNativeEditMetadataMenuItem(target) {
    if (!target || typeof target.closest !== 'function') return false;
    const item=target.closest('.actionSheetMenuItem, [role="menuitem"], .MuiMenuItem-root');
    if (!item || !item.getClientRects().length) return false;
    const command=item.getAttribute?.('data-id') || item.dataset?.id || '';
    if (command) return command === 'edit';
    const label=String(item.textContent || '').replace(/\s+/g,' ').trim();
    return /^(?:edytuj metadane|edit metadata)$/i.test(label);
  }
  function recoverNativeMetadataEdit(event) {
    const id=itemRoute();
    if(!id || nativeEditSuspended || !isNativeEditMetadataMenuItem(event.target))return;
    nativeEditSuspended=true;
    nativeEditItem=id;
    nativeEditDialogSeen=nativeMetadataDialogVisible();
    const initialHash=window.location.hash;
    nativeEditObserver=new MutationObserver(()=>{
      if(!nativeEditSuspended)return;
      if(itemRoute()!==nativeEditItem){finishNativeMetadataEdit();return;}
      if(nativeMetadataDialogVisible())nativeEditDialogSeen=true;
      if(nativeEditDialogSeen && !nativeMetadataDialogExists())finishNativeMetadataEdit();
    });
    nativeEditObserver.observe(document.body,{childList:true,subtree:true});
    window.setTimeout(()=>{
      if(!nativeEditSuspended)return;
      if(window.location.hash!==initialHash || itemRoute()!==id){finishNativeMetadataEdit();return;}
      if(nativeMetadataDialogVisible()){nativeEditDialogSeen=true;return;}
      console.warn('[MisioFlix] Native per-title metadata editor has not opened. Check the first Jellyfin error in DevTools Console.');
      finishNativeMetadataEdit();
    },8000);
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
    // Remove only our own layout elements before another route appears.
    // All native nodes are already in their original parent containers.
    document.addEventListener('click',event=>{
      if(!lastPage || !lastPage.isConnected)return;
      const link=event.target.closest?.('a[href]');
      const href=link?.getAttribute('href')||'';
      if(href.startsWith('#/') && !/^#\/details(?:\?|$)/i.test(href)){
        restoreLayout(lastPage);lastPage=null;lastItem='';generation++;
      }
    },true);
    // Capture before the native delegated Jellyfin router handles genre links.
    document.addEventListener('click',onGenreClick,true);
    document.addEventListener('click',recoverNativeMetadataEdit,true);
    for(const name of ['hashchange','pageshow','popstate']) window.addEventListener(name,()=>{
      if(itemRoute()!==lastItem)generation++;
      schedule();
    });
    document.addEventListener('viewshow',schedule);
    window.addEventListener('resize',()=>{
      if(lastPage?.isConnected) queueRailPosition(lastPage);
    },{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
