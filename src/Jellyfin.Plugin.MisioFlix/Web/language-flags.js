/* MisioFlix — read-only, progressively hydrated PL/EN audio & subtitle badges.
 * Completely independent of MAL, Simkl, playback, subtitles selection and cards' click handlers.
 * ○ = audio, ◇ = subtitles, pentagon = both. Verified media streams only.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_LANGUAGE_FLAGS__) return;
  window.__MISIOFLIX_LANGUAGE_FLAGS__ = true;

  const hexId = /^[0-9a-f]{32}$/;
  const SVG = 'http://www.w3.org/2000/svg';
  const selector = '.mf-home-card .mf-home-poster, .mf-home-resume-card, .card[data-id], .MuiCard-root[data-id]';
  const cache = new Map();
  const observing = new WeakMap();
  const pending = new Map();
  let io = null;
  let scheduled = false;
  let busy = false;
  let serial = 0;
  let owner = '';
  let sequence = 0;
  const normalizeId = x => String(x || '').replace(/-/g,'').toLowerCase();
  function token() {
    const c = window.ApiClient || window.ConnectionManager?.getApiClient?.();
    const v = c ? (typeof c.accessToken === 'function' ? c.accessToken() : c.accessToken) : '';
    return typeof v === 'string' ? v : '';
  }
  function tokenGuard() {
    const current = token();
    if (current === owner) return;
    owner = current;
    serial++;
    cache.clear();
    pending.clear();
    io?.disconnect();
    io = null;
    // No user/account metadata survives a Jellyfin account switch.
    for (const node of document.querySelectorAll('.mf-language-flags')) node.remove();
    // Existing cards should be reobserved with the new account.
    observedReset();
  }
  // WeakMap cannot be cleared; an epoch invalidates its entries.
  let observeEpoch = 0;
  function observedReset() { observeEpoch++; }

  function node(name, attributes = {}) {
    const result = document.createElementNS(SVG, name);
    for (const [key,value] of Object.entries(attributes)) result.setAttribute(key, String(value));
    return result;
  }
  function flagShape(mode) {
    if (mode === 'audio') return node('circle',{cx:16,cy:16,r:13});
    if (mode === 'subtitles') return node('path',{d:'M16 1 L31 16 L16 31 L1 16 Z'});
    return node('path',{d:'M16 1 L30 11 L25 30 L7 30 L2 11 Z'});
  }
  function flagSvg(language, mode) {
    const svg = node('svg',{viewBox:'0 0 32 32','aria-hidden':'true',focusable:'false'});
    svg.classList.add('mf-language-flag');
    const id = `mf-flag-clip-${++sequence}`;
    const defs = node('defs');
    const clip = node('clipPath',{id});
    clip.appendChild(flagShape(mode));defs.appendChild(clip);svg.appendChild(defs);
    const contents = node('g',{'clip-path':`url(#${id})`});
    if (language === 'pl') {
      contents.appendChild(node('rect',{x:0,y:0,width:32,height:16,fill:'#fff'}));
      contents.appendChild(node('rect',{x:0,y:16,width:32,height:16,fill:'#dc143c'}));
    } else {
      // Locally drawn Union Jack; no network requests or third-party flag assets.
      contents.appendChild(node('rect',{x:0,y:0,width:32,height:32,fill:'#012169'}));
      contents.appendChild(node('path',{d:'M-4 -4 L36 36 M36 -4 L-4 36',stroke:'#fff','stroke-width':8}));
      contents.appendChild(node('path',{d:'M-4 -4 L36 36 M36 -4 L-4 36',stroke:'#c8102e','stroke-width':3.1}));
      contents.appendChild(node('path',{d:'M16 -2 V34 M-2 16 H34',stroke:'#fff','stroke-width':9}));
      contents.appendChild(node('path',{d:'M16 -2 V34 M-2 16 H34',stroke:'#c8102e','stroke-width':5}));
    }
    svg.appendChild(contents);
    const outline=flagShape(mode);
    outline.setAttribute('fill','none');
    outline.setAttribute('stroke','#f7eef5');
    outline.setAttribute('stroke-width','1.4');
    svg.appendChild(outline);
    return svg;
  }
  const modeLabel = {audio:'dźwięk',subtitles:'napisy',both:'dźwięk i napisy'};
  function paint(element, info, itemId) {
    if (!element.isConnected || element.getAttribute('data-mf-flag-id') !== itemId) return;
    element.querySelector(':scope > .mf-language-flags')?.remove();
    const modes = [['pl',info?.pl],['en',info?.en]].filter(([,value])=>modeLabel[value]);
    if (!modes.length) return;
    const row = document.createElement('span');
    row.className='mf-language-flags';
    row.setAttribute('aria-hidden','true');
    for (const [language, mode] of modes) {
      const mark = document.createElement('span');
      mark.className = 'mf-language-flags-item';
      mark.setAttribute('data-language',language);
      mark.setAttribute('data-mode',mode);
      mark.title = `${language === 'pl'?'Polski':'Angielski'}: ${modeLabel[mode]}`+
        (info.partial?' (sprawdzono część odcinków)':'');
      mark.appendChild(flagSvg(language, mode));
      row.appendChild(mark);
    }
    element.appendChild(row);
  }
  function cardIdentity(card) {
    if (card.closest('.mf-home-collection-card') ||
        /^(BoxSet|Collection|Folder)$/i.test(card.getAttribute('data-type') || '')) return null;
    const home = card.matches('.mf-home-poster');
    const resume = card.matches('.mf-home-resume-card');
    if (!home && !resume && card.closest('.detailImageContainer,.dialog,#dashboardPage,[role="dialog"]')) return null;
    const target=home || resume ? card : card.querySelector('.cardScalable,.MuiCardMedia-root');
    if (!target) return null;
    let id = card.getAttribute('data-mf-language-id') || card.getAttribute('data-id') || card.getAttribute('data-mf-item-id');
    if (!id) {
      const href = home ? card.getAttribute('href') : card.querySelector('a[href*="details?id="]')?.getAttribute('href');
      id = /(?:[?#&]id=)([a-f\d-]{32,36})(?:[&#]|$)/i.exec(href||'')?.[1] || '';
    }
    id = normalizeId(id);
    return hexId.test(id) ? {id,target} : null;
  }
  function enqueue(id,target) {
    if (!owner) return;
    if (cache.has(id)) {paint(target,cache.get(id),id);return;}
    if (!pending.has(id)) pending.set(id,new Set());
    pending.get(id).add(target);
    void flush();
  }
  async function flush() {
    if (busy || !owner || !pending.size) return;
    busy = true;
    const picked=[...pending.entries()].slice(0,6);
    for (const [key] of picked) pending.delete(key);
    const requestOwner = owner, requestSerial = serial;
    const control = new AbortController();
    const timeout = setTimeout(()=>control.abort(),30000);
    try {
      const q = picked.map(([id])=>id).join(',');
      const response = await fetch('/MisioFlix/api/language-flags?ids='+encodeURIComponent(q), {
        headers:{Authorization:`MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-language-flags", Version="1", Token="${requestOwner.replace(/["\r\n]/g,'')}"`},
        cache:'no-store', signal:control.signal
      });
      if (!response.ok) return; // Native cards and player must still work if unavailable.
      const values=await response.json();
      if (serial!==requestSerial || token()!==requestOwner) return;
      for (const result of Array.isArray(values)?values:[]) {
        const id=normalizeId(result.id);
        if (hexId.test(id)) cache.set(id,result);
      }
      for (const [id,targets] of picked) {
        const info=cache.get(id);
        // Absence is valid (permissions or media metadata missing); don't invent flags.
        if (!info) continue;
        for (const target of targets) paint(target,info,id);
      }
    } catch (_) {
      // Read-only decoration: network failure does not affect playback or navigation.
    } finally {
      clearTimeout(timeout);
      busy = false;
      if (pending.size) setTimeout(()=>void flush(),300);
    }
  }
  function scan() {
    scheduled = false;
    tokenGuard();
    if (!owner) return;
    if (!io && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          const id=entry.target.getAttribute('data-mf-flag-id');
          if (hexId.test(id||'')) enqueue(id,entry.target);
        }
      },{rootMargin:'200px 0px',threshold:0.01});
    }
    for (const card of document.querySelectorAll(selector)) {
      const result=cardIdentity(card);
      if (!result) continue;
      const {id,target}=result;
      const previous=observing.get(target);
      if (previous && previous.id === id && previous.epoch === observeEpoch) continue;
      target.querySelector(':scope > .mf-language-flags')?.remove();
      target.setAttribute('data-mf-flag-id',id);
      observing.set(target,{id,epoch:observeEpoch});
      if (cache.has(id)) paint(target,cache.get(id),id);
      else if (io) io.observe(target);
      else enqueue(id,target);
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled=true;
    (window.requestAnimationFrame || (fn=>setTimeout(fn,40)))(scan);
  }
  const observer = new MutationObserver(records => {
    if (records.some(record => record.type === 'attributes' || record.addedNodes.length || record.removedNodes.length)) schedule();
  });
  function start() {
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-id','data-mf-language-id','href']});
    window.addEventListener('hashchange',schedule,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
    // Account changes sometimes do not replace existing Jellyfin DOM.
    setInterval(()=>{if (token()!==owner) schedule();},3000);
    schedule();
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded',start,{once:true});
})();
