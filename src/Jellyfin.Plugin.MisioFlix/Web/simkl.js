/* MisioFlix Simkl module v0.4.52 — independent of MAL.
 * Server-side Jellyfin playback events mark watched after 75%; other writes manual.
 * User-separated NAS backup, offline export and local rewatch counters.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_SIMKL_046__) return;
  window.__MISIOFLIX_SIMKL_046__ = true;
  const API='/MisioFlix/api/simkl';
  const ID=/^[0-9a-f]{32}$/i;
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
  const compact=value=>String(value||'').replace(/-/g,'').toLowerCase();
  const valid=value=>ID.test(compact(value));
  const client=()=>window.ApiClient||window.ConnectionManager?.getApiClient?.();
  const user=()=>compact(client()?.getCurrentUserId?.());
  const token=()=>{const api=client();const value=typeof api?.accessToken==='function'?api.accessToken():api?.accessToken;return typeof value==='string'?value:'';};
  const headers=()=>({Authorization:`MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-simkl", Version="0.4.52", Token="${token().replace(/["\r\n]/g,'')}"`});
  async function request(route,method='GET',body){
    const controller=new AbortController();const timer=window.setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch(API+route,{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,
        headers:{...headers(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(String(result.error||`Błąd Simkl: HTTP ${response.status}`));
      return result;
    }catch(e){if(e.name==='AbortError')throw new Error('Przekroczono czas odpowiedzi serwera.');throw e;}
    finally{window.clearTimeout(timer);}
  }
  function routeParams(){try{return new URLSearchParams((window.location.hash||'').split('?')[1]||'');}catch{return new URLSearchParams();}}
  const detailId=()=>/^#\/details\?/i.test(location.hash||'')?compact(routeParams().get('id')):'';
  const home=()=>/^#\/(?:home)?(?:\?|$)/i.test(location.hash||'#/home') && (routeParams().get('tab')||'0')==='0' && !routeParams().has('mfCollections');
  function pageFor(id){return [...document.querySelectorAll('#itemDetailPage.mf-detail-compact')].reverse().find(p=>p.isConnected&&p.dataset.mfDetailId===id&&p.getClientRects().length>0)||null;}
  function statuses(kind){return kind==='movies'
    ? [['plantowatch','Planuję obejrzeć'],['completed','Obejrzane'],['dropped','Porzucone']]
    : [['plantowatch','Planuję obejrzeć'],['watching','Oglądam'],['completed','Obejrzane'],['hold','Wstrzymane'],['dropped','Porzucone']];}
  const statusName=(kind,status)=>Object.fromEntries(statuses(kind))[status]||'Nieznany';
  const select=(options,selected)=>{const input=el('select');for(const [v,label] of options){const option=el('option','',label);option.value=v;input.append(option);}input.value=String(selected);return input;};
  const field=(title,input,description)=>{const label=el('label','mf-simkl-field');label.append(el('span','',title),input);if(description)label.append(el('small','',description));return label;};
  let currentUser='',currentDetail='',panel=null,modal=null,button=null,connection=null,connectionPromise=null;
  let generation=0,timer=0;
  const sessions=new Map();
  const lastSyncCheck=new Map();
  function maybeScheduledSync(){
    if(!connection?.connected||!valid(currentUser))return;
    const last=lastSyncCheck.get(currentUser)||0;
    if(Date.now()-last<60*60*1000)return;
    lastSyncCheck.set(currentUser,Date.now());
    void request('/sync-check').then(data=>{if(data?.checkedOk)resetCardScores();}).catch(()=>{});
  }
  // v0.4.52 — Independent Simkl frame state. Unlike MAL, this combines
  // Simkl's personal list and Jellyfin's actual (non-NextUp) resume positions.
  const cardStates=new Map();
  let resumeForUser=new Set(),resumeSeasons=new Map(),resumeReadAt=0,resumeReadPromise=null;
  function simklFrame(entry,fallback='',resuming=false){
    const status=String(entry?.status||'').toLowerCase();
    const alreadyWatched=status==='completed'||(!status&&fallback==='watched');
    if(alreadyWatched)return resuming?'mixed':'watched';
    if(resuming||status==='watching'||fallback==='started'||
      (Number(entry?.watchedEpisodes)>0&&status!=='completed'))return 'started';
    return 'unwatched';
  }
  function clearDetailFrames(){
    document.querySelectorAll('#itemDetailPage.mf-simkl-detail-ready').forEach(page=>{
      page.classList.remove('mf-simkl-detail-ready');
      page.removeAttribute('data-mf-simkl-watch');
      page.querySelector('.mf-simkl-detail-score')?.remove();
    });
  }
  function updateFrameOnCard(card,entry,native,id){
    const fallback=card.getAttribute('data-mf-watch')||'';
    const watching=resumeForUser.has(id);
    card.setAttribute('data-mf-simkl-watch',simklFrame(entry,fallback,watching));
  }
  function decorateDetailFrame(session){
    const page=pageFor(session.id);
    if(!page||!session.data?.relevant||session.phase!=='ready')return;
    const data=session.data,entry=data.entry;
    const type=session.episodeId?'Episode':session.seasonId?'Season':
      data.kind==='movies'?'Movie':'Series';
    if(!['Movie','Series','Season'].includes(type))return;
    const mainId=session.catalogId;
    const season=Number(data.seasonNumber);
    const seasonWatched=Array.isArray(data.watchedEpisodeNumbers)?data.watchedEpisodeNumbers.length:0;
    const seasonTotal=Array.isArray(data.episodeNumbers)?data.episodeNumbers.length:0;
    const inProgress=resumeForUser.has(mainId) &&
      (type!=='Season'||resumeSeasons.get(mainId)?.has(season)===true);
    const fallback=type==='Season'
      ?(seasonTotal>0&&seasonWatched===seasonTotal?'watched':seasonWatched>0?'started':'unwatched')
      :String(page.dataset.mfSimklJellyfinWatch||'');
    const seasonEntry=type==='Season' ? {
      status:seasonTotal>0&&seasonWatched===seasonTotal?'completed':seasonWatched>0?'watching':'plantowatch',
      watchedEpisodes:seasonWatched
    } : entry;
    page.classList.add('mf-simkl-detail-ready');
    page.setAttribute('data-mf-simkl-watch',simklFrame(seasonEntry,fallback,inProgress));
    // A personal score is NOT a Jellyfin community score; display beside
    // native play/heart buttons only on the Movie/Series detail header.
    const actions=page.querySelector('.mainDetailButtons');
    let badge=page.querySelector('.mf-simkl-detail-score');
    if(type==='Season'||!data.connected){badge?.remove();return;}
    if(!actions)return;
    if(!badge){badge=el('span','mf-simkl-detail-score');actions.prepend(badge);}
    badge.replaceChildren();
    const rating=Number(entry?.score);
    const value=Number.isInteger(rating)&&rating>=1&&rating<=10?`${rating}/10`:'Bez oceny';
    badge.append(el('span','mf-simkl-detail-score-number',value),simklPaw(),el('span','mf-simkl-detail-score-source','Simkl'));
    badge.title='Moja ocena na Simkl — konto aktualnie zalogowanego użytkownika';
  }
  function updateAllFrames(){
    if(!valid(currentUser))return;
    decorateCardScores();
    const session=sessions.get(`${currentUser}:${currentDetail}`);
    if(session)decorateDetailFrame(session);
  }
  function refreshResume(force=false){
    const id=currentUser;
    if(!valid(id)||!token())return Promise.resolve();
    if(resumeReadPromise)return resumeReadPromise;
    if(!force&&Date.now()-resumeReadAt<65000)return Promise.resolve();
    resumeReadAt=Date.now();
    const run=(async()=>{
      try{
        const response=await fetch('/MisioFlix/api/resume',{headers:headers(),cache:'no-store'});
        if(!response.ok)throw new Error(`Jellyfin resume: HTTP ${response.status}`);
        const body=await response.json();
        if(id!==currentUser)return;
        const ids=new Set(),seasons=new Map();
        for(const row of (Array.isArray(body?.items)?body.items:[])){
          // NextUp is a suggestion, NOT an active playback position. Hidden
          // Resume entries are deliberately excluded from "Oglądaj dalej".
          if(row?.next_up===true||!(Number(row?.position_ticks)>0))continue;
          const catalog=compact(row.catalog_id);
          if(!valid(catalog))continue;
          ids.add(catalog);
          const season=Number(row.season);
          if(Number.isInteger(season)&&season>=0){
            if(!seasons.has(catalog))seasons.set(catalog,new Set());
            seasons.get(catalog).add(season);
          }
        }
        resumeForUser=ids;resumeSeasons=seasons;
        updateAllFrames();
      }catch{
        // Keep last verified resume states rather than switching a green/gold
        // frame to pink during temporary server errors.
        if(id===currentUser)resumeReadAt=Date.now()-30000;
      }
    })();
    resumeReadPromise=run.finally(()=>{if(resumeReadPromise===pending)resumeReadPromise=null;});
    const pending=resumeReadPromise;
    return pending;
  }
  function resetUser(){
    const id=user();if(id===currentUser)return;
    currentUser=id;connection=null;connectionPromise=null;button=null;sessions.clear();generation++;
    cardScores.clear();cardStates.clear();pendingScoreIds.clear();scoreRetryAfter=0;
    resumeForUser=new Set();resumeSeasons=new Map();resumeReadAt=0;resumeReadPromise=null;
    clearDetailFrames();
    document.querySelectorAll('[data-mf-simkl-watch]').forEach(node=>node.removeAttribute('data-mf-simkl-watch'));
    document.querySelectorAll('.mf-simkl-home-score,.mf-simkl-native-score').forEach(node=>node.remove());
    document.querySelectorAll('[data-mf-simkl-score]').forEach(node=>node.removeAttribute('data-mf-simkl-score'));
    panel?.remove();panel=null;currentDetail='';closeModal();
  }
  async function getConnection(force=false){
    resetUser();if(!valid(currentUser)||!token())return {connected:false};
    if(connection&&!force){maybeScheduledSync();return connection;}
    if(connectionPromise&&!force)return connectionPromise;
    const id=currentUser;
    const pending=request('/connection').then(data=>{if(id===currentUser){connection=data;syncHomeButton();maybeScheduledSync();}return data;})
      .finally(()=>{if(id===currentUser)connectionPromise=null;});
    connectionPromise=pending;return pending;
  }
  function syncHomeButton(){
    if(button?.isConnected){button.textContent=connection?.connected?'Simkl: połączono':'Połącz Simkl';
      button.title=connection?.connected?'Osobne połączenie tego użytkownika Jellyfin z Simkl':'Połącz osobne konto Simkl';}
  }
  function mountHome(){
    const container=home()?document.querySelector('.mf-home-hero .mf-home-folder-buttons'):null;
    if(!container)return;
    let b=container.querySelector('.mf-home-simkl-button');
    if(!b){b=el('button','mf-home-folder-button mf-home-simkl-button','Połącz Simkl');b.type='button';
      b.setAttribute('aria-label','Połącz lub zarządzaj kontem Simkl');b.addEventListener('click',openModal);container.append(b);}
    button=b;syncHomeButton();
    if(!connection&&!connectionPromise)void getConnection().catch(()=>{if(b.isConnected)b.textContent='Simkl — ustawienia';});
  }
  function closeModal(){modal?.remove();modal=null;}
  async function openModal(){
    if(modal)return;
    const cover=el('div','mf-simkl-modal-overlay');
    const dialog=el('section','mf-simkl-modal');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Konto Simkl');
    const top=el('div','mf-simkl-modal-head');const close=el('button','','×');close.type='button';close.title='Zamknij';close.onclick=closeModal;
    top.append(el('h2','','Simkl'),close);
    const body=el('div','mf-simkl-modal-body');const message=el('p','mf-simkl-message','Sprawdzanie połączenia…');
    dialog.append(top,body);cover.append(dialog);document.body.append(cover);modal=cover;
    cover.addEventListener('click',e=>{if(e.target===cover)closeModal();});
    const action=(label,fn)=>{const b=el('button','mf-simkl-action',label);b.type='button';b.addEventListener('click',fn);return b;};
    const note=msg=>{message.textContent=msg;};
    function addExport(){
      body.append(action('Eksportuj lokalną kopię Simkl (JSON)',async()=>{
        try{
          const response=await fetch(API+'/export',{headers:headers(),credentials:'same-origin',cache:'no-store'});
          if(!response.ok)throw new Error('Nie można pobrać lokalnej kopii Simkl.');
          const url=URL.createObjectURL(await response.blob());
          const a=el('a');a.href=url;a.download='MisioFlix_Simkl_Backup_'+new Date().toISOString().slice(0,10)+'.json';
          document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),10000);
        }catch(e){note(e.message);}
      }));
    }
    function draw(c){
      body.replaceChildren(message);
      if(c?.connected){
        note('Simkl jest połączony z tym użytkownikiem Jellyfin. Obejrzenie filmu lub odcinka po 75% automatycznie zapisuje historię. Pozostałe zmiany wymagają ręcznej edycji.');
        body.append(el('p','mf-simkl-message',c.canWrite?'Dostęp do ręcznej edycji: aktywny.':'Brak uprawnienia media:write — połącz konto ponownie.'));
        body.append(action('Sprawdź status',async()=>{try{connection=null;draw(await getConnection(true));}catch(e){note(e.message);}}));
        addExport();
        body.append(action('Rozłącz Simkl',async()=>{
          if(!window.confirm('Odłączyć Simkl dla tego użytkownika Jellyfin? Lista Simkl pozostanie bez zmian.'))return;
          try{await request('/disconnect','POST');connection={connected:false};sessions.clear();syncHomeButton();draw(connection);}
          catch(e){note(e.message);}
        }));
        return;
      }
      note('Połącz własne konto Simkl. Używany jest osobny kod PIN AUTH V2. Połączenie i lokalny backup należą tylko do tego użytkownika.');
      addExport();
      body.append(action('Rozpocznij łączenie Simkl',async()=>{
        try{
          const result=await request('/connect','POST');
          body.replaceChildren(message);
          note('Wpisz kod na stronie Simkl i zatwierdź dostęp. Następnie kliknij „Sprawdź zatwierdzenie”.');
          // Never create a blank PIN or a relative /web/undefined link if the
          // backend changes its JSON serializer profile or returns bad data.
          if(typeof result?.code!=='string'||!/^[a-z0-9-]{4,32}$/i.test(result.code))
            throw new Error('Nie otrzymano poprawnego kodu PIN Simkl. Odśwież stronę i spróbuj ponownie.');
          const code=el('strong','mf-simkl-pin',result.code);
          const link=el('a','mf-simkl-link','Otwórz simkl.com/pin');
          link.href='https://simkl.com/pin/';link.rel='noopener noreferrer';link.target='_blank';
          const status=el('p','mf-simkl-message');
          const check=action('Sprawdź zatwierdzenie',async()=>{
            check.disabled=true;
            try{
              const outcome=await request('/poll','POST');
              if(outcome.connected){connection=null;const latest=await getConnection(true);draw(latest);sessions.clear();schedule();}
              else status.textContent=`Jeszcze nie zatwierdzono. Ponów za ${outcome.retryAfter||result.interval} s.`;
            }catch(e){status.textContent=e.message;}finally{check.disabled=false;}
          });
          body.append(code,link,check,status);
        }catch(e){note(e.message);}
      }));
    }
    try{draw(await getConnection());}catch(e){note(e.message);body.append(action('Ponów',()=>{connection=null;void getConnection(true).then(draw).catch(x=>note(x.message));}));}
  }
  function toast(text){
    document.querySelector('.mf-simkl-toast')?.remove();const elToast=el('div','mf-simkl-toast',text);
    elToast.setAttribute('role','status');document.body.append(elToast);window.setTimeout(()=>elToast.remove(),4500);
  }
  function renderReady(session){
    if(!panel?.isConnected||session.id!==currentDetail||session.user!==currentUser)return;
    const content=panel.querySelector('.mf-simkl-content');content.replaceChildren();
    const data=session.data,entry=data.entry,kind=data.kind,season=data.seasonNumber;
    decorateDetailFrame(session);
    const isSeason=kind==='shows'&&season!==null&&season!==undefined;
    const isEpisode=isSeason&&Number.isInteger(data.episodeNumber)&&data.episodeNumber>0;
    const seasonEpisodes=isSeason&&Array.isArray(data.episodeNumbers)
      ? [...new Set(data.episodeNumbers.filter(n=>Number.isInteger(n)&&n>0))].sort((a,b)=>a-b) : [];
    const knownWatched=isSeason&&Array.isArray(data.watchedEpisodeNumbers)
      ? new Set(data.watchedEpisodeNumbers.filter(n=>Number.isInteger(n)&&n>0)) : new Set();
    const watchedLocal=seasonEpisodes.filter(n=>knownWatched.has(n)).length;
    const same=()=>session.id===currentDetail&&session.user===currentUser&&panel?.isConnected;
    async function reload(){
      const latest=await request(`/item?catalogId=${session.catalogId}${session.seasonId?'&seasonId='+session.seasonId:''}${session.episodeId?'&episodeId='+session.episodeId:''}&refresh=true`);
      if(!same())return;
      session.data=latest;session.at=Date.now();session.phase='ready';renderReady(session);
      resetCardScores();
      void refreshResume(true);
    }
    // On an episode there is ONLY one field, on desktop and Android.
    // The dropdown itself commits; no other Simkl controls, rating or rewatch.
    if(isEpisode){
      const watched=data.episodeWatched===true;
      const status=select([['false','Nie obejrzany'],['true','Obejrzany']],String(watched));
      status.className='mf-simkl-episode-select';
      const label=field('Status',status);
      const feedback=el('span','mf-simkl-save-message');feedback.setAttribute('role','status');
      const holder=el('div','mf-simkl-episode-status');holder.append(label,feedback);
      content.append(holder);
      if(data.localBackup)content.append(el('p','mf-simkl-offline','Dane z lokalnej kopii NAS (Simkl chwilowo niedostępny).'));
      status.addEventListener('change',async()=>{
        const wanted=status.value==='true';
        status.disabled=true;feedback.textContent='Zapisywanie…';
        try{
          await request('/episode-history','POST',{catalogId:session.catalogId,
            seasonId:session.seasonId,episodeId:session.episodeId,watched:wanted});
          if(!same())return;
          session.data.episodeWatched=wanted;
          feedback.textContent='✓ Zapisano';
          toast('✓ Zmieniono stan odcinka w Simkl');
          try{await reload();}catch(e){feedback.textContent='Zapisano; lokalne odświeżenie później: '+e.message;}
        }catch(e){status.value=String(watched);feedback.textContent=e.message;}
        finally{status.disabled=false;}
      });
      return;
    }
    const rows=[
      ['Moja ocena',entry?.score>0?`${entry.score}/10`:'Bez oceny'],
      ['Status serialu',isSeason?(entry?statusName(kind,entry.status):'Nie dodano do Simkl'):''],
      ['Ponowne obejrzenia',String(data.rewatches??0)],
      ['Obejrzane odcinki',isSeason?(isEpisode?(data.episodeWatched?'Tak':'Nie'):`${watchedLocal} / ${seasonEpisodes.length}`):
        kind==='shows'?(entry?.watchedEpisodes??'Brak danych'):'Nie dotyczy']
    ];
    if(!isSeason)rows[1]=['Status',entry?statusName(kind,entry.status):'Nie dodano do Simkl'];
    const read=el('div','mf-simkl-readonly');
    for(const [label,value] of rows){const cell=el('div','mf-simkl-readonly-cell');cell.append(el('span','mf-simkl-readonly-label',label),el('strong','mf-simkl-readonly-value',value));read.append(cell);}
    content.append(read);
    if(isSeason&&!isEpisode)content.append(el('p','mf-simkl-summary',
      `Sezon ${season}: operacje w tym panelu zmieniają wyłącznie historię odcinków tego sezonu. Ocena dotyczy całego serialu — edytuj ją na stronie serialu.`));
    if(kind==='shows'&&!isSeason)content.append(el('p','mf-simkl-summary',
      'Status i ocena dotyczą całego serialu. Obejrzenie konkretnych sezonów lub odcinków ustawisz na stronie sezonu.'));
    if(data.localBackup)content.append(el('p','mf-simkl-offline',
      'Wyświetlana jest ostatnia lokalna kopia danych z NAS. Gdy Simkl odzyska dostępność, zostanie ponowiona synchronizacja.'));
    // Rewatch counters never leave the NAS and have separate identities for
    // whole show, each season and each movie.
    function rewatchEditor(host){
      const wrapper=el('div','mf-simkl-rewatch');
      const count=el('input');count.type='number';count.min='0';count.max='100000';count.step='1';count.value=String(data.rewatches??0);
      const save=el('button','mf-simkl-action-secondary','Zapisz ponowne obejrzenia lokalnie');save.type='button';
      const feedback=el('span','mf-simkl-save-message');feedback.setAttribute('role','status');
      wrapper.append(field('Ponowne obejrzenia (tylko MisioFlix)',count),save,feedback);
      save.addEventListener('click',async()=>{
        const value=Number(count.value);
        if(!Number.isInteger(value)||value<0||value>100000){feedback.textContent='Wpisz liczbę 0–100000.';return;}
        save.disabled=true;feedback.textContent='Zapisywanie na NAS…';
        try{
          await request('/rewatch','POST',{catalogId:session.catalogId,
            seasonId:session.seasonId||null,count:value});
          if(!same())return;
          session.data.rewatches=value;feedback.textContent='✓ Zapisano na NAS';
          const cell=panel?.querySelectorAll('.mf-simkl-readonly-value')?.[2];
          if(cell)cell.textContent=String(value);
        }catch(e){feedback.textContent=e.message;}
        finally{save.disabled=false;}
      });
      host.append(wrapper);
    }
    const refresh={disabled:false}; // no user-facing refresh; save handlers share one busy flag
    if(isSeason){
      const editor=el('details','mf-simkl-editor');
      editor.append(el('summary','mf-simkl-editor-toggle',`Edytuj sezon ${season} w Simkl`));
      const form=el('div','mf-simkl-form mf-simkl-season-editor');
      const info=el('p','mf-simkl-summary','Wybierz obejrzenie całego sezonu albo zaznacz konkretne odcinki. Zmiany zostaną wysłane wyłącznie po potwierdzeniu.');
      form.append(info);
      const bulk=el('div','mf-simkl-season-actions');
      const all=el('button','mf-simkl-action','Oznacz sezon jako obejrzany');all.type='button';
      const none=el('button','mf-simkl-action-secondary','Oznacz sezon jako nieobejrzany');none.type='button';
      const message=el('span','mf-simkl-save-message');message.setAttribute('role','status');
      bulk.append(all,none);form.append(bulk);
      async function writeSeason(watched,numbers){
        return request('/season-history','POST',{catalogId:session.catalogId,seasonId:session.seasonId,
          watched,episodeNumbers:numbers});
      }
      async function submitBulk(watched){
        if(!window.confirm(`Czy na pewno ${watched?'oznaczyć jako obejrzane':'cofnąć obejrzenie'} wszystkie odcinki sezonu ${season} w Simkl? Pozostałe sezony nie zostaną zmienione.`))return;
        all.disabled=true;none.disabled=true;refresh.disabled=true;message.textContent='Zapisywanie historii sezonu…';
        try{
          await writeSeason(watched,null);
          if(!same())return;
          toast('✓ Zapisano historię sezonu w Simkl');
          await reload();
        }catch(e){message.textContent=e.message+' Odśwież widok później, jeżeli Simkl nie odpowiada.';}
        finally{all.disabled=false;none.disabled=false;refresh.disabled=false;}
      }
      all.addEventListener('click',()=>void submitBulk(true));
      none.addEventListener('click',()=>void submitBulk(false));
      if(seasonEpisodes.length){
        form.append(el('h4','mf-simkl-episodes-heading','Pojedyncze odcinki'));
        const list=el('div','mf-simkl-episodes');
        const boxes=new Map();
        for(const n of seasonEpisodes){
          const label=el('label','mf-simkl-episode');
          const check=el('input');check.type='checkbox';check.checked=knownWatched.has(n);
          label.append(check,el('span','',`Odcinek ${n}`));list.append(label);boxes.set(n,check);
        }
        form.append(list);
        const row=el('div','mf-simkl-detail-actions');
        const save=el('button','mf-simkl-action','Zapisz wybrane odcinki');save.type='button';
        row.append(save,message);form.append(row);
        save.addEventListener('click',async()=>{
          const add=[],remove=[];
          for(const [n,check] of boxes){if(check.checked&&!knownWatched.has(n))add.push(n);
            if(!check.checked&&knownWatched.has(n))remove.push(n);}
          if(!add.length&&!remove.length){message.textContent='Nie zmieniono odcinków.';return;}
          if(!window.confirm(`Zaktualizować tylko sezon ${season}? Oznaczysz ${add.length} odcinków jako obejrzane i cofniesz ${remove.length}.`))return;
          save.disabled=true;all.disabled=true;none.disabled=true;refresh.disabled=true;message.textContent='Zapisywanie odcinków…';
          try{
            if(add.length)await writeSeason(true,add);
            if(remove.length)await writeSeason(false,remove);
            if(!same())return;
            toast('✓ Zapisano wybrane odcinki w Simkl');
            await reload();
          }catch(e){message.textContent=e.message+' Część zmian mogła zostać zapisana — odśwież historię przed ponowną próbą.';}
          finally{save.disabled=false;all.disabled=false;none.disabled=false;refresh.disabled=false;}
        });
      }else{
        form.append(el('p','mf-simkl-summary','Nie znaleziono odcinków tego sezonu w Jellyfin. Można nadal oznaczyć cały sezon w Simkl.'));
        form.append(message);
      }
      editor.append(form);rewatchEditor(editor);content.append(editor);
      return; // Crucial: never mount whole-show status/rating editor on a season.
    }
    if(entry===null)content.append(el('p','mf-simkl-summary',
      'Tego tytułu nie ma jeszcze na Twojej liście Simkl. Wybierz status i dodaj go ręcznie.'));
    const editor=el('details','mf-simkl-editor');editor.append(el('summary','mf-simkl-editor-toggle',entry===null?'Dodaj do Simkl':'Edytuj Simkl'));
    const status=select(statuses(kind),entry?.status||'plantowatch');
    const score=select([['0','Bez oceny'],...Array.from({length:10},(_,i)=>[String(i+1),`${i+1}/10`])],String(entry?.score||0));
    const form=el('form','mf-simkl-form');form.append(field('Status',status),field('Moja ocena',score));
    const saveRow=el('div','mf-simkl-detail-actions');const save=el('button','mf-simkl-action',entry===null?'Dodaj do Simkl':'Zapisz w Simkl');save.type='submit';
    const result=el('span','mf-simkl-save-message');result.setAttribute('role','status');
    saveRow.append(save,result);form.append(saveRow);editor.append(form);rewatchEditor(editor);content.append(editor);
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const changedStatus=entry==null||status.value!==entry.status;
      const changedScore=Number(score.value)!==Number(entry?.score||0);
      if(!changedStatus&&!changedScore){result.textContent='Nie zmieniono żadnego pola.';return;}
      if(entry==null){if(!window.confirm('Dodać ten film lub serial do Twojej listy Simkl?'))return;}
      else if(!window.confirm('Zapisać wybrane zmiany w Simkl? To jedyna operacja, która modyfikuje Twoją listę Simkl.'))return;
      save.disabled=true;refresh.disabled=true;result.textContent='Zapisywanie w Simkl…';
      try{
        await request('/update','POST',{catalogId:session.catalogId,seasonId:null,
          status:status.value,score:Number(score.value),changeStatus:changedStatus,changeScore:changedScore,
          createIfMissing:entry==null});
        if(!same())return;
        toast('✓ Zapisano zmiany w Simkl');
        try{await reload();}catch(e){result.textContent='Zapisano, ale odświeżenie nie powiodło się: '+e.message;}
      }catch(e){result.textContent=e.message;}finally{save.disabled=false;refresh.disabled=false;}
    });
  }
  function show(session){
    if(!panel?.isConnected||currentDetail!==session.id||currentUser!==session.user)return;
    // Panel visible only after authenticated server-side non-AnimePL check.
    if(!session.data?.relevant){panel.hidden=true;return;}
    panel.hidden=false;
    const content=panel.querySelector('.mf-simkl-content');if(!content)return;
    if(session.phase==='ready'){renderReady(session);return;}
    content.replaceChildren(el('p','mf-simkl-message',session.message||'Sprawdzanie Simkl…'));
    if(session.phase==='disconnected'){
      const link=el('a','mf-simkl-link','Połącz Simkl na stronie głównej');link.href='#/home';content.append(link);
    }
    if(session.phase==='missing')content.append(el('p','mf-simkl-summary','Uzupełnij w metadanych Jellyfin identyfikator TMDB, IMDb lub TVDB. Nie wyszukujemy materiału automatycznie po podobnej nazwie.'));
    if(session.phase==='error'){
      const retry=el('button','mf-simkl-action-secondary','Ponów sprawdzanie');retry.type='button';retry.onclick=()=>void read(session,true);content.append(retry);
    }
  }
  function read(session,retry=false){
    if(session.phase==='loading')return session.promise;
    if(!retry&&session.phase!=='idle'&&Date.now()-session.at<45*60*1000)return session.promise;
    session.phase='loading';session.message='Sprawdzanie danych Simkl…';
    const run=(async()=>{
      try{
        // Read Jellyfin's own item metadata only to identify SeriesId for seasons.
        const response=await fetch(`/Users/${session.user}/Items/${session.id}`,{headers:headers(),cache:'no-store'});
        if(!response.ok)throw new Error('Nie udało się odczytać metadanych Jellyfin.');
        const media=await response.json();
        if(!['Series','Season','Episode','Movie'].includes(media.Type))return;
        session.catalogId=['Season','Episode'].includes(media.Type)?compact(media.SeriesId):session.id;
        if(['Movie','Series'].includes(media.Type)){
          const state=media.UserData||{};
          const played=state.Played===true;
          const started=Number(state.PlaybackPositionTicks)>0 ||
            (media.Type==='Series' && Number(state.UnplayedItemCount)>0 &&
             Number(state.UnplayedItemCount)<Number(media.RecursiveItemCount||0));
          pageFor(session.id)?.setAttribute('data-mf-simkl-jellyfin-watch',
            played?'watched':started?'started':'unwatched');
        }
        session.seasonId=media.Type==='Episode'?compact(media.SeasonId):media.Type==='Season'?session.id:'';
        session.episodeId=media.Type==='Episode'?session.id:'';
        if(media.Type==='Episode'&&!valid(session.seasonId))throw new Error('Brak identyfikatora sezonu dla odcinka.');
        if(!valid(session.catalogId))throw new Error('Brak identyfikatora serialu.');
        const result=await request(`/item?catalogId=${session.catalogId}${session.seasonId?'&seasonId='+session.seasonId:''}${session.episodeId?'&episodeId='+session.episodeId:''}`);
        if(!sessions.has(session.key)||currentUser!==session.user)return;
        session.data=result;
        if(!result.relevant)return;
        if(!result.connected){session.phase='disconnected';session.message='Nie połączono konta Simkl z tym użytkownikiem Jellyfin.';}
        else if(!result.hasIds){session.phase='missing';session.message='Brak identyfikatora TMDB, IMDb lub TVDB w metadanych.';}
        else{session.phase='ready';session.message='';}
        session.at=Date.now();show(session);
      }catch(e){session.phase='error';session.message='Nie można pobrać informacji Simkl: '+e.message;session.at=Date.now();
        // An error before non-anime verification must remain invisible.
        show(session);
      }
    })();
    session.promise=run;return run;
  }
  function mount(page,id){
    const rail=page.querySelector('.mf-detail-poster-rail');
    const host=rail||page.querySelector('.mf-detail-main')||page.querySelector('.detailPagePrimaryContent');
    if(!host)return;
    const section=el('section','mf-simkl-detail-panel');section.hidden=true;
    section.dataset.mfExpanded='false';section.setAttribute('aria-label','Moje dane Simkl');
    const toggle=el('button','mf-simkl-mobile-toggle','Simkl');toggle.type='button';toggle.setAttribute('aria-expanded','false');
    toggle.onclick=()=>{const open=section.dataset.mfExpanded!=='true';section.dataset.mfExpanded=String(open);toggle.setAttribute('aria-expanded',String(open));};
    section.append(toggle,el('h3','','Moje Simkl'),el('div','mf-simkl-content'));
    if(rail)rail.append(section);
    else host.append(section);
    generation++;panel=section;currentDetail=id;
    const key=`${currentUser}:${id}`;
    let session=sessions.get(key);
    if(!session){session={key,user:currentUser,id,phase:'idle',at:0,data:null,message:'',catalogId:'',seasonId:'',episodeId:''};sessions.set(key,session);}
    else {session.phase='idle';session.at=0;} // after returning from playback, reread local watched history
    show(session);void read(session,true);
  }
  function syncDetails(){
    const id=detailId();const page=id?pageFor(id):null;
    if(!id||!page){if(currentDetail){clearDetailFrames();currentDetail='';panel=null;generation++;}return;}
    if(currentDetail===id&&panel?.isConnected&&panel.closest('#itemDetailPage')===page)return;
    clearDetailFrames();panel?.remove();panel=null;mount(page,id);
  }
  // v0.4.51 — Simkl poster score renderer. OWN classes, separate from MAL.
  // Scores come only from the per-user NAS archive. The server authorizes every
  // Jellyfin ID and never accepts client-supplied TMDB/IMDb identifiers.
  const cardScores=new Map();
  const pendingScoreIds=new Set();
  let scoreFetchBusy=false,scoreRetryAfter=0;
  function resetCardScores(){
    cardScores.clear();cardStates.clear();pendingScoreIds.clear();scoreRetryAfter=0;
    document.querySelectorAll('.mf-simkl-home-score,.mf-simkl-native-score').forEach(node=>node.remove());
    document.querySelectorAll('[data-mf-simkl-score]').forEach(node=>node.removeAttribute('data-mf-simkl-score'));
    schedule();
  }
  function simklPaw(){
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
    svg.classList.add('mf-simkl-score-paw');
    for(const [x,y] of [[5,8.7],[9.5,5.8],[14.5,5.8],[19,8.7]]){
      const toe=document.createElementNS(ns,'ellipse');
      for(const [k,v] of [['cx',x],['cy',y],['rx',1.9],['ry',2.55],['fill','currentColor']])toe.setAttribute(k,String(v));
      svg.append(toe);
    }
    const base=document.createElementNS(ns,'path');
    base.setAttribute('d','M12.2 10.6c-2.2 0-3.5 1.9-5.2 4-.9 1.1-1.8 2.3-1.8 3.6 0 1.6 1.3 2.7 2.8 2.7 1.4 0 2.5-.9 4-.9s2.6.9 4 .9c1.5 0 2.8-1.1 2.8-2.7 0-1.3-.9-2.5-1.8-3.6-1.7-2.1-3-4.8-4Z');
    base.setAttribute('fill','currentColor');svg.append(base);return svg;
  }
  function renderCardScore(card,score,native){
    const cls=native?'mf-simkl-native-score':'mf-simkl-home-score';
    const old=card.querySelector('.'+cls);
    if(!(Number(score)>=1&&Number(score)<=10)){
      old?.remove();card.removeAttribute('data-mf-simkl-score');
      if(!native){const holder=card.querySelector('.mf-home-stats');if(holder&&!holder.childElementCount)holder.remove();}
      return;
    }
    const container=native
      ? card.querySelector('.mf-native-top .mf-native-stats')||card.querySelector('.mf-native-top')
      : card.querySelector('.mf-home-stats')||(()=>{const h=el('div','mf-home-stats');card.append(h);return h;})();
    if(!container)return; // Jellyfin's native overlay is not ready yet.
    if(old&&old.parentElement===container&&old.textContent===String(score))return;
    old?.remove();
    const badge=el('span',cls);
    badge.title='Moja ocena Simkl';
    badge.append(el('span','mf-simkl-score-number',String(score)),simklPaw());
    container.append(badge);card.setAttribute('data-mf-simkl-score',String(score));
  }
  function nearby(card){
    const box=typeof card.getBoundingClientRect==='function'?card.getBoundingClientRect():null;
    return !box||(box.bottom>=-350&&box.top<=(window.innerHeight||1000)+550);
  }
  function decorateCardScores(){
    if(!valid(currentUser)||!token())return;
    const cards=document.querySelectorAll('.mf-home-poster[data-mf-simkl-id], .card[data-mf-card="1"][data-id]');
    for(const card of cards){
      const native=!card.classList.contains('mf-home-poster');
      if(native){
        if(card.dataset.mfAnime==='1'||!['film','serial'].includes(card.dataset.mfKind))continue;
        card.classList.add('mf-simkl-native-media');
      }
      if(!nearby(card))continue;
      const id=compact(native?card.getAttribute('data-id'):card.dataset.mfSimklId);
      if(!valid(id))continue;
      if(!cardScores.has(id)){pendingScoreIds.add(id);continue;}
      updateFrameOnCard(card,cardStates.get(id),native,id);
      renderCardScore(card,cardScores.get(id),native);
    }
    if(pendingScoreIds.size&&!scoreFetchBusy&&Date.now()>=scoreRetryAfter)void fetchCardScores();
  }
  async function fetchCardScores(){
    if(scoreFetchBusy||!valid(currentUser)||!token())return;
    const batch=[...pendingScoreIds].slice(0,36);
    if(!batch.length)return;
    batch.forEach(id=>pendingScoreIds.delete(id));
    const selectedUser=currentUser;scoreFetchBusy=true;
    try{
      const data=await request('/card-scores?ids='+encodeURIComponent(batch.join(',')));
      if(currentUser!==selectedUser)return;
      const ratings=data?.scores&&typeof data.scores==='object'?data.scores:{};
      const states=data?.states&&typeof data.states==='object'?data.states:{};
      for(const id of batch){
        const value=Number(ratings[id]??ratings[id.toUpperCase()]??0);
        cardScores.set(id,Number.isInteger(value)&&value>=1&&value<=10?value:0);
        cardStates.set(id,states[id]??states[id.toUpperCase()]??null);
      }
    }catch{
      if(currentUser===selectedUser){batch.forEach(id=>pendingScoreIds.add(id));scoreRetryAfter=Date.now()+30000;}
    }finally{scoreFetchBusy=false;schedule();}
  }

  function tick(){timer=0;resetUser();mountHome();syncDetails();decorateCardScores();void refreshResume();}
  function schedule(){if(!timer)timer=window.setTimeout(tick,180);}
  function init(){
    const observer=new MutationObserver(changes=>{
      if(changes.some(c=>c.type==='childList' &&
        !(c.target?.nodeType===1&&c.target.closest('.mf-simkl-detail-panel, .mf-simkl-modal-overlay'))))schedule();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    ['hashchange','pageshow','popstate'].forEach(evt=>window.addEventListener(evt,schedule));
    window.addEventListener('scroll',schedule,{passive:true,capture:true});
    window.addEventListener('focus',()=>{
      void refreshResume(true);
      const session=sessions.get(`${currentUser}:${currentDetail}`);
      if(session&&Date.now()-session.at>30000){session.phase='idle';void read(session,true);}
    });
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
