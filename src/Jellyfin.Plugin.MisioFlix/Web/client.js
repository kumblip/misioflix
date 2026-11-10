/* MisioFlix native plugin client extension for Jellyfin Web 12.4. No external plugin dependencies. */
(() => {
  'use strict';
  if (window.__MISIOFLIX_NATIVE__) return;
  window.__MISIOFLIX_NATIVE__ = '0.4.5';
  const h = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = {open:false, tab:'home', items:[], genres:{anime:[],media:[]}, genreFrequency:{anime:new Map(),media:new Map()}, resume:[], hiddenResume:[], showHiddenResume:false, resumeError:false, resumeLoading:false, resumePending:null, ready:false, homeRandom:{}, mal:{connected:false,malUserId:null,username:null,entries:{},loading:false,error:null},
                 search:{anime:{q:'',type:'',year:'',include:[],exclude:[]},media:{q:'',type:'',year:'',include:[],exclude:[]}},
                 detail:null, objectUrls:[], pageSizes:{recent:60,anime:60,movies:60,series:60,'search-anime':60,'search-media':60}, client:null, token:null, pending:null};
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];

  function forgetUserState(){
    state.ready=false;state.items=[];state.resume=[];state.hiddenResume=[];
    state.detail=null;state.homeRandom={};state.pending=null;
    state.mal={connected:false,malUserId:null,username:null,entries:{},loading:false,error:null};
    for(const url of state.objectUrls)URL.revokeObjectURL(url);
    state.objectUrls=[];
    const content=$('#mf-content');
    if(content)content.innerHTML='<div class="mf-loading">Zmiana konta Jellyfin — odświeżanie danych…</div>';
  }
  function apiClient() {
    const a = window.ApiClient || window.ConnectionManager?.getApiClient?.() || null;
    const t = a?(typeof a.accessToken === 'function' ? a.accessToken() : a.accessToken):null;
    if (typeof t !== 'string' || !t) {
      if(state.token)forgetUserState();
      state.client=null;state.token=null;
      return null;
    }
    // Jellyfin can switch users without reloading the page. Clear all previous profile data.
    if (state.token && state.token !== t)forgetUserState();
    state.client = a; state.token = t;
    return a;
  }
  function jellyfinHeaders() {
    if (!apiClient()) return null;
    const t = state.token.replace(/["\r\n]/g,'');
    return {'Authorization': `MediaBrowser Client="misioflix", Device="Jellyfin Web", DeviceId="misioflix-web", Version="0.4.5", Token="${t}"`};
  }
  async function get(path) {
    const headers = jellyfinHeaders();
    if (!headers) throw Error('Zaloguj się najpierw do Jellyfin.');
    const res = await fetch('/MisioFlix/api/'+path, {headers,cache:'no-store'});
    const d = await res.json().catch(()=>({error:'Nieprawidłowa odpowiedź serwera'}));
    if (!res.ok) throw Error(d.error || 'Błąd '+res.status);
    return d;
  }
  async function post(path,body={}) {
    const headers=jellyfinHeaders();
    if(!headers)throw Error('Zaloguj się do Jellyfin');
    const res=await fetch('/MisioFlix/api/'+path,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const json=await res.json().catch(()=>({error:'Błąd połączenia z serwerem'}));
    if(!res.ok)throw Error(json.error||'Błąd '+res.status);
    return json;
  }
  async function refreshMal(force=false) {
    if(!apiClient())return;
    const accountToken=state.token;
    state.mal.loading=true;
    try {
      const data=await get('mal/status'+(force?'?refresh=true':''));
      if(accountToken!==state.token)return; // discard an earlier Jellyfin user's result
      state.mal={...state.mal,connected:!!data.connected,malUserId:data.malUserId??null,
        username:data.username||null,entries:data.entries||{},loading:false,error:null};
    } catch(e) {
      if(accountToken!==state.token)return;
      state.mal={...state.mal,loading:false,error:e.message};
    }
    if(state.open&&state.ready)render();
  }
  async function malConnect(){
    // Open synchronously from the click; otherwise popup blockers may reject OAuth.
    const popup=window.open('about:blank','_blank');
    try {const result=await get('mal/connect');
      if(result.manual){
        state.mal.manualReady=true;
        state.mal.manualMessage=result.message||'';
        toTab('mal-account');
      }
      if(popup)popup.location.href=result.url;
      else alert('Zezwól na otwarcie okna MAL i spróbuj ponownie.');
    }catch(e){if(popup)popup.close();throw e;}
  }
  async function finishManualMal(){
    const field=$('[data-mf-mal-redirect-text]');
    if(!field)throw Error('Wróć do zakładki Moje MAL.');
    const redirectUrl=field.value.trim();
    if(!redirectUrl)throw Error('Wklej pełny adres localhost z parametrami code i state.');
    // Never retain the one-time authorization code in localStorage or query strings.
    const accountToken=state.token;
    field.value='';
    await post('mal/complete',{redirectUrl});
    if(accountToken!==state.token)return;
    state.mal.manualReady=false;
    state.mal.manualMessage='';
    await refreshMal(true);
  }
  async function savePersonalRating(itemId,seasonId,score){
    const data=await post('item/'+encodeURIComponent(itemId)+'/rating',{rating:score,seasonId:seasonId||null});
    if(seasonId && state.detail){
      const season=(state.detail.seasons||[]).find(x=>x.id===seasonId);
      if(season)season.rating=data.rating;
    } else {
      const item=state.items.find(x=>x.id===itemId);
      if(item)item.rating=data.rating;
      if(state.detail?.item?.id===itemId)state.detail.item.rating=data.rating;
    }
    render();
  }
  async function saveMalRow(element){
    const row=element.closest('[data-mf-mal-row]');
    if(!row)return;
    const catalogId=row.dataset.mfMalParent,seasonId=row.dataset.mfMalSeason||null;
    const status=row.querySelector('[data-mf-mal-field="status"]')?.value;
    const score=row.querySelector('[data-mf-mal-field="score"]')?.value;
    const watched=row.querySelector('[data-mf-mal-field="episodes"]')?.value;
    const repeats=row.querySelector('[data-mf-mal-field="repeats"]')?.value;
    const result=await post('mal/update',{catalogId,seasonId,status,
      score:score===''?0:Number(score),episodesWatched:Number(watched),timesRewatched:Number(repeats)});
    state.mal.entries[String(result.mal_id)]=result;
    render();
  }
  async function saveResumeVisibility(catalogId, hidden) {
    const headers=jellyfinHeaders();
    if (!headers || !/^[a-f0-9-]{32,36}$/i.test(catalogId)) return;
    const response=await fetch('/MisioFlix/api/resume/'+(hidden?'hide':'restore'), {
      method:'POST',headers:{...headers,'Content-Type':'application/json'},
      body:JSON.stringify({catalogId})
    });
    if(!response.ok) throw Error('Nie udało się zapisać zmiany. Spróbuj ponownie.');
    await refreshResume(true);
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
        <nav class="mf-nav"><button data-mf-tab="home">Główna</button><button data-mf-tab="anime">Anime</button><button data-mf-tab="movies">Filmy</button><button data-mf-tab="series">Seriale</button><button data-mf-tab="search-anime">Szukaj anime</button><button data-mf-tab="search-media">Szukaj filmów i seriali</button><button data-mf-tab="mal-account">Moje MAL</button></nav>
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
    window.addEventListener('focus',()=>{
      const active=apiClient();
      if(!active && state.open){close();return;}
      if(active && state.open && !state.ready && !state.pending)load();
    });
    window.addEventListener('popstate',()=>{ if(new URL(location.href).searchParams.has('misioflix'))open(new URL(location.href).searchParams.get('misioflix')||'home',false); });
  }
  function urlFor(tab) {
    const u = new URL(location.href); u.searchParams.set('misioflix',tab); return u.pathname+u.search+u.hash;
  }
  function open(tab='home', addHistory=true) {
    inject();
    if (!apiClient()) { alert('Zaloguj się do Jellyfin, a potem otwórz misioflix.'); return; }
    const wasClosed = !state.open;
    state.open = true; state.tab = tab;
    $('#mf-portal').classList.remove('mf-hidden');
    document.body.classList.add('mf-is-open');
    if (addHistory) history.pushState({misioflix:tab},'',urlFor(tab));
    sessionStorage.setItem('mf-last-tab',tab);
    if (!state.ready && !state.pending) load(); else {render(); if (wasClosed && state.ready) {refreshResume();refreshMal();}}
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
    if(!apiClient())return;
    const accountToken=state.token;
    state.pending = (async()=>{
      try {
        const d=await get('catalog');
        if(accountToken!==state.token)return;
        state.items=d.items||[];state.genres=d.genres||{anime:[],media:[]};
        state.genreFrequency=buildGenreFrequency(state.items);state.homeRandom={};state.ready=true;
      } catch(e){state.ready=false; if(page)page.innerHTML='<section class="mf-error"><h2>Nie udało się pobrać katalogu</h2><p>'+h(e.message)+'</p><button data-mf-refresh>Spróbuj ponownie</button><p>Sprawdź czy pozycje zostały dodane do Jellyfin i czy ścieżki NFO są dostępne.</p></section>';return;}
      render();
      refreshResume();
      refreshMal();
    })();
    try {await state.pending;} finally {state.pending=null;}
  }
  // Popularity = count of titles carrying each genre in the user's accessible catalogue.
  // Anime frequencies are counted ONLY from anime NFO; all other titles use Jellyfin genres.
  function buildGenreFrequency(items) {
    const counts={anime:new Map(),media:new Map()};
    for(const item of items){
      const index=counts[item.anime?'anime':'media'];
      const unique=new Set((item.genres||[]).map(g=>String(g).trim().toLocaleLowerCase('pl')).filter(Boolean));
      for(const genre of unique)index.set(genre,(index.get(genre)||0)+1);
    }
    return counts;
  }
  function popularGenres(item,max=3) {
    const frequencies=state.genreFrequency[item.anime?'anime':'media']||new Map();
    return [...new Map((item.genres||[]).filter(Boolean).map((genre,i)=>[genre.toLocaleLowerCase('pl'),{genre,i}])).values()]
      .sort((a,b)=>(frequencies.get(b.genre.toLocaleLowerCase('pl'))||0)-(frequencies.get(a.genre.toLocaleLowerCase('pl'))||0)||a.i-b.i)
      .slice(0,max).map(x=>x.genre);
  }
  function genrePills(gs) {return (gs||[]).map(g=>'<span class="mf-pill">'+h(g)+'</span>').join('');}
  async function refreshResume(force=false){
    if(state.resumePending){
      if(!force) return state.resumePending;
      await state.resumePending;
    }
    state.resumeLoading=true;state.resumeError=false;
    state.resumePending=(async()=>{
      try {
        const result=await get('resume');
        state.resume=Array.isArray(result.items)?result.items:[];
        state.hiddenResume=Array.isArray(result.hidden)?result.hidden:[];
      }catch(_){state.resumeError=true;state.resume=[];state.hiddenResume=[];}
      finally{state.resumeLoading=false;state.resumePending=null;}
      if(state.open && state.tab==='home' && !state.detail)render();
    })();
    return state.resumePending;
  }
  // Custom paw artwork; displayed AFTER each value, never a generic star icon.
  const pawIcon='<svg class="mf-paw" viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="5.5" cy="11" rx="3.1" ry="4.1" transform="rotate(-20 5.5 11)"/><ellipse cx="12" cy="6.8" rx="3.2" ry="4.3"/><ellipse cx="20" cy="6.8" rx="3.2" ry="4.3"/><ellipse cx="26.5" cy="11" rx="3.1" ry="4.1" transform="rotate(20 26.5 11)"/><path d="M16 14.2c-5.5 0-10 6.5-9.5 10.3.4 3.5 4.2 4.4 7.1 3.2 1.4-.6 3.5-.6 4.9 0 2.9 1.2 6.7.3 7.1-3.2.5-3.8-4-10.3-9.6-10.3Z"/></svg>';
  function pawStat(value, label, color){
    if(value===null || value===undefined || value==='') return '';
    const n=Number(value);
    if(!Number.isFinite(n)) return '';
    const shown=color==='rating'?n.toFixed(1):(n>99?'99+':String(Math.max(0,Math.floor(n))));
    return `<span class="mf-stat mf-stat-${color}" aria-label="${label}: ${h(shown)}"><strong>${h(shown)}</strong>${pawIcon}</span>`;
  }
  function resumeEntry(x,hidden=false){
    const item=state.items.find(it=>it.id.toLowerCase()===String(x.catalog_id).toLowerCase());
    if(!item) return '';
    // NextUp may include suggestions for untouched series; show only series with recorded progress.
    if(x.next_up && item.watch_status==='unwatched') return '';
    const progress=Math.min(100,Math.max(0,Number(x.progress_percent)||0));
    const type=item.anime?'Anime':item.type==='Movie'?'Film':'Serial';
    const episode=(x.season!=null&&x.episode!=null)?`S${String(x.season).padStart(2,'0')}E${String(x.episode).padStart(2,'0')}`:'';
    const sub=episode?type+' · '+episode:type;
    const playback=x.next_up?'Następny odcinek':`${Math.round(progress)}% obejrzano`;
    return `<div class="mf-resume-card">
      <button type="button" class="mf-resume-item" data-mf-jellyfin="${h(x.id)}" title="Otwórz w Jellyfin: ${h(item.title)}">
        <span class="mf-resume-poster" data-image="${h(item.has_image?item.id:'')}"></span>
        <span class="mf-resume-info"><strong>${h(item.title)}</strong><small>${h(sub)} · ${h(playback)}</small>
        ${progress>0?`<span class="mf-progress"><span style="width:${progress}%"></span></span>`:''}</span>
        <span class="mf-resume-play" aria-hidden="true">▶</span></button>
      <button type="button" class="mf-resume-dismiss" ${hidden?'data-mf-resume-restore':'data-mf-resume-hide'}="${h(item.id)}" title="${hidden?'Przywróć do Oglądaj dalej':'Ukryj w Oglądaj dalej bez kasowania postępu'}" aria-label="${hidden?'Przywróć':'Ukryj'}: ${h(item.title)}">${hidden?'↶':'×'}</button>
    </div>`;
  }
  function continueWatchingHero(){
    const entries=state.resume.map(x=>resumeEntry(x)).filter(Boolean);
    const hidden=state.hiddenResume.map(x=>resumeEntry(x,true)).filter(Boolean);
    return `<aside class="mf-hero-resume" aria-label="Oglądaj dalej">
      <div class="mf-hero-resume-top"><h2>Oglądaj dalej</h2><span>${entries.length} ${entries.length===1?'pozycja':entries.length%10>=2&&entries.length%10<=4&&!(entries.length%100>=12&&entries.length%100<=14)?'pozycje':'pozycji'}</span></div>
      ${entries.length?`<div class="mf-resume-list" aria-label="Rozpoczęte produkcje">${entries.join('')}</div>`:
        `<p class="mf-resume-empty">${state.resumeLoading?'Wczytywanie postępu oglądania…':state.resumeError?'Nie udało się pobrać postępu. Możesz nadal przeglądać bibliotekę.':'Nie masz obecnie niedokończonych pozycji.'}</p>`}
      ${hidden.length?`<button class="mf-hidden-resume-toggle" type="button" data-mf-hidden-toggle aria-expanded="${state.showHiddenResume}">Ukryte (${hidden.length}) · ${state.showHiddenResume?'Zwiń':'Pokaż'}</button>
        ${state.showHiddenResume?`<div class="mf-resume-hidden" aria-label="Ukryte pozycje">${hidden.join('')}</div>`:''}`:''}
    </aside>`;
  }
  function userState(it){
    if(!it.anime || !state.mal.connected || !it.mal_id)return {rating:it.rating,status:it.watch_status};
    const entry=it.mal_id?state.mal.entries[String(it.mal_id)]:null;
    if(!entry)return {rating:null,status:'unwatched'};
    const status=entry.status==='completed'?'watched':
      ['watching','on_hold','dropped'].includes(entry.status)?'started':'unwatched';
    return {rating:entry.score>0?entry.score:null,status};
  }
  function mediaCard(it) {
    const user=userState(it);
    const status=['watched','started','unwatched'].includes(user.status)?user.status:'unwatched';
    const typ=it.anime?'ANIME':it.type==='Movie'?'FILM':'SERIAL';
    const stats=it.type==='Series'?pawStat(it.season_count,'Sezony','season')+pawStat(it.episode_count,'Odcinki','episode'):'';
    const rating=pawStat(user.rating,'Ocena użytkownika','rating');
    const format=it.anime?it.kind:''; // For movies / series, the badge already names the format.
    const meta=[it.year,format].filter(Boolean).join(' · ');
    const progress=Math.min(100,Math.max(0,Number(it.progress_percent)||0));
    return `<article class="mf-card mf-status-${status}" data-mf-id="${h(it.id)}" role="button" tabindex="0" aria-label="${h(it.title)} — szczegóły">
      <div class="mf-poster" data-image="${h(it.has_image?it.id:'')}">
        <span class="mf-icon" aria-hidden="true">▶</span>
        <div class="mf-poster-top"><div class="mf-poster-meta"><b class="mf-kind">${typ}</b>${meta?`<span class="mf-year-format">${h(meta)}</span>`:''}</div>
        ${stats||rating?`<div class="mf-stats-panel" aria-label="Statystyki produkcji">${stats}${rating}</div>`:''}</div>
        <div class="mf-poster-bottom"><div class="mf-poster-genres mf-pills">${genrePills(popularGenres(it,3))}</div></div>
        ${status==='started'&&progress>0?`<div class="mf-poster-progress"><span style="width:${progress}%"></span></div>`:''}
      </div>
      <div class="mf-card-body"><h3 title="${h(it.title||'Bez tytułu w NFO')}">${h(it.title||'Bez tytułu w NFO')}</h3>
        <p>${h(it.plot||'Brak opisu w źródle metadanych.')}</p></div>
    </article>`;
  }
  function recentSort(items){return [...items].sort((a,b)=>(b.date_added||'').localeCompare(a.date_added||'')||(a.title||'').localeCompare(b.title||'','pl'));}
  function shuffled(items){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
  function carousel(title,items,tab) {
    if(!items.length)return '';
    const ordered=recentSort(items);
    const randomIds=state.homeRandom[tab];
    const indexed=new Map(ordered.map(x=>[x.id,x]));
    const view=randomIds?randomIds.map(id=>indexed.get(id)).filter(Boolean):ordered;
    return `<section class="mf-section"><div class="mf-carousel-heading"><button type="button" class="mf-carousel-title" data-mf-tab="${tab}" aria-label="Otwórz katalog: ${h(title)}">${h(title)} <span aria-hidden="true">›</span></button>
      <div class="mf-carousel-controls">${randomIds?`<button type="button" data-mf-recent="${tab}">Najnowsze</button>`:''}
      <button type="button" data-mf-random="${tab}">Losuj ↻</button></div></div>
      <div class="mf-scroll">${view.slice(0,25).map(mediaCard).join('')}</div></section>`;
  }
  function home() {
    const all=state.items;
    const anime=all.filter(x=>x.anime),movies=all.filter(x=>!x.anime&&x.type==='Movie'),series=all.filter(x=>!x.anime&&x.type==='Series');
    return `<section class="mf-hero"><div class="mf-hero-content"><img src="/MisioFlix/assets/logo.png" alt="MisioFlix"><h1>Twój świat filmów i anime</h1><p>Własny katalog i wyszukiwanie. Oryginalny odtwarzacz Jellyfin.</p><div class="mf-hero-actions"><button data-mf-tab="search-anime" class="mf-primary">Wyszukaj anime</button><button data-mf-tab="search-media">Wyszukaj filmy i seriale</button></div></div>
      ${continueWatchingHero()}</section>
    ${all.length?'':`<div class="mf-empty"><h2>Biblioteka jest jeszcze pusta</h2><p>Dodaj produkcje w Jellyfin — wtedy pojawią się tu karuzele.</p></div>`}
    ${carousel('Ostatnio dodane',all,'recent')}${carousel('Anime',anime,'anime')}${carousel('Filmy',movies,'movies')}${carousel('Seriale',series,'series')}`;
  }
  function listings(kind) {
    const its=recentSort(state.items.filter(x=>kind==='recent'?true:kind==='anime'?x.anime:kind==='movies'?(!x.anime&&x.type==='Movie'):(!x.anime&&x.type==='Series')));
    const title=kind==='recent'?'Ostatnio dodane':kind==='anime'?'Anime':kind==='movies'?'Filmy':'Seriale';
    return `<section class="mf-section"><h1>${title}</h1><p class="mf-sub">${its.length} pozycji · od najnowszych</p>
      ${its.length?`<div class="mf-grid">${its.slice(0,state.pageSizes[kind]||60).map(mediaCard).join('')}</div>${its.length>(state.pageSizes[kind]||60)?`<button class="mf-more" data-mf-more="${kind}">Pokaż więcej (${its.length-(state.pageSizes[kind]||60)} pozostałych)</button>`:''}`:'<div class="mf-empty">Brak pozycji w bibliotece Jellyfin.</div>'}</section>`;
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
  function scoreChoices(value,allowHalves=true){
    const current=value==null?0:Number(value);
    let result=`<option value="">Bez oceny</option>`;
    for(let n=1;n<=10;n+=allowHalves?0.5:1){
      const str=String(n);result+=`<option value="${str}" ${current===n?'selected':''}>${str} / 10</option>`;
    }
    return result;
  }
  const malStatusLabels={watching:'Oglądam',completed:'Obejrzane',on_hold:'Wstrzymane',dropped:'Porzucone',plan_to_watch:'Do obejrzenia'};
  function malRow(it,season,caption){
    const malId=season?season.mal_id:it.mal_id;
    const record=malId?state.mal.entries[String(malId)]:null;
    if(!state.mal.connected)return `<p class="mf-mal-hint">Połącz konto MyAnimeList, aby edytować status, ocenę i powtórki.</p>`;
    if(!malId)return `<p class="mf-mal-hint">Brak &lt;uniqueid type="mal"&gt; w lokalnym NFO ${season?'tego sezonu':'anime'}.</p>`;
    const status=record?.status||'plan_to_watch';
    return `<div class="mf-mal-row" data-mf-mal-row data-mf-mal-parent="${h(it.id)}" ${season?`data-mf-mal-season="${h(season.id)}"`:''}>
      <strong>${h(caption)} · MAL #${malId}</strong>
      <label>Status<select data-mf-mal-field="status">${Object.entries(malStatusLabels).map(([k,label])=>`<option value="${k}" ${status===k?'selected':''}>${label}</option>`).join('')}</select></label>
      <label>Moja ocena<select data-mf-mal-field="score">${scoreChoices(record?.score,false)}</select></label>
      <label>Odcinki<input type="number" min="0" max="10000" data-mf-mal-field="episodes" value="${record?.episodes_watched??0}"></label>
      <label>Powtórki<input type="number" min="0" max="10000" data-mf-mal-field="repeats" value="${record?.times_rewatched??0}"></label>
      <button type="button" class="mf-primary" data-mf-save-mal>Zapisz w MAL</button>
    </div>`;
  }
  function ratingForm(it,season){
    const rating=season?season.rating:it.rating;
    return `<label class="mf-user-rating">Moja ocena (Jellyfin)
      <select data-mf-rating data-mf-rating-parent="${h(it.id)}" ${season?`data-mf-rating-season="${h(season.id)}"`:''}>
        ${scoreChoices(rating)}
      </select></label>`;
  }
  function malAccountControls(){
    const label=state.mal.username?`<strong class="mf-mal-username">${h(state.mal.username)}</strong>`:'<span>Identyfikowanie konta…</span>';
    return `<div class="mf-mal-account"><b>MyAnimeList</b>
      ${state.mal.connected?`${label}<span>Połączono</span><button type="button" data-mf-mal-refresh>Odśwież MAL</button><button type="button" data-mf-mal-disconnect>Odłącz</button>`:
      `<span>Brak połączenia</span><button type="button" data-mf-mal-connect>Połącz własne konto MAL</button>`}
      ${state.mal.error?`<small class="mf-mal-error">${h(state.mal.error)}</small>`:''}
      <button type="button" data-mf-tab="mal-account">Moje MAL →</button></div>`;
  }
  function malAccountPage(){
    return `<section class="mf-account-page">
      <h1>Moje MyAnimeList</h1>
      <p>Połączenie dotyczy wyłącznie aktualnie zalogowanego użytkownika Jellyfin.
         Każdy profil MisioFlix korzysta ze swojego konta MAL i może synchronizować je równocześnie z innymi profilami.</p>
      ${malAccountControls()}
      ${!state.mal.connected && state.mal.manualReady?`<div class="mf-mal-manual">
        <h2>Dokończ połączenie bez domeny HTTPS</h2>
        <p>1. Zaloguj się na stronie MyAnimeList otwartej w nowej karcie i zatwierdź dostęp.</p>
        <p>2. Po przekierowaniu na localhost strona może zgłosić błąd — to normalne. Skopiuj <strong>cały adres</strong> z paska, zawierający <code>code=</code> i <code>state=</code>.</p>
        <p>3. Wklej ten adres poniżej. Kod jest jednorazowy i ważny przez 10 minut. Nie przekazuj go nikomu.</p>
        <label for="mf-mal-pasted-url">Adres przekierowania MAL</label>
        <textarea id="mf-mal-pasted-url" data-mf-mal-redirect-text rows="3" placeholder="http://localhost:8765/callback?code=...&state=..." autocomplete="off" spellcheck="false"></textarea>
        <button type="button" class="mf-primary" data-mf-mal-complete>Połącz moje konto MAL</button>
        <small>Jeżeli nie możesz skopiować pełnego adresu lub kod wygasł, wybierz „Połącz własne konto MAL” ponownie.</small>
      </div>`:''}
      ${state.mal.connected?`<div class="mf-account-details">
        <div><small>Konto MyAnimeList</small><strong>${h(state.mal.username||'Sprawdzanie…')}</strong></div>
        <div><small>Identyfikator MAL</small><strong>${h(state.mal.malUserId??'—')}</strong></div>
        <div><small>Powiązanie</small><strong>Tylko bieżący użytkownik Jellyfin</strong></div>
      </div>`:`<p>Po połączeniu będą dostępne Twoje oceny, statusy, obejrzane odcinki i powtórki.
        Administrator konfiguruje tylko wspólny Client ID. Twoje hasło MAL nie jest przekazywane do MisioFlix.</p>`}
      <p class="mf-account-note">Tokeny MAL są odnawiane na serwerze automatycznie, również gdy nikt nie jest zalogowany
        i gdy telefon jest rozłączony z Tailscale. Odczyt listy oraz zapisywanie ocen i postępu pozostają świadomymi
        działaniami użytkownika — MisioFlix nie zmienia historii odtwarzania Jellyfin bez Twojej zgody.</p>
    </section>`;
  }
  function detail(it,episodes,seasons=[]) {
    const firstSeason=(seasons||[]).find(x=>x.number===1);
    const seasonRows=(seasons||[]).map(s=>`<div class="mf-season-row"><h3>${h(s.name||'Sezon '+(s.number||'?'))}</h3>
      ${s.number===1?'<small>Ocena pierwszego sezonu: w głównej sekcji produkcji</small>':(!it.anime||!state.mal.connected||!s.mal_id?ratingForm(it,s):'')}
      ${it.anime && s.number!==1?malRow(it,s,'Sezon '+(s.number??'?')):''}
      </div>`).join('');
    return `<section class="mf-detail"><button data-mf-back>← Wróć do katalogu</button><div class="mf-detail-grid">
      <div class="mf-detail-poster mf-poster" data-image="${h(it.has_image?it.id:'')}"><span class="mf-icon">▶</span></div>
      <div><h1>${h(it.title)}</h1><div class="mf-mini">${h(it.year||'—')}${it.anime&&it.kind?' · '+h(it.kind):''}</div><div class="mf-pills">${genrePills(it.genres)}</div>
      <p>${h(it.plot||'Brak opisu w źródle metadanych.')}</p>
      ${it.anime?malAccountControls():''}
      ${!it.anime||!state.mal.connected||!it.mal_id?ratingForm(it,null):''}
      ${it.anime?malRow(it,null,'Pierwszy sezon / seria'):''}
      <div class="mf-actions"><button class="mf-primary" data-mf-jellyfin="${h(it.id)}">Otwórz w Jellyfin</button><button data-mf-back>Powrót</button></div>
      <small>Odtwarzacz pozostaje oryginalny Jellyfin.</small></div></div>
      ${seasonRows?`<h2>Sezony</h2><div class="mf-season-list">${seasonRows}</div>`:''}
      ${episodes?.length?`<h2>Odcinki</h2><div class="mf-episode-grid">${episodes.map(x=>`<button data-mf-jellyfin="${h(x.id)}" class="mf-episode">S${h(x.season??'?')}E${h(x.number??'?')} · ${h(x.title||'Odcinek')} <span>▶</span></button>`).join('')}</div>`:''}</section>`;
  }
  function applyActiveTabs(){$$('[data-mf-tab]',$('#mf-portal')).forEach(x=>x.classList.toggle('active',x.dataset.mfTab===state.tab));}
  function render() {
    if (!state.open || !state.ready) return;
    const page=$('#mf-content'); if(!page)return;
    for (const url of state.objectUrls) URL.revokeObjectURL(url);state.objectUrls=[];
    if(state.detail){page.innerHTML=detail(state.detail.item,state.detail.episodes,state.detail.seasons);}
    else if(state.tab==='home')page.innerHTML=home();
    else if(state.tab==='mal-account')page.innerHTML=malAccountPage();
    else if(['recent','anime','movies','series'].includes(state.tab))page.innerHTML=listings(state.tab);
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
    const random=e.target.closest('[data-mf-random]');
    if(random){
      const key=random.dataset.mfRandom;
      const source=state.items.filter(x=>key==='recent'?true:key==='anime'?x.anime:key==='movies'?(!x.anime&&x.type==='Movie'):(!x.anime&&x.type==='Series'));
      state.homeRandom[key]=shuffled(source).map(x=>x.id);render();return;
    }
    const recent=e.target.closest('[data-mf-recent]');
    if(recent){delete state.homeRandom[recent.dataset.mfRecent];render();return;}
    if(e.target.closest('[data-mf-mal-connect]')){malConnect().catch(err=>alert(err.message));return;}
    if(e.target.closest('[data-mf-mal-complete]')){
      const button=e.target.closest('[data-mf-mal-complete]');button.disabled=true;
      finishManualMal().catch(err=>{button.disabled=false;alert(err.message);});return;
    }
    if(e.target.closest('[data-mf-mal-refresh]')){refreshMal(true);return;}
    if(e.target.closest('[data-mf-mal-disconnect]')){
      if(!confirm('Odłączyć MyAnimeList od tego konta MisioFlix? Oceny pozostaną w MAL.'))return;
      post('mal/disconnect').then(()=>refreshMal(true)).catch(err=>alert(err.message));return;
    }
    const save=e.target.closest('[data-mf-save-mal]');
    if(save){save.disabled=true;saveMalRow(save).catch(err=>{save.disabled=false;alert(err.message)});return;}
    const tab=e.target.closest('[data-mf-tab]');if(tab){toTab(tab.dataset.mfTab);return;}
    if(e.target.closest('[data-mf-close]')){close();return;}
    if(e.target.closest('[data-mf-back]')){state.detail=null;render();return;}
    if(e.target.closest('[data-mf-refresh]')){load(true);return;}
    const hide=e.target.closest('[data-mf-resume-hide]');
    const restore=e.target.closest('[data-mf-resume-restore]');
    if(hide||restore){
      const element=hide||restore;
      element.disabled=true;
      saveResumeVisibility(element.dataset.mfResumeHide||element.dataset.mfResumeRestore,!!hide)
        .catch(err=>{element.disabled=false;alert(err.message);});
      return;
    }
    if(e.target.closest('[data-mf-hidden-toggle]')){state.showHiddenResume=!state.showHiddenResume;render();return;}
    const nf=e.target.closest('[data-mf-jellyfin]');if(nf){openNative(nf.dataset.mfJellyfin);return;}
    const more=e.target.closest('[data-mf-more]');if(more){state.pageSizes[more.dataset.mfMore]+=60;render();return;}
    const clear=e.target.closest('[data-mf-clear]');if(clear){state.search[clear.dataset.mfClear]={q:'',type:'',year:'',include:[],exclude:[]};render();return;}
    const genre=e.target.closest('[data-mf-genre]');if(genre){const f=state.search[genre.dataset.mfScope],g=genre.dataset.mfGenre;
      if(f.include.includes(g)){f.include=f.include.filter(x=>x!==g);f.exclude.push(g);}
      else if(f.exclude.includes(g))f.exclude=f.exclude.filter(x=>x!==g);
      else f.include.push(g);render();return;}
    const card=e.target.closest('[data-mf-id]');if(card)showDetails(card.dataset.mfId);
  }
  function changed(e){
    const rating=e.target.closest('[data-mf-rating]');
    if(rating && e.type==='change'){
      rating.disabled=true;
      savePersonalRating(rating.dataset.mfRatingParent,rating.dataset.mfRatingSeason||null,
        rating.value===''?null:Number(rating.value))
        .catch(err=>{rating.disabled=false;alert(err.message)});
      return;
    }
    const input=e.target.closest('[data-mf-input]');if(!input)return;
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
