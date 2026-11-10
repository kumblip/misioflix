/* MisioFlix native plugin client extension for Jellyfin Web 12.4. No external plugin dependencies. */
(() => {
  'use strict';
  if (window.__MISIOFLIX_NATIVE__) return;
  window.__MISIOFLIX_NATIVE__ = '0.4.0';
  const h = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = {open:false, tab:'home', items:[], genres:{anime:[],media:[]}, ready:false,
                 search:{anime:{q:'',type:'',year:'',include:[],exclude:[]},media:{q:'',type:'',year:'',include:[],exclude:[]}},
                 detail:null, objectUrls:[], pageSizes:{anime:60,movies:60,series:60,'search-anime':60,'search-media':60}, client:null, token:null, pending:null};
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  function apiClient() {
    const a = window.ApiClient || window.ConnectionManager?.getApiClient?.() || null;
    if (!a) return null;
    const t = typeof a.accessToken === 'function' ? a.accessToken() : a.accessToken;
    if (typeof t !== 'string' || !t) return null;
    state.client = a; state.token = t;
    return a;
  }
  function jellyfinHeaders() {
    if (!apiClient()) return null;
    const t = state.token.replace(/["\r\n]/g,'');
    return {'Authorization': `MediaBrowser Client="misioflix", Device="Jellyfin Web", DeviceId="misioflix-web", Version="0.4.0", Token="${t}"`};
  }
  async function get(path) {
    const headers = jellyfinHeaders();
    if (!headers) throw Error('Zaloguj się najpierw do Jellyfin.');
    const res = await fetch('/MisioFlix/api/'+path, {headers,cache:'no-store'});
    const d = await res.json().catch(()=>({error:'Nieprawidłowa odpowiedź serwera'}));
    if (!res.ok) throw Error(d.error || 'Błąd '+res.status);
    return d;
  }
  function inject() {
    if ($('#mf-launch')) return;
    const btn = document.createElement('button'); btn.id='mf-launch'; btn.type='button';
    btn.title='Otwórz misioflix'; btn.innerHTML='<img src="/MisioFlix/assets/mark.png" alt=""> <span>misioflix</span>';
    btn.addEventListener('click', () => open('home'));
    document.body.appendChild(btn);
    const root = document.createElement('div'); root.id='mf-portal'; root.className='mf-hidden'; root.setAttribute('aria-label','misioflix');
    root.innerHTML = `
      <header class="mf-header"><div class="mf-head-inner">
        <button type="button" class="mf-brand" data-mf-tab="home" aria-label="misioflix — główna"><img src="/MisioFlix/assets/logo.png" alt="misioflix"></button>
        <nav class="mf-nav"><button data-mf-tab="home">Główna</button><button data-mf-tab="anime">Anime</button><button data-mf-tab="movies">Filmy</button><button data-mf-tab="series">Seriale</button><button data-mf-tab="search-anime">Szukaj anime</button><button data-mf-tab="search-media">Szukaj filmów i seriali</button></nav>
        <button type="button" class="mf-leave" data-mf-close>Powrót do Jellyfin <span aria-hidden="true">×</span></button>
      </div></header>
      <main class="mf-main" id="mf-content" tabindex="-1" aria-live="polite"></main>
      <div class="mf-foot">misioflix · Własna prezentacja, oryginalny odtwarzacz Jellyfin · NFO dla anime</div>`;
    root.addEventListener('click', clicked);
    root.addEventListener('keydown', e=>{const c=e.target.closest?.('[data-mf-id]');if(c && ['Enter',' '].includes(e.key)){e.preventDefault();showDetails(c.dataset.mfId);}});
    root.addEventListener('input', changed);
    root.addEventListener('change', changed);
    document.body.appendChild(root);
    window.addEventListener('keydown', e=>{if(e.key==='Escape' && state.open && !state.detail)close();});
    window.addEventListener('popstate',()=>{ if(new URL(location.href).searchParams.has('misioflix'))open(new URL(location.href).searchParams.get('misioflix')||'home',false); });
  }
  function urlFor(tab) {
    const u = new URL(location.href); u.searchParams.set('misioflix',tab); return u.pathname+u.search+u.hash;
  }
  function open(tab='home', addHistory=true) {
    inject();
    if (!apiClient()) { alert('Zaloguj się do Jellyfin, a potem otwórz misioflix.'); return; }
    state.open = true; state.tab = tab;
    $('#mf-portal').classList.remove('mf-hidden');
    document.body.classList.add('mf-is-open');
    if (addHistory) history.pushState({misioflix:tab},'',urlFor(tab));
    sessionStorage.setItem('mf-last-tab',tab);
    if (!state.ready && !state.pending) load(); else render();
  }
  function close() {
    state.open=false; $('#mf-portal')?.classList.add('mf-hidden');
    document.body.classList.remove('mf-is-open');
    for (const url of state.objectUrls) URL.revokeObjectURL(url); state.objectUrls=[];
    const u=new URL(location.href);u.searchParams.delete('misioflix');
    history.replaceState(null,'',u.pathname+u.search+u.hash);
  }
  async function load(force=false) {
    if (state.pending) return state.pending;
    const page=$('#mf-content'); if (page) page.innerHTML='<div class="mf-loading">Ładowanie katalogu Jellyfin i NFO…</div>';
    state.pending = (async()=>{
      try {
        const d=await get('catalog');
        state.items=d.items||[];state.genres=d.genres||{anime:[],media:[]};state.ready=true;
      } catch(e){state.ready=false; if(page)page.innerHTML='<section class="mf-error"><h2>Nie udało się pobrać katalogu</h2><p>'+h(e.message)+'</p><button data-mf-refresh>Spróbuj ponownie</button><p>Sprawdź czy pozycje zostały dodane do Jellyfin i czy ścieżki NFO są dostępne.</p></section>';return;}
      render();
    })();
    try {await state.pending;} finally {state.pending=null;}
  }
  function genrePills(gs) {return (gs||[]).slice(0,4).map(g=>'<span class="mf-pill">'+h(g)+'</span>').join('');}
  function mediaCard(it) {
    return `<article class="mf-card" data-mf-id="${h(it.id)}" role="button" tabindex="0" aria-label="${h(it.title)} — szczegóły">
      <div class="mf-poster" data-image="${h(it.has_image?it.id:'')}"><span class="mf-icon">▶</span><b>${it.anime?'ANIME':it.type==='Movie'?'FILM':'SERIAL'}</b></div>
      <div class="mf-card-body"><h3>${h(it.title||'Bez tytułu w NFO')}</h3><div class="mf-mini">${h(it.year||'—')} · ${h(it.kind||'Produkcja')}</div><div class="mf-pills">${genrePills(it.genres)}</div>
      <p>${h(it.plot||'Brak opisu w źródle metadanych.')}</p>
      ${it.progress_percent>0?`<div class="mf-progress"><span style="width:${Math.min(100,Math.max(0,it.progress_percent))}%"></span></div>`:''}</div></article>`;
  }
  function carousel(title,items) {
    if (!items.length) return '';
    return `<section class="mf-section"><h2>${h(title)}</h2><div class="mf-scroll">${items.slice(0,25).map(mediaCard).join('')}</div></section>`;
  }
  function home() {
    const all=state.items;
    const recent=[...all].sort((a,b)=>(b.date_added||'').localeCompare(a.date_added||''));
    const continueWatching=all.filter(x=>x.progress_percent>0 && x.progress_percent<100).sort((a,b)=>b.progress_percent-a.progress_percent);
    const anime=all.filter(x=>x.anime);const movies=all.filter(x=>!x.anime && x.type==='Movie');const series=all.filter(x=>!x.anime&&x.type==='Series');
    return `<section class="mf-hero"><div class="mf-hero-content"><img src="/MisioFlix/assets/logo.png" alt="MisioFlix"><h1>Twój świat filmów i anime</h1><p>Własny katalog i wyszukiwanie. Oryginalny odtwarzacz Jellyfin.</p><div><button data-mf-tab="search-anime" class="mf-primary">Wyszukaj anime</button><button data-mf-tab="search-media">Wyszukaj filmy i seriale</button></div></div></section>
    ${all.length?'':`<div class="mf-empty"><h2>Biblioteka jest jeszcze pusta</h2><p>Dodaj produkcje w Jellyfin — wtedy pojawią się tu karuzele, karty i obie wyszukiwarki.</p></div>`}
    ${carousel('Kontynuuj oglądanie',continueWatching)}${carousel('Ostatnio dodane',recent)}${carousel('Anime',anime)}${carousel('Filmy',movies)}${carousel('Seriale',series)}`;
  }
  function listings(kind) {
    const its=state.items.filter(x=>kind==='anime'?x.anime:kind==='movies'?(!x.anime&&x.type==='Movie'):(!x.anime&&x.type==='Series'));
    return `<section class="mf-section"><h1>${kind==='anime'?'Anime':kind==='movies'?'Filmy':'Seriale'}</h1><p class="mf-sub">${its.length} pozycji · ${kind==='anime'?'metadane wyłącznie z NFO':'gatunki z Jellyfin'}</p>
      ${its.length?`<div class="mf-grid">${its.slice(0,state.pageSizes[kind]).map(mediaCard).join('')}</div>${its.length>state.pageSizes[kind]?`<button class="mf-more" data-mf-more="${kind}">Pokaż więcej (${its.length-state.pageSizes[kind]} pozostałych)</button>`:''}`:'<div class="mf-empty">Brak pozycji w bibliotece Jellyfin.</div>'}</section>`;
  }
  function contains(text,search){return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pl').includes(String(search||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pl'));}
  function matches(it,f){
    if (f.q && !contains([it.title,it.plot,...it.genres].join(' '),f.q))return false;
    if(f.year && String(it.year)!==f.year)return false;
    if(f.type && (it.anime?it.kind:it.type)!==f.type)return false;
    if(f.include.some(g=>!it.genres.includes(g)))return false;
    if(f.exclude.some(g=>it.genres.includes(g)))return false;
    return true;
  }
  function search(tab) {
    const scope=tab==='search-anime'?'anime':'media', f=state.search[scope];
    const items=state.items.filter(x=>(scope==='anime')===x.anime), filtered=items.filter(x=>matches(x,f));
    const genres=state.genres[scope]||[];
    const types=[...new Set(items.map(x=>scope==='anime'?x.kind:x.type))].filter(Boolean).sort();
    const years=[...new Set(items.map(x=>String(x.year)).filter(Boolean))].sort().reverse();
    const label=scope==='anime'?'Anime — NFO':'Filmy i seriale — Jellyfin';
    return `<section class="mf-section mf-search"><h1>${label}</h1><p class="mf-sub">${scope==='anime'?'Tytuł rōmaji i gatunki tylko z NFO anime.':'Anime jest wykluczone. Gatunki tylko z Jellyfin.'}</p>
      <div class="mf-filter-row"><label>Wyszukaj<input autocomplete="off" data-mf-input="q" data-mf-scope="${scope}" value="${h(f.q)}" placeholder="Wpisz tytuł lub opis"></label>
      <label>Rodzaj<select data-mf-input="type" data-mf-scope="${scope}"><option value="">Wszystkie rodzaje</option>${types.map(t=>`<option value="${h(t)}" ${f.type===t?'selected':''}>${h(scope==='media'?(t==='Movie'?'Film':'Serial'):t)}</option>`).join('')}</select></label>
      <label>Rok<select data-mf-input="year" data-mf-scope="${scope}"><option value="">Wszystkie lata</option>${years.map(t=>`<option ${f.year===t?'selected':''}>${h(t)}</option>`).join('')}</select></label></div>
      <h2>Gatunki <small>(${genres.length} · ${scope==='anime'?'NFO':'Jellyfin'})</small></h2>
      <div class="mf-genre-filter">${genres.map(g=>{
         const s=f.include.includes(g)?'include':f.exclude.includes(g)?'exclude':'';
         return `<button class="mf-genre-button ${s}" type="button" data-mf-genre="${h(g)}" data-mf-scope="${scope}" title="Kliknij: wymagaj → wyklucz → bez filtru"><span>${s==='include'?'✓ ':s==='exclude'?'✕ ':''}${h(g)}</span></button>`;
       }).join('')||'<p>Brak gatunków — dodaj produkcje do odpowiedniej biblioteki.</p>'}</div>
      <div class="mf-search-count">Wyniki: <strong>${filtered.length}</strong> / ${items.length} <button data-mf-clear="${scope}">Wyczyść filtry</button></div>
      ${filtered.length?`<div class="mf-grid">${filtered.slice(0,state.pageSizes[tab]).map(mediaCard).join('')}</div>${filtered.length>state.pageSizes[tab]?`<button class="mf-more" data-mf-more="${tab}">Pokaż więcej (${filtered.length-state.pageSizes[tab]} pozostałych)</button>`:''}`:'<div class="mf-empty">Brak wyników dla aktualnych filtrów.</div>'}</section>`;
  }
  function detail(it,episodes) {
    return `<section class="mf-detail"><button data-mf-back>← Wróć do katalogu</button><div class="mf-detail-grid">
      <div class="mf-detail-poster mf-poster" data-image="${h(it.has_image?it.id:'')}"><span class="mf-icon">▶</span></div>
      <div><h1>${h(it.title)}</h1><div class="mf-mini">${h(it.year||'—')} · ${h(it.kind)} · ${it.anime?'ANIME':'FILM / SERIAL'}</div><div class="mf-pills">${genrePills(it.genres)}</div>
      <p>${h(it.plot||'Brak opisu w źródle metadanych.')}</p><div class="mf-actions"><button class="mf-primary" data-mf-jellyfin="${h(it.id)}">Otwórz w Jellyfin</button><button data-mf-back>Powrót</button></div>
      <small>Odtwarzacz i ścieżki audio/napisy pozostają oryginalne w Jellyfin.</small></div></div>
      ${episodes?.length?`<h2>Odcinki</h2><div class="mf-episode-grid">${episodes.map(x=>`<button data-mf-jellyfin="${h(x.id)}" class="mf-episode">S${h(x.season??'?')}E${h(x.number??'?')} · ${h(x.title||'Odcinek')} <span>▶</span></button>`).join('')}</div>`:''}</section>`;
  }
  function applyActiveTabs(){$$('[data-mf-tab]',$('#mf-portal')).forEach(x=>x.classList.toggle('active',x.dataset.mfTab===state.tab));}
  function render() {
    if (!state.open || !state.ready) return;
    const page=$('#mf-content'); if(!page)return;
    for (const url of state.objectUrls) URL.revokeObjectURL(url);state.objectUrls=[];
    if(state.detail){page.innerHTML=detail(state.detail.item,state.detail.episodes);}
    else if(state.tab==='home')page.innerHTML=home();
    else if(['anime','movies','series'].includes(state.tab))page.innerHTML=listings(state.tab);
    else page.innerHTML=search(state.tab);
    applyActiveTabs(); loadImages(page);page.scrollTop=0;
  }
  function loadImages(page){
    const headers=jellyfinHeaders();if(!headers)return;
    const targets=$$('[data-image]',page).filter(x=>x.dataset.image && /^[A-Za-z0-9-]{10,80}$/.test(x.dataset.image));
    const load=async(poster)=>{
      const id=poster.dataset.image;
      try{
        const response=await fetch(`/Items/${encodeURIComponent(id)}/Images/Primary?maxWidth=350`, {headers});
        if(!response.ok||!state.open||!page.contains(poster))return;
        const blob=await response.blob();if(!blob.type.startsWith('image/'))return;
        if(!state.open||!page.contains(poster))return;
        const url=URL.createObjectURL(blob);state.objectUrls.push(url);
        poster.style.backgroundImage=`url("${url}")`;
      }catch(_){/* Posters are optional */}
    };
    if('IntersectionObserver' in window){
      const observer=new IntersectionObserver(entries=>{
        for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);load(entry.target);}
      },{root:$('#mf-portal'),rootMargin:'300px'});
      targets.forEach(x=>observer.observe(x));
    }else targets.slice(0,35).forEach(load);
  }
  function toTab(tab){state.detail=null;open(tab);}
  async function showDetails(id){
    if(!state.items.some(x=>x.id===id))return;
    const page=$('#mf-content'); page.innerHTML='<div class="mf-loading">Wczytywanie szczegółów…</div>';
    try{state.detail=await get('item/'+encodeURIComponent(id));render();}
    catch(e){page.innerHTML='<div class="mf-empty">'+h(e.message)+'</div>';}
  }
  function openNative(id){
    // Hide custom catalog and hand control back to the ORIGINAL Jellyfin Web route/player.
    close();
    // Jellyfin Web uses its own router. This route may need adapting after an upstream change.
    try {
      if (typeof window.Emby?.Page?.showItem === 'function') { window.Emby.Page.showItem(id); return; }
    }catch(_){/* fallback below */}
    const base = '/web/index.html';
    location.assign(base + '#!/details?id=' + encodeURIComponent(id));
  }
  function clicked(e){
    const tab=e.target.closest('[data-mf-tab]');if(tab){toTab(tab.dataset.mfTab);return;}
    if(e.target.closest('[data-mf-close]')){close();return;}
    if(e.target.closest('[data-mf-back]')){state.detail=null;render();return;}
    if(e.target.closest('[data-mf-refresh]')){load(true);return;}
    const nf=e.target.closest('[data-mf-jellyfin]');if(nf){openNative(nf.dataset.mfJellyfin);return;}
    const more=e.target.closest('[data-mf-more]');if(more){state.pageSizes[more.dataset.mfMore]+=60;render();return;}
    const clear=e.target.closest('[data-mf-clear]');if(clear){state.search[clear.dataset.mfClear]={q:'',type:'',year:'',include:[],exclude:[]};render();return;}
    const genre=e.target.closest('[data-mf-genre]');if(genre){const f=state.search[genre.dataset.mfScope],g=genre.dataset.mfGenre;
      if(f.include.includes(g)){f.include=f.include.filter(x=>x!==g);f.exclude.push(g);}
      else if(f.exclude.includes(g))f.exclude=f.exclude.filter(x=>x!==g);
      else f.include.push(g);render();return;}
    const card=e.target.closest('[data-mf-id]');if(card)showDetails(card.dataset.mfId);
  }
  function changed(e){const input=e.target.closest('[data-mf-input]');if(!input)return;
    const f=state.search[input.dataset.mfScope];if(!f)return;
    const key=input.dataset.mfInput;f[key]=input.value;state.pageSizes[state.tab]=60;
    const start=key==='q'?{position:input.selectionStart, focus:true}:null;
    render();
    if(start){const q=$(`[data-mf-input="q"][data-mf-scope="${input.dataset.mfScope}"]`);q?.focus();q?.setSelectionRange(start.position,start.position);}
  }
  function boot(){
    if(!document.body){setTimeout(boot,250);return;}
    inject();
    const requested=new URL(location.href).searchParams.get('misioflix');
    if(requested){let tries=0;const attempt=()=>{if(apiClient())open(requested,false);else if(++tries<60)setTimeout(attempt,500);};attempt();}
    // Default stays original Jellyfin until user confirms browser/app compatibility.
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
