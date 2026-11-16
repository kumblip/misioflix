/* MisioFlix Native 0.4.84 — restore real artwork and MisioFlix decoration on loaded cards.
 * Inspired by the single infinite-scroll approach in KefinTweaks (MIT):
 * use Jellyfin's Users/{id}/Items paging, not another library renderer/router.
 * This implementation is standalone; no KefinTweaks scripts or dependencies.
 * Search pages, MisioFlix home shelves, collections and playback are untouched.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_NATIVE_LIBRARY_SCROLL_084__) return;
  window.__MISIOFLIX_NATIVE_LIBRARY_SCROLL_084__ = true;
  const LOG = '[MisioFlix Library Scroll]';
  const allowed = new Set(['mixed', 'movies', 'tv', 'music']);
  const PAGE_SIZE = 100;
  let state = null;
  let scanTimer = 0;
  let observer = null;
  let scrollDebounce = 0;
  const guid = value => String(value || '').replace(/-/g, '').toLowerCase();
  const route = () => {
    const match = /^#\/([^?&#]+)(?:\?([^#]*))?/i.exec(location.hash || '');
    if (!match || !allowed.has(match[1].toLowerCase())) return null;
    const q = new URLSearchParams(match[2] || '');
    const parent = guid(q.get('topParentId') || '');
    if (!/^[0-9a-f]{32}$/.test(parent)) return null;
    // The modern Jellyfin library's initial media tab, not search or collections.
    if (Number(q.get('tab') || '0') !== 0) return null;
    return { page:match[1].toLowerCase(), parent, key:match[1].toLowerCase() + '|' + parent + '|' + (q.get('collectionType') || '') };
  };
  const api = () => window.ApiClient || window.ConnectionManager?.getApiClient?.();
  const visible = node => node?.isConnected && node.getClientRects?.().length > 0 && !node.closest?.('.hide,[hidden]');
  function findContainer(r){
    if (!r) return null;
    const names={mixed:['mixed'],movies:['moviesPage'],tv:['tvshowsPage'],music:['musicPage']};
    const pageRoot=(names[r.page] || []).map(id=>document.getElementById(id)).find(visible);
    const legacy=document.querySelector('.libraryPage:not(.hide)');
    if(!pageRoot && !legacy)return null;
    const candidates=[...(pageRoot||legacy).querySelectorAll('.itemsContainer')];
    return candidates.find(node => visible(node) && node.querySelector('.card[data-id]:not([data-mf-library-infinite-card])')) || null;
  }
  const cards = container => [...container.querySelectorAll('.card[data-id]:not([data-mf-library-infinite-card])')];
  const id = item => guid(item?.getAttribute?.('data-id') || item?.Id);
  function currentRange(){
    // The global Jellyfin header and the inner library paging bar can both
    // be MuiAppBar elements. Search each, not just the first unrelated header.
    const heads=[...document.querySelectorAll('header.MuiAppBar-root,.libraryPage:not(.hide) .paging')].filter(visible);
    const numeric=v=>Number(String(v).replace(/[^\d]/g,''));
    for(const header of heads){
      const content=String(header.textContent||'');
      const match=content.match(/(\d[\d\s,.]*)\s*[-–]\s*(\d[\d\s,.]*)\s*(?:z|of|von|de|sur)\s*(\d[\d\s,.]*)/i);
      if(!match)continue;
      const first=numeric(match[1]),last=numeric(match[2]),total=numeric(match[3]);
      if(first>0&&last>=first&&total>=last)return {first,last,total};
    }
    return null;
  }
  function firstSignature(container){
    const list=cards(container);
    return list.slice(0,3).map(id).join('|')+' / '+(list.length ? id(list[list.length-1]) : '');
  }
  function identity(){const r=currentRange();return r?[r.first,r.last,r.total].join('/'):'';}
  function queryIdentity(r){
    const observed=perfQuery(r);if(!observed)return '';
    return [...observed.entries()].filter(([k])=>!/^(?:StartIndex|Limit|Fields|ImageTypeLimit|EnableImageTypes)$/i.test(k))
      .map(([k,v])=>k.toLowerCase()+'='+v).sort().join('&');
  }
  function scrollerContext(){
    let el=document.scrollingElement || document.documentElement;
    if(!state?.container)return el;
    for(let parent=state.container.parentElement;parent && parent!==document.body;parent=parent.parentElement){
      if(parent.scrollHeight>parent.clientHeight+120 && /auto|scroll/i.test(getComputedStyle(parent).overflowY)) return parent;
    }
    return el;
  }
  function nearBottom(){
    const root=scrollerContext();
    return root.scrollHeight-root.scrollTop-root.clientHeight < Math.max(500,root.clientHeight * 0.9);
  }
  function perfQuery(r){
    const candidates=[];
    try{
      for(const entry of performance.getEntriesByType('resource')){
        const url=new URL(entry.name,location.href);
        if(url.origin!==location.origin || !/\/(?:Users\/[0-9a-f-]+\/)?Items\/?$/i.test(url.pathname))continue;
        const q=url.searchParams;
        const queryParent=guid(q.get('ParentId')||q.get('parentId')||q.get('TopParentId')||'');
        if(queryParent!==r.parent)continue;
        candidates.push(q);
      }
    }catch{}
    return candidates.length ? candidates[candidates.length-1] : null;
  }
  // Jellyfin's API parameter binding is case insensitive. A native request may
  // use startIndex/limit, while our old v0.4.82 code added StartIndex/Limit.
  // This generated URLs such as startIndex=0&StartIndex=100, which returned
  // page 1 again (the observed live failure). Never emit both spellings.
  function pageParams(base, offset, size){
    const result = {};
    const seen = new Set();
    for (const [key,value] of Object.entries(base || {})) {
      const normalized=key.toLowerCase();
      if (normalized==='startindex' || normalized==='limit') continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      result[key]=value;
    }
    result.StartIndex=String(offset);
    result.Limit=String(size);
    return result;
  }
  function queryParams(r){
    const observed=perfQuery(r);
    const params={};
    if(observed){
      for(const [key,value] of observed){
        // Only valid Jellyfin item-query fields. Never copy authentication tokens.
        if(!/^[A-Za-z][A-Za-z0-9]*$/.test(key) || /^(?:api_key|token|xembytoken|userid|deviceid)$/i.test(key))continue;
        params[key]=value;
      }
    }else{
      params.ParentId=r.parent;
      params.SortBy='SortName,ProductionYear';
      params.SortOrder='Ascending';
      params.Recursive='true';
    }
    // Exact parent must match the currently open native library.
    params.ParentId=r.parent;
    delete params.parentId;
    delete params.TopParentId;
    delete params.topParentId;
    return {params:pageParams(params,0,1),source:observed?'native-request':'fallback'};
  }
  function requestUrl(client,user,params){
    return client.getUrl('Users/'+encodeURIComponent(user)+'/Items', params);
  }
  async function verifyNativeQuery(s,client,user){
    const base=queryParams(s.route);
    // Modern /mixed can virtualize its FIRST 100 cards. The first mounted
    // node may be item 75, not item 1; validate membership in the native
    // page, not position 0. Do not force its React component to rerender.
    if(s.nativeFirst){
      const probe=pageParams(base.params,(s.range?.first||1)-1,PAGE_SIZE);
      const result=await client.getJSON(requestUrl(client,user,probe));
      const sample=Array.isArray(result?.Items)?result.Items.map(item=>id(item)):[];
      const shown=cards(s.container).slice(0,4).map(el=>id(el));
      const positions=shown.map(value=>sample.indexOf(value));
      if(!positions.length||positions.some(i=>i<0)||positions.some((n,i)=>i>0&&n<=positions[i-1])){
        console.warn(LOG,'Natywna biblioteka ma inne filtry lub sortowanie; pozostawiam oryginalną paginację.');
        return null;
      }
    }
    if(!state || state!==s || identity()!==s.identity)return null;
    return base.params;
  }
  function removeMisioFlixAttrs(root){
    for(const el of [root,...root.querySelectorAll('*')]){
      for(const attr of [...el.attributes]) if(attr.name.startsWith('data-mf-'))el.removeAttribute(attr.name);
    }
    for(const el of root.querySelectorAll('.mf-native-overlay,.mf-native-description,.mf-collection-preview,.mf-home-stats,.mf-home-mal-score,.mf-mal-episode-frame'))el.remove();
  }
  // An actual Jellyfin 12.4 card contains an <img> inside
  // .cardContent > .cardImageContainer. Cloning a card and replacing the
  // container's background does NOT replace that image; a missing image leaves
  // a black box. Use the current item's Primary URL and rebuild only the media.
  function imageUrl(item,kind){
    const itemId=guid(item?.Id);
    if(!itemId)return '';
    const tag=item?.ImageTags?.[kind] || '';
    let url='/Items/'+encodeURIComponent(itemId)+'/Images/'+encodeURIComponent(kind)+'?maxHeight=460&quality=90';
    if(tag)url+='&tag='+encodeURIComponent(tag);
    return url;
  }
  function imageCandidates(item){
    const result=[];
    // Try Primary even when the lightweight Items response omits ImageTags.
    // Jellyfin still resolves /Images/Primary for a real poster in that case.
    if(item?.ImageTags?.Primary || item?.HasPrimaryImage || item?.Type==='Series' || item?.Type==='Movie' || item?.Type==='BoxSet'){
      result.push(imageUrl(item,'Primary'));
    }
    if(item?.ImageTags?.Thumb)result.push(imageUrl(item,'Thumb'));
    if(item?.ImageTags?.Backdrop?.length)result.push(imageUrl(item,'Backdrop'));
    if(!result.length)result.push(imageUrl(item,'Primary'));
    return [...new Set(result.filter(Boolean))];
  }
  function installPoster(card,item){
    const surface=card.querySelector('.cardContent .cardImageContainer');
    if(!surface)return;
    // Remove the prior item's poster and badge/placeholder wrappers: those
    // belong to the template's React-owned original card, not this new item.
    surface.replaceChildren();
    surface.style.removeProperty('background-image');
    surface.removeAttribute('data-src');
    surface.classList.remove('lazy','lazy-hidden','lazy-hidden-children','blurhashed');
    const cover=document.createElement('div');
    cover.className='mf-library-cover';
    const image=document.createElement('img');
    image.className='mf-library-cover-img';
    image.alt=String(item.Name||'');
    image.loading='lazy';
    image.decoding='async';
    const urls=imageCandidates(item);
    let index=0;
    image.addEventListener('error',()=>{
      index++;
      if(index<urls.length)image.src=urls[index];
      else image.remove();
    });
    if(urls.length)image.src=urls[0];
    cover.appendChild(image);
    surface.appendChild(cover);
  }
  function makeCard(item,s){
    const template=s.template;
    if(!template || !item?.Id)return null;
    const node=template.cloneNode(true);
    removeMisioFlixAttrs(node);
    const newId=guid(item.Id), oldId=id(template);
    for(const el of [node,...node.querySelectorAll('*')]){
      for(const name of ['data-id','data-item-id','data-parentid','data-parent-id']){
        const value=el.getAttribute(name);
        if(value && guid(value)===oldId)el.setAttribute(name,newId);
      }
    }
    node.setAttribute('data-id',newId);
    node.setAttribute('data-type',item.Type||'');
    node.setAttribute('data-isfolder',String(!!item.IsFolder));
    for(const stale of ['data-positionticks','data-enddate','data-prefix','data-context','data-mediatype'])node.removeAttribute(stale);
    node.setAttribute('data-mf-library-infinite-card','1');
    node.setAttribute('data-mf-card','1');
    node.setAttribute('data-mf-item-id',newId);
    // These cards are not React children. Give the existing MisioFlix
    // decoration pipeline the correct library kind immediately; its own
    // /api/overlays then fills in NFO genres, season/episode counts and MAL.
    if(s.animeLibrary)node.setAttribute('data-mf-anime','1');
    else node.removeAttribute('data-mf-anime');
    if(item.ProductionYear)node.setAttribute('data-mf-year',String(item.ProductionYear));
    if(s.animeLibrary)node.setAttribute('data-mf-anime-poster','1');
    // Never show the copied template's stale '12 unplayed' bubble, play state,
    // description, thumbnail, poster or React-only actions on the new anime.
    for(const el of node.querySelectorAll('.countIndicator,.playedIndicator,.itemProgressBar,.itemProgressBarForeground,.resumeProgress,.blurhash-canvas'))el.remove();
    const name=node.querySelector('.cardText-first bdi,.cardText-first,.cardText-first a');
    if(name)name.textContent=String(item.Name||item.OriginalTitle||'');
    const year=node.querySelector('.cardText-secondary bdi,.cardText-secondary');
    if(year)year.textContent=item.ProductionYear ? String(item.ProductionYear) : '';
    installPoster(node,item);
    const pad=node.querySelector('.cardPadder');
    pad?.classList.remove('lazy-hidden-children');
    // Cloned React event handlers do not survive cloneNode. Preserve real
    // per-item links for pointer, keyboard and new-tab navigation.
    const target=itemLink(item,s);
    for(const link of node.querySelectorAll('a[href]')){
      if(target)link.setAttribute('href',target);
      link.setAttribute('aria-label','Otwórz: '+String(item.Name||''));
    }
    // Never leave copies of buttons that only work through the original
    // React card's closures. The original library cards remain untouched.
    for(const el of node.querySelectorAll('button,.cardOverlayButton,[data-action="play"],[data-action="resume"]'))el.remove();
    node.setAttribute('tabindex','0');node.setAttribute('role','link');
    node.setAttribute('aria-label','Otwórz: '+String(item.Name||''));
    return node;
  }
  function itemLink(item,s){
    const client=api();
    const server=typeof client?.serverId==='function'?client.serverId():client?.serverId;
    const sid=guid(server)||new URLSearchParams((location.hash||'').split('?')[1]||'').get('serverId')||'';
    const itemId=guid(item.Id);
    if(!itemId)return '';
    if(item.Type==='Folder'||item.Type==='CollectionFolder')return '#/list?parentId='+encodeURIComponent(itemId)+'&serverId='+encodeURIComponent(sid);
    return '#/details?id='+encodeURIComponent(itemId)+'&serverId='+encodeURIComponent(sid);
  }
  function reset(){
    if(!state)return;
    state.abort=true;
    state.io?.disconnect();
    state.pane?.remove();
    state.sentinel?.remove();
    state=null;
  }
  function configure(r,container){
    const native=cards(container);
    if(!native.length)return;
    const range=currentRange();
    const displayed=range?.last || native.length;
    const total=range?.total || null;
    if(total!==null && displayed>=total)return;
    const s={route:r,container,identity:identity(),queryIdentity:queryIdentity(r),nativeFirst:id(native[0]),range,
      next:displayed,total,loading:false,complete:false,abort:false,pane:null,sentinel:null,
      template:native[0].cloneNode(true),animeLibrary:r.page==='mixed' && (native.some(card=>card.getAttribute('data-mf-anime')==='1') || /anime/i.test(document.getElementById('mixed')?.getAttribute('data-title')||'')),
      itemIds:new Set(native.map(id)),query:null,failures:0};
    // The additional cards are a separate non-React deck. It follows the
    // native grid within the existing library view, never rewrites its children.
    const pane=document.createElement('div');
    pane.className=container.className+' mf-library-extra-deck';
    pane.setAttribute('aria-label','Kolejne elementy biblioteki');
    const sentinel=document.createElement('div');
    sentinel.className='mf-library-load-sentinel';
    sentinel.setAttribute('aria-hidden','true');
    // Both nodes are siblings of React's itemsContainer. React retains ownership
    // of its cards; our deck is destroyed on a route/filter/native page change.
    container.insertAdjacentElement('afterend',pane);
    pane.insertAdjacentElement('afterend',sentinel);
    s.pane=pane;s.sentinel=sentinel;
    state=s;
    if(typeof IntersectionObserver==='function'){
      s.io=new IntersectionObserver(entries=>{
        if(entries.some(e=>e.isIntersecting))loadMore(s);
      },{root:null,rootMargin:'600px 0px'});
      s.io.observe(sentinel);
    }
    if(nearBottom())loadMore(s);
  }
  async function loadMore(s){
    if(!s || state!==s || s.loading || s.complete || s.abort || !visible(s.container))return;
    const client=api();
    const user=client?.getCurrentUserId?.();
    if(!user || typeof client.getJSON!=='function' || typeof client.getUrl!=='function')return;
    s.loading=true;
    s.sentinel.textContent='Ładowanie kolejnych pozycji…';
    s.sentinel.setAttribute('aria-hidden','false');
    try{
      if(!s.query){
        s.query=await verifyNativeQuery(s,client,user);
        if(!s.query){s.complete=true;return;}
      }
      if(s.total!==null && s.next>=s.total){s.complete=true;return;}
      const params=pageParams(s.query,s.next,PAGE_SIZE);
      const data=await client.getJSON(requestUrl(client,user,params));
      if(state!==s || s.abort || identity()!==s.identity || route()?.key!==s.route.key)return;
      const items=Array.isArray(data?.Items)?data.Items:[];
      const total=Number(data?.TotalRecordCount);
      if(Number.isFinite(total) && total>=0)s.total=total;
      // Fail closed if the API repeated the first page instead of advancing.
      // Do not let a duplicate response make the offset jump past the total.
      const repeated=items.filter(item=>s.itemIds.has(id(item)));
      if(repeated.length){
        console.warn(LOG,'API zwróciło ponownie',repeated.length,'elementów z wcześniej załadowanych stron; zatrzymuję doładowanie, aby nie pomijać wyników.',{offset:s.next,returned:items.length});
        s.complete=true;
        return;
      }
      let appended=0;
      const appendedCards=[];
      const batch=document.createDocumentFragment();
      for(const item of items){
        const iid=id(item);
        if(!iid || s.itemIds.has(iid))continue;
        const node=makeCard(item,s);
        if(!node)continue;
        s.itemIds.add(iid);
        node.addEventListener('click',event=>{
          if(event.button!==0 || event.ctrlKey || event.shiftKey || event.metaKey || event.altKey)return;
          const target=itemLink(item,s);if(!target)return;
          event.preventDefault();event.stopPropagation();
          location.hash=target;
        });
        node.addEventListener('keydown',event=>{
          if(event.key!=='Enter'&&event.key!==' ')return;
          const target=itemLink(item,s);if(!target)return;
          event.preventDefault();location.hash=target;
        });
        batch.appendChild(node);appendedCards.push(node);appended++;
      }
      if(items.length && !appended){
        console.warn(LOG,'API zwróciło stronę bez poprawnych nowych kart; zachowuję oryginalną paginację.',{offset:s.next,returned:items.length});
        s.complete=true;
        return;
      }
      s.pane.appendChild(batch);
      // The original MisioFlix decorator has a visibility-gated metadata queue.
      // Loaded cards may arrive below its IntersectionObserver root; explicitly
      // hand their actual DOM nodes to that SAME queue for NFO/MAL/Simkl data.
      // This does not create a second overlay engine or modify React cards.
      if(appendedCards.length)window.dispatchEvent(new CustomEvent('misioflix-library-cards-added',{detail:{cards:appendedCards}}));
      s.next+=items.length;
      if(appended)console.info(LOG,'Doładowano',appended,'kart (offset',s.next,')');
      s.failures=0;
      s.complete=items.length===0 || (s.total!==null && s.next>=s.total);
      // Hide native page arrows only once incremental loading is confirmed.
      // The original pagination is deliberately left available if loading fails.
      if(appended || s.complete)s.pane.setAttribute('data-mf-library-scroll-active','1');
      s.sentinel.title=String(s.next)+' z '+String(s.total??'?');
    }catch(error){
      console.warn(LOG,'Nie udało się pobrać kolejnej partii; oryginalna paginacja Jellyfina pozostaje dostępna.',error);
      s.failures+=1;
      if(s.failures>=3)s.complete=true;
      else setTimeout(()=>{if(state===s && !s.abort)loadMore(s);},800*s.failures);
    }finally{
      s.loading=false;
      if(s.complete){s.io?.disconnect();s.sentinel.textContent='';s.sentinel.setAttribute('aria-hidden','true');}
      else {s.sentinel.textContent='';s.sentinel.setAttribute('aria-hidden','true');}
    }
  }
  function reconcile(){
    scanTimer=0;
    const r=route();
    const container=findContainer(r);
    if(!r || !container){reset();return;}
    const q=queryIdentity(r);
    if(state && (state.route.key!==r.key || state.container!==container || !state.pane?.isConnected || state.identity!==identity() ||
       (state.queryIdentity && q && state.queryIdentity!==q)))reset();
    if(!state)configure(r,container);
  }
  function schedule(){if(!scanTimer)scanTimer=setTimeout(reconcile,190);}
  function startup(){
    schedule();
    window.addEventListener('hashchange',()=>{reset();schedule();});
    document.addEventListener('viewshow',schedule);
    window.addEventListener('pageshow',schedule);
    // Filters, sorting, letter picker and native paging are React-controlled.
    // Never append the previous query's results after the user changes one.
    document.addEventListener('click',event=>{
      if(!route())return;
      const button=event.target?.closest?.('header.MuiAppBar-root button,.libraryPage .paging button,.alphaPickerButton,.alphaPicker-fixed-right button');
      if(button){reset();setTimeout(schedule,450);}
    },true);
    document.addEventListener('scroll',()=>{
      if(!scrollDebounce)scrollDebounce=setTimeout(()=>{scrollDebounce=0;if(state && nearBottom())loadMore(state);},120);
    },{capture:true,passive:true});
    window.addEventListener('scroll',()=>{if(state&&nearBottom())loadMore(state);},{passive:true});
    observer=new MutationObserver(changes=>{
      // React-managed library cards change via childList on navigation/paging.
      if(changes.some(x=>x.addedNodes.length||x.removedNodes.length))schedule();
    });
    observer.observe(document.body,{subtree:true,childList:true});
    // The native React page can mount after MisioFlix's deferred scripts.
    setInterval(()=>{if(route())schedule();else if(state)reset();},1600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startup,{once:true});
  else startup();
})();
