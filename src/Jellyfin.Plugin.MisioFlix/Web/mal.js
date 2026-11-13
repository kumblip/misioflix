/* MisioFlix v0.4.40: compact MAL details, mobile drawer, stable counters and save confirmation.
 * Home: OAuth connect/disconnect only, never fetch anime list.
 * Item details: lazy one-item MAL read, local display cache and explicit save/refresh.
 * Does not alter Jellyfin playback, NFO or native React-owned DOM children.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_MAL_0430__ || window.__MISIOFLIX_MAL_0431__) return;
  window.__MISIOFLIX_MAL_0430__ = true;
  window.__MISIOFLIX_MAL_0431__ = true;
  const API='/MisioFlix/api/mal';
  const cacheTime=60*60*1000;
  const valid=id=>/^[0-9a-f]{32}$/i.test(String(id||'').replace(/-/g,''));
  const compact=id=>String(id||'').replace(/-/g,'').toLowerCase();
  const apiClient=()=>window.ApiClient||window.ConnectionManager?.getApiClient?.();
  const userId=()=>String(apiClient()?.getCurrentUserId?.()||'');
  const token=()=>{
    const a=apiClient();const t=typeof a?.accessToken==='function'?a.accessToken():a?.accessToken;
    return typeof t==='string'?t:'';
  };
  const headers=()=>({Authorization:`MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-mal", Version="0.4.40", Token="${token().replace(/["\r\n]/g,'')}"`});
  const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x;};
  const params=()=>new URLSearchParams((window.location.hash||'').split('?')[1]||'');
  const homeRoute=()=>/^#\/(?:home)?(?:\?|$)/i.test(location.hash||'#/home') && (params().get('tab')||'0')==='0' && !params().has('mfCollections');
  const detailId=()=>/^#\/details\?/i.test(location.hash||'')?compact(params().get('id')):'';
  const cacheKey=(uid,malId)=>`misioflix-mal-v3:${compact(uid)}:${malId}`;
  const loadCache=(uid,malId)=>{
    try {const a=JSON.parse(localStorage.getItem(cacheKey(uid,malId))||'null');return a&&typeof a.at==='number'&&a.at>Date.now()-7*24*3600e3?a:null;}
    catch{return null;}
  };
  const saveCache=(uid,malId,entry)=>{try{localStorage.setItem(cacheKey(uid,malId),JSON.stringify({at:Date.now(),entry}));}catch{}};

  // The home page NEVER contacts MAL. It uses the last user-scoped list snapshot
  // from an anime-detail visit; missing information stays unknown, not Jellyfin-owned.
  const indexKey=uid=>`misioflix-mal-index-v2:${compact(uid)}`;
  const mappingKey=uid=>`misioflix-mal-bindings-v1:${compact(uid)}`;
  function indexState(uid){try{const x=JSON.parse(localStorage.getItem(indexKey(uid))||'null');return x&&x.entries&&typeof x.entries==='object'?x:{entries:{},full:false};}catch{return {entries:{},full:false};}}
  function loadIndex(uid){return indexState(uid).entries;}
  function storeIndex(uid,entries,full=false){try{localStorage.setItem(indexKey(uid),JSON.stringify({at:Date.now(),entries,full}));}catch{}}
  function loadBindings(uid){try{return JSON.parse(localStorage.getItem(mappingKey(uid))||'{}')||{};}catch{return {};}}
  function rememberBinding(uid,id,malId){
    if(!valid(id)||!Number.isSafeInteger(Number(malId))||Number(malId)<=0)return;
    const bindings=loadBindings(uid);bindings[compact(id)]=Number(malId);
    try{localStorage.setItem(mappingKey(uid),JSON.stringify(bindings));}catch{}
  }
  const statusState=entry=>{
    if(!entry)return 'unknown';
    const x=entryFields(entry);
    if(x.status==='completed')return 'watched';
    if(x.status==='watching'||x.status==='on_hold')return 'started';
    if(x.status==='plan_to_watch'||x.status==='dropped')return 'unwatched';
    return 'unknown';
  };
  const statusLabel=status=>Object.fromEntries(statuses)[status]||'Nieznany';
  function saveIndexEntry(uid,malId,entry){
    const state=indexState(uid),data=state.entries;if(entry)data[malId]=entry;else delete data[malId];storeIndex(uid,data,state.full);
    window.dispatchEvent(new Event('misioflix-mal-cache-changed'));
  }
  let indexRequest=null,indexRequestedUser='';
  // Called after opening an anime, never during Home initialization.
  function ensureIndexFromSelectedAnime(uid){
    if(!valid(uid)||!connection?.connected||indexState(uid).full||indexRequestedUser===uid)return;
    indexRequestedUser=uid;
    indexRequest=request('/status?refresh=false').then(data=>{
      if(data.connected&&currentUser===uid&&data.entries&&typeof data.entries==='object'){
        storeIndex(uid,{...data.entries,...loadIndex(uid)},true);window.dispatchEvent(new Event('misioflix-mal-cache-changed'));
      }
    }).catch(()=>{ /* one detail lookup still works if whole-list snapshot is unavailable */ })
      .finally(()=>{indexRequest=null;});
  }
  function malRatingPaw(){
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('aria-hidden','true');
    svg.classList.add('mf-home-paw','mf-mal-rating-paw');
    svg.style.color='#ee9fc9';
    for(const [cx,cy] of [[5,8.7],[9.5,5.8],[14.5,5.8],[19,8.7]]){
      const toe=document.createElementNS(ns,'ellipse');
      for(const [key,value] of [['cx',cx],['cy',cy],['rx',1.9],['ry',2.55],['fill','currentColor']])toe.setAttribute(key,String(value));
      svg.appendChild(toe);
    }
    const foot=document.createElementNS(ns,'path');
    foot.setAttribute('d','M12.2 10.6c-2.2 0-3.5 1.9-5.2 4-.9 1.1-1.8 2.3-1.8 3.6 0 1.6 1.3 2.7 2.8 2.7 1.4 0 2.5-.9 4-.9s2.6.9 4 .9c1.5 0 2.8-1.1 2.8-2.7 0-1.3-.9-2.5-1.8-3.6-1.7-2.1-3-4.8-4Z');
    foot.setAttribute('fill','currentColor');svg.appendChild(foot);
    return svg;
  }
  function decorateMalCards(){
    const uid=currentUser;if(!valid(uid))return;
    const snapshot=indexState(uid),entries=snapshot.entries,bindings=loadBindings(uid);
    let overlayChanged=false;
    for(const card of document.querySelectorAll('.mf-home-poster[data-mf-item-id], .card[data-mf-card="1"][data-mf-anime="1"]')){
      const isHome=card.classList.contains('mf-home-poster');
      const mediaId=compact(isHome?card.dataset.mfItemId:card.getAttribute('data-id'));
      const malId=Number((isHome?card.dataset.mfMalId:card.dataset.mfMalId)||bindings[mediaId]||0);
      const entry=malId>0?entries[malId]||loadCache(uid,malId)?.entry:null;
      // Only a COMPLETE personal MAL index can establish that a linked title is
      // absent from the user's list. A missing item then means not yet watched;
      // incomplete/offline data must stay unknown, not borrow Jellyfin play-state.
      const state=entry?statusState(entry):(malId>0&&snapshot.full?'unwatched':'unknown');
      if(card.getAttribute('data-mf-watch')!==state){card.setAttribute('data-mf-watch',state);overlayChanged=true;}
      if(!isHome){
        const rating=entry?entryFields(entry).score:0;
        const displayed=rating>0?String(rating):'';
        if(card.getAttribute('data-mf-user-rating')!==displayed){card.setAttribute('data-mf-user-rating',displayed);overlayChanged=true;}
      }else{
        const existing=card.querySelector('.mf-home-mal-score');
        const score=entry?entryFields(entry).score:0;
        const text=score>0?String(score):'';
        if(!text){existing?.remove();continue;}
        if(existing?.textContent===text&&existing.querySelector('.mf-mal-rating-paw'))continue;
        const holder=card.querySelector('.mf-home-stats')||el('div','mf-home-stats');
        if(!holder.isConnected)card.append(holder);
        let label=existing;
        if(!label){label=el('span','mf-home-stat mf-home-mal-score');label.title='Moja ocena MyAnimeList';holder.append(label);}
        label.replaceChildren(el('span','mf-mal-score-number',text),malRatingPaw());
      }
    }
    if(overlayChanged)window.dispatchEvent(new Event('misioflix-mal-cards-updated'));
  }

  const clearCache=uid=>{
    try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if((k?.startsWith(`misioflix-mal-v3:${compact(uid)}:`)||k?.startsWith(`misioflix-mal-v2:${compact(uid)}:`)||k?.startsWith(`misioflix-mal-v1:${compact(uid)}:`))||k===indexKey(uid)||k===mappingKey(uid))localStorage.removeItem(k);}}catch{}
    window.dispatchEvent(new Event('misioflix-mal-cache-changed'));
  };
  async function request(path,method='GET',body){
    const r=await fetch(API+path,{method,cache:'no-store',credentials:'same-origin',headers:{...headers(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||`Błąd MAL: HTTP ${r.status}`);
    return data;
  }
  function value(o,...keys){for(const key of keys){if(o&&o[key]!==undefined&&o[key]!==null)return o[key];}return undefined;}
  // MAL's read API uses num_episodes_watched, while its write API uses
  // num_watched_episodes. Older service DTOs may use PascalCase. Crucially,
  // an ABSENT counter is not zero: defaulting to 0 could erase MAL history.
  function optionalCount(obj,...keys){
    const raw=value(obj,...keys);
    if(raw===undefined||raw===null||raw==='')return null;
    const number=Number(raw);
    return Number.isSafeInteger(number)&&number>=0?number:null;
  }
  function entryFields(item){
    const holder=value(item,'entry','Entry')||item||{};
    const obj=value(holder,'my_list_status','MyListStatus','list_status','ListStatus')||holder;
    return {
      status:String(value(obj,'status','Status')||'plan_to_watch'),
      score:Number(value(obj,'score','Score')||0),
      episodesWatched:optionalCount(obj,'episodes_watched','num_episodes_watched','num_watched_episodes',
        'NumEpisodesWatched','NumWatchedEpisodes','episodesWatched','EpisodesWatched'),
      timesRewatched:optionalCount(obj,'times_rewatched','num_times_rewatched','NumTimesRewatched',
        'timesRewatched','TimesRewatched','numRewatches','NumRewatches')
    };
  }
  let currentUser='',connection=null,connectionPromise=null,dialog=null,homeButton=null;
  let currentDetail='',currentDetailKey='',detailGeneration=0,detailPanel=null,observing=false,timer=0;
  // In-flight and resolved detail checks survive React remounts of the same page.
  // One failed lookup never triggers a background retry loop.
  const detailSessions=new Map();
  const sessionValidated=new Set();
  function onUserSwitch(){
    const uid=compact(userId());
    if(uid===currentUser)return;
    currentUser=uid;connection=null;connectionPromise=null;homeButton=null;
    sessionValidated.clear();detailSessions.clear();detailGeneration++;indexRequestedUser='';
    detailPanel?.remove();clearHeaderForPreviousDetail();detailPanel=null;currentDetail='';currentDetailKey='';
    closeDialog();
  }
  async function connectionStatus(force=false){
    onUserSwitch();if(!valid(currentUser)||!token())return {connected:false};
    if(connection&&!force)return connection;
    if(connectionPromise&&!force)return connectionPromise;
    const user=currentUser;
    const work=request('/connection').then(data=>{
      if(user===currentUser){connection=data;syncHomeButton();}
      return data;
    }).finally(()=>{if(user===currentUser)connectionPromise=null;});
    connectionPromise=work;return work;
  }
  function syncHomeButton(){
    if(!homeButton?.isConnected)return;
    homeButton.textContent=connection?.connected?`MAL: ${connection.username||'Połączono'}`:'Połącz MAL';
    homeButton.title=connection?.connected?'Konto MyAnimeList połączone z tym użytkownikiem Jellyfin':'Połącz własne konto MyAnimeList';
  }
  function mountHomeButton(){
    const container=homeRoute()?document.querySelector('.mf-home-hero .mf-home-folder-buttons'):null;
    if(!container)return;
    let b=container.querySelector('.mf-home-mal-button');
    if(!b){
      b=el('button','mf-home-folder-button mf-home-mal-button','Połącz MAL');b.type='button';
      b.setAttribute('aria-label','Połącz lub zarządzaj własnym kontem MyAnimeList');
      b.addEventListener('click',openDialog);container.appendChild(b);
    }
    homeButton=b;syncHomeButton();
    if(!connection&&!connectionPromise)void connectionStatus().catch(()=>{if(b.isConnected){b.textContent='MAL — ustawienia';b.title='Nie można sprawdzić połączenia MAL';}});
  }
  function closeDialog(){dialog?.remove();dialog=null;}
  async function openDialog(){
    if(dialog)return;
    const overlay=el('div','mf-mal-modal-overlay');
    const panel=el('section','mf-mal-modal');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Konto MyAnimeList');
    const top=el('div','mf-mal-modal-head');const title=el('h2','','MyAnimeList');const close=el('button','','×');close.type='button';close.setAttribute('aria-label','Zamknij');close.onclick=closeDialog;top.append(title,close);
    const body=el('div','mf-mal-modal-body');const msg=el('p','mf-mal-message','Sprawdzanie połączenia…');
    panel.append(top,body);overlay.appendChild(panel);document.body.appendChild(overlay);dialog=overlay;
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeDialog();});
    const note=(txt)=>{msg.textContent=txt;};
    const action=(txt,fn)=>{const b=el('button','mf-mal-action',txt);b.type='button';b.addEventListener('click',fn);return b;};
    function draw(c){
      body.replaceChildren(msg);
      if(c?.connected){
        note(`Połączono jako ${c.username||'użytkownik MAL'}. Połączenie dotyczy tylko tego użytkownika Jellyfin.`);
        body.append(action('Odśwież status',async()=>{try{connection=null;draw(await connectionStatus(true));}catch(e){note(e.message);}}));
        body.append(action('Rozłącz MAL',async()=>{
          if(!window.confirm('Odłączyć MAL od tego konta Jellyfin? Dane na MAL pozostaną nienaruszone.'))return;
          try{await request('/disconnect','POST');clearCache(currentUser);sessionValidated.clear();connection={connected:false};syncHomeButton();draw(connection);window.dispatchEvent(new Event('misioflix-mal-updated'));}
          catch(e){note(e.message);}
        }));
        return;
      }
      note('Połącz własne konto MAL. Client ID i sekret pozostają w ustawieniach serwera.');
      const start=action('Zaloguj przez MyAnimeList',async()=>{
        start.disabled=true;
        try{
          const result=await request('/connect');
          if(!result.url)throw new Error('MAL nie zwrócił adresu logowania');
          window.open(result.url,'_blank','noopener,noreferrer');
          note('Zaloguj się w nowej karcie. Jeżeli przekierowanie localhost:8765/callback pokaże błąd połączenia, skopiuj PEŁNY adres z paska przeglądarki (z code i state) i wklej poniżej. Kod jest jednorazowy.');
          manual.hidden=false;
        }catch(e){note(e.message);}finally{start.disabled=false;}
      });
      const manual=el('div','mf-mal-manual');manual.hidden=true;
      const label=el('label','','Adres przekierowania MAL (tylko jednorazowy kod)');
      const input=el('input');input.type='url';input.placeholder='http://localhost:8765/callback?code=...&state=...';input.autocomplete='off';input.spellcheck=false;
      const finish=action('Zakończ łączenie',async()=>{
        let callbackValid=false;
        try{const u=new URL(input.value.trim());callbackValid=u.protocol==='http:' && ['localhost','127.0.0.1'].includes(u.hostname) && u.port==='8765' && u.pathname==='/callback' && !!u.searchParams.get('code') && !!u.searchParams.get('state');}catch{}
        if(!callbackValid){note('Wklej pełny adres przekierowania z MAL, łącznie z parametrami code i state.');return;}
        finish.disabled=true;
        try{
          await request('/complete','POST',{redirectUrl:input.value.trim()});input.value='';clearCache(currentUser);sessionValidated.clear();
          connection=null;draw(await connectionStatus(true));window.dispatchEvent(new Event('misioflix-mal-updated'));
        }catch(e){note(e.message);}finally{finish.disabled=false;}
      });
      label.appendChild(input);manual.append(label,finish);body.append(start,manual);
      body.append(action('Sprawdź połączenie',async()=>{
        try{connection=null;const next=await connectionStatus(true);draw(next);}
        catch(e){note(e.message);}
      }));
    }
    try{draw(await connectionStatus());}catch(e){note(e.message);body.append(action('Ponów',()=>{connection=null;void connectionStatus(true).then(draw).catch(err=>note(err.message));}));}
  }
  const statuses=[['plan_to_watch','Planuję obejrzeć'],['watching','Oglądam'],['completed','Obejrzane'],['on_hold','Wstrzymane'],['dropped','Porzucone']];
  function makeSelect(choices,selected){
    const input=el('select');for(const [v,t] of choices){const o=el('option','',t);o.value=String(v);input.append(o);}input.value=String(selected);return input;
  }
  function inputRow(name,control,info=''){
    const label=el('label','mf-mal-field');const title=el('span','',name);label.append(title,control);
    if(info)label.append(el('small','',info));return label;
  }
  function detailPage(id){
    const arr=[...document.querySelectorAll('#itemDetailPage.mf-detail-compact')];
    return arr.reverse().find(p=>p.isConnected&&p.dataset.mfDetailId===id&&p.getClientRects().length>0)||null;
  }
  function storeVisible(uid,malId,entry){saveCache(uid,malId,entry);saveIndexEntry(uid,malId,entry);sessionValidated.add(`${uid}:${malId}`);}
  function showDetailMalRating(panel,entry){
    const page=panel.closest('#itemDetailPage');if(!page)return;
    // Only MAL-backed anime detail pages. Do not overwrite Jellyfin's stored rating.
    page.classList.add('mf-detail-mal-rating');
    // A successful MAL lookup with no list entry means this verified anime has
    // never been added to the user's MAL list. Only here is null = unwatched;
    // disconnected, failed and unverified states must remain unknown.
    page.setAttribute('data-mf-mal-watch',entry===null?'unwatched':statusState(entry));
    let label=page.querySelector('.mf-detail-mal-badge');
    if(!label){
      label=el('span','mf-detail-mal-badge');
      const anchor=page.querySelector('.detailRibbon .itemMiscInfo,.detailRibbon .infoWrapper,.detailRibbon');
      anchor?.appendChild(label);
    }
    if(!label)return;
    const fields=entry?entryFields(entry):null;
    label.textContent=fields&&fields.score>0?`★ ${fields.score}/10 · MAL`:'★ Bez oceny · MAL';
    label.title='Osobista ocena zalogowanego użytkownika MyAnimeList';
    // The original community score is only visually suppressed for this anime,
    // never deleted or changed in Jellyfin or its React component state.
  }
  function showMalSaveToast(message){
    document.querySelector('.mf-mal-toast')?.remove();
    const toast=el('div','mf-mal-toast',message);
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    document.body.append(toast);
    window.setTimeout(()=>toast.remove(),4500);
  }
  function renderEntry(panel,entry,ctx,fromCache=false,editorOpen=false,notice=''){
    if(!panel.isConnected||ctx.generation!==detailGeneration||detailId()!==ctx.pageId)return;
    const main=panel.querySelector('.mf-mal-content');main.replaceChildren();
    const data=entry?entryFields(entry):null;
    showDetailMalRating(panel,entry);
    const view=el('div','mf-mal-readonly');view.setAttribute('aria-label','Moje dane MAL');
    // MAL's num_times_rewatched is already the count of REWATCHES.
    // Display it verbatim. Do not add the initial viewing to this field.
    const rewatchCount=data?.timesRewatched ?? null;
    const cells=[
      ['Moja ocena',data?.score>0?`${data.score}/10`:'Bez oceny'],
      ['Status',data?statusLabel(data.status):'Nie dodano do MAL'],
      ['Ponowne obejrzenia',rewatchCount===null?'Brak danych':String(rewatchCount)],
      ['Obejrzane odcinki',data?.episodesWatched===null||!data?'Brak danych':String(data.episodesWatched)]
    ];
    for(const [name,value] of cells){
      const cell=el('div','mf-mal-readonly-cell');cell.append(el('span','mf-mal-readonly-label',name),el('strong','mf-mal-readonly-value',value));view.append(cell);
    }
    main.append(view);
    // The user's own MAL data are already identified by the panel title.
    // Avoid repeating the data-source sentence in the compact poster rail.
    if(data&&(data.episodesWatched===null||data.timesRewatched===null||
      (data.status==='completed'&&data.episodesWatched===0))){
      const warning=el('p','mf-mal-summary mf-mal-counter-warning',
        'Uwaga: liczniki mogą być niepełne (np. ukończone anime z 0 odcinków). Nie są wysyłane do MAL, dopóki ręcznie ich nie zmienisz.');
      main.append(warning);
    }
    const actionsOutside=el('div','mf-mal-view-actions');
    const refresh=el('button','mf-mal-action-secondary','Odśwież z MAL');refresh.type='button';
    const liveMessage=el('span','mf-mal-save-message',notice);liveMessage.setAttribute('role','status');
    actionsOutside.append(refresh,liveMessage);main.append(actionsOutside);
    // v0.4.40: diagnostic UI removed after confirming the API field mapping.
    const editor=el('details','mf-mal-editor');editor.open=Boolean(editorOpen);
    const toggle=el('summary','mf-mal-editor-toggle','Edytuj MAL');editor.append(toggle);
    const status=makeSelect(statuses,data?.status||'plan_to_watch');
    const scores=[['0','Bez oceny'],...Array.from({length:10},(_,i)=>[String(i+1),`${i+1}/10`])];
    const score=makeSelect(scores,data?.score||0);
    const episodes=el('input');episodes.type='number';episodes.min='0';episodes.max='9999';episodes.step='1';episodes.value=data?.episodesWatched===null||!data?'':String(data.episodesWatched);
    const rewatches=el('input');rewatches.type='number';rewatches.min='0';rewatches.max='9999';rewatches.step='1';rewatches.value=data?.timesRewatched===null||!data?'':String(data.timesRewatched);
    // Never echo server-supplied counters back unless the user edited the field.
    // A legacy service could deserialize missing MAL values as 0: this protects
    // real MAL history even when the current UI displays that incorrect 0.
    let episodesEdited=false,rewatchesEdited=false;
    episodes.addEventListener('input',()=>{episodesEdited=true;});
    rewatches.addEventListener('input',()=>{rewatchesEdited=true;});
    const form=el('form','mf-mal-form');form.append(
      inputRow('Status',status),inputRow('Ocena',score),
      inputRow('Obejrzane odcinki',episodes,'Puste pole = nie zmieniaj licznika MAL. Wpisz 0 tylko, gdy świadomie chcesz go wyzerować.'),
      inputRow('Ponowne pełne obejrzenia',rewatches,'MAL liczy tylko powtórki, nie pierwsze obejrzenie. Puste pole = bez zmiany.')
    );
    const saveArea=el('div','mf-mal-detail-actions');
    const save=el('button','mf-mal-action','Zapisz w MAL');save.type='submit';
    const message=el('span','mf-mal-save-message');message.setAttribute('role','status');
    saveArea.append(save,message);form.append(saveArea);editor.append(form);main.append(editor);
    const isSame=()=>ctx.generation===detailGeneration&&currentUser===ctx.userId&&panel.isConnected;
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(!form.isConnected)return;
      const optionalInput=(element,edited)=>!edited||element.value.trim()===''?null:Number(element.value);
      const fields=[Number(score.value),optionalInput(episodes,episodesEdited),optionalInput(rewatches,rewatchesEdited)];
      if(!Number.isSafeInteger(fields[0])||fields[0]<0||fields[0]>10||
        fields.slice(1).some(v=>v!==null&&(!Number.isSafeInteger(v)||v<0||v>9999))){
        message.textContent='Nieprawidłowe wartości.';return;
      }
      save.disabled=true;refresh.disabled=true;message.textContent='Zapisywanie…';
      try{
        const answer=await request('/update','POST',{catalogId:ctx.catalogId,seasonId:ctx.seasonId||null,status:status.value,score:fields[0],episodesWatched:fields[1],timesRewatched:fields[2]});
        const result=answer&&typeof answer==='object'?answer:{status:status.value,score:fields[0],episodesWatched:fields[1],timesRewatched:fields[2]};
        if(isSame()){
          storeVisible(ctx.userId,ctx.malId,result);
          const session=detailSessions.get(ctx.sessionKey);
          if(session){session.entry=result;session.fromCache=false;session.phase='ready';session.at=Date.now();}
          renderEntry(panel,result,ctx,false,false,'Zapisano w MyAnimeList.');
          showMalSaveToast('✓ Zapisano zmiany w MyAnimeList');
        }
      }catch(e){message.textContent=e.message||'Błąd zapisu w MAL';}
      finally{save.disabled=false;refresh.disabled=false;}
    });
    refresh.addEventListener('click',async()=>{
      refresh.disabled=true;liveMessage.textContent='Sprawdzanie MAL…';
      try{
        const result=await request(`/item?catalogId=${ctx.catalogId}${ctx.seasonId?'&seasonId='+ctx.seasonId:''}&refresh=true`);
        if(result.connected&&isSame()){
          storeVisible(ctx.userId,ctx.malId,result.entry);
          const session=detailSessions.get(ctx.sessionKey);
          if(session){session.entry=result.entry;session.fromCache=false;session.phase='ready';session.at=Date.now();}
          renderEntry(panel,result.entry,ctx,false,editor.open,'Odświeżono z MyAnimeList.');
        }else liveMessage.textContent='MAL nie jest połączony.';
      }catch(e){liveMessage.textContent=e.message;}
      finally{refresh.disabled=false;}
    });
  }
  // Stable lookup state, keyed by the authenticated Jellyfin user AND media item.
  // A panel disappearing during React reconciliation must not launch the same
  // catalogue/MAL queries again. Only a deliberate Retry/Refresh can retry errors.
  function newDetailSession(uid,id){
    const key=`${uid}:${id}`;
    let session=detailSessions.get(key);
    if(!session){
      session={key,userId:uid,id,phase:'idle',message:'Sprawdzanie MAL ID z NFO…',at:0,
        malId:null,entry:null,fromCache:false,catalogId:'',seasonId:'',animeVerified:false,promise:null};
      detailSessions.set(key,session);
    }
    return session;
  }
  async function readJson(url){
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch(url,{headers:headers(),cache:'no-store',signal:controller.signal});
      if(!response.ok){
        const where=url.includes('/MisioFlix/api/mal/resolve')?'identyfikatora MAL z NFO':'szczegółów Jellyfin';
        let message='';
        try{const failure=await response.json();message=String(failure?.error||'').slice(0,160);}catch{}
        throw new Error(message||`HTTP ${response.status} przy odczycie ${where}`);
      }
      return await response.json();
    }catch(error){
      if(error?.name==='AbortError')throw new Error('Przekroczono 30 s oczekiwania na odpowiedź Jellyfin');
      throw error;
    }finally{window.clearTimeout(timeout);}
  }
  function paintSession(session){
    if(session.key!==currentDetailKey || session.id!==detailId() || currentUser!==session.userId ||
       !detailPanel?.isConnected)return;
    const panel=detailPanel;
    const content=panel.querySelector('.mf-mal-content');
    if(!content)return;
    // The panel is never visible until the authenticated NFO anime-root
    // classification has positively identified the item as anime. Keep the
    // hidden shell mounted to avoid a MutationObserver remount/request loop.
    if(session.phase==='irrelevant'||session.animeVerified!==true){panel.hidden=true;return;}
    panel.hidden=false;
    if(session.phase==='ready'){
      const ctx={catalogId:session.catalogId,seasonId:session.seasonId,malId:session.malId,
        generation:detailGeneration,pageId:session.id,userId:session.userId,sessionKey:session.key};
      renderEntry(panel,session.entry,ctx,session.fromCache);
      return;
    }
    content.replaceChildren(el('p','mf-mal-message',session.message));
    if(session.phase==='disconnected'){
      const a=el('a','mf-mal-link','Połącz konto MAL na stronie głównej');a.href='#/home';content.append(a);
    }
    if(session.phase==='error'||session.phase==='missing'){
      const retry=el('button','mf-mal-action-secondary','Ponów sprawdzanie');retry.type='button';
      retry.addEventListener('click',()=>startDetailRead(session,true));content.append(retry);
    }
  }
  function updateSession(session,phase,message,more){
    if(detailSessions.get(session.key)!==session)return;
    session.phase=phase;session.message=message;
    if(more)Object.assign(session,more);
    if(phase!=='loading')session.at=Date.now();
    paintSession(session);
  }
  function startDetailRead(session,retry=false){
    if(session.phase==='loading')return session.promise;
    if(!retry && session.phase!=='idle' &&
       (session.phase!=='ready' || Date.now()-session.at<cacheTime))return session.promise;
    const uid=session.userId,id=session.id;
    updateSession(session,'loading','Sprawdzanie MAL ID z NFO…');
    // Set the state synchronously, before any asynchronous work or DOM mutation.
    // The promise is shared even when the view is removed/recreated several times.
    const run=(async()=>{
      try{
        const metadata=await readJson(`/Users/${uid}/Items/${id}`);
        if(!['Series','Season','Movie'].includes(metadata.Type)){
          updateSession(session,'irrelevant','');return;
        }
        const catalogId=metadata.Type==='Season'?compact(metadata.SeriesId):id;
        const seasonId=metadata.Type==='Season'?id:'';
        if(!valid(catalogId))throw new Error('Brak identyfikatora nadrzędnej serii w Jellyfin');
        // Classification is based on the SAME authenticated AnimeRoot/NFO check
        // used for native Jellyfin card overlays, not a title or genre guess.
        // A normal film/series must never display a MAL panel or MAL error.
        const overlays=await readJson(`/MisioFlix/api/overlays?ids=${id}`);
        const overlay=Array.isArray(overlays)?overlays.find(item=>compact(item.id)===id):null;
        if(!overlay||overlay.anime!==true){
          updateSession(session,'irrelevant','');return;
        }
        updateSession(session,'loading','Sprawdzanie MAL ID z NFO…',{animeVerified:true});
        const target=await readJson(`/MisioFlix/api/mal/resolve?catalogId=${catalogId}${seasonId?'&seasonId='+seasonId:''}`);
        if(!target?.anime){
          updateSession(session,'irrelevant','');return;
        }
        const malId=Number(target.malId);
        if(!Number.isSafeInteger(malId)||malId<=0){
          updateSession(session,'missing',seasonId?
            'Ten sezon nie ma MAL ID w season.nfo.':'Ten tytuł nie ma MAL ID w NFO.');return;
        }
        Object.assign(session,{catalogId,seasonId,malId});
        rememberBinding(uid,seasonId||catalogId,malId);
        updateSession(session,'loading','Sprawdzanie połączenia MyAnimeList…');
        const c=await connectionStatus();
        if(!c.connected){
          updateSession(session,'disconnected','MAL nie jest połączony z tym użytkownikiem Jellyfin.');return;
        }
        const cached=loadCache(uid,malId);
        if(cached&&Date.now()-cached.at<cacheTime){
          updateSession(session,'ready','',{entry:cached.entry,fromCache:true});
          ensureIndexFromSelectedAnime(uid);return;
        }
        updateSession(session,'loading','Wczytywanie danych tego anime z MyAnimeList…');
        const data=await request(`/item?catalogId=${catalogId}${seasonId?'&seasonId='+seasonId:''}&refresh=false`);
        if(!data.connected){
          updateSession(session,'disconnected','MAL został odłączony. Połącz konto ponownie.');return;
        }
        storeVisible(uid,malId,data.entry);
        updateSession(session,'ready','',{entry:data.entry,fromCache:false});
        ensureIndexFromSelectedAnime(uid);
      }catch(error){
        updateSession(session,'error','Nie udało się sprawdzić tego anime: '+
          (error?.message||'nieznany błąd')+'. Ponowienie następuje tylko po naciśnięciu przycisku.');
      }
    })();
    session.promise=run;
    return run;
  }
  function mountDetails(page,id){
    const uid=currentUser;
    if(!valid(uid))return;
    const session=newDetailSession(uid,id);
    const panel=el('section','mf-mal-detail-panel');
    panel.hidden=true; // No loading flash on ordinary movies/series before verification.
    panel.setAttribute('aria-label','Moja lista anime na MyAnimeList');
    const mobileToggle=el('button','mf-mal-mobile-toggle','MAL');
    mobileToggle.type='button';mobileToggle.setAttribute('aria-expanded','false');
    const detailsContent=el('div','mf-mal-content');
    detailsContent.id='mf-mal-detail-'+id;
    mobileToggle.setAttribute('aria-controls',detailsContent.id);
    panel.dataset.mfExpanded='false';
    mobileToggle.addEventListener('click',()=>{
      const expanded=panel.dataset.mfExpanded!=='true';
      panel.dataset.mfExpanded=String(expanded);
      mobileToggle.setAttribute('aria-expanded',String(expanded));
    });
    panel.append(mobileToggle,el('h3','','Moje MyAnimeList'),detailsContent);
    const rail=page.querySelector('.mf-detail-poster-rail');
    const host=rail||page.querySelector('.mf-detail-main')||page.querySelector('.detailPagePrimaryContent');
    if(!host)return;
    // Rail order is poster → Continue Watching → MAL. Do not move the player.
    if(rail)rail.append(panel);
    else{
      const seriesSections=host.querySelector('.mf-detail-series-sections');
      host.insertBefore(panel,seriesSections||null);
    }
    detailGeneration++;detailPanel=panel;currentDetail=id;currentDetailKey=session.key;
    paintSession(session);
    void startDetailRead(session);
  }
  function clearHeaderForPreviousDetail(){
    document.querySelectorAll('#itemDetailPage.mf-detail-mal-rating').forEach(p=>{
      p.classList.remove('mf-detail-mal-rating');p.removeAttribute('data-mf-mal-watch');
      p.querySelector('.mf-detail-mal-badge')?.remove();
    });
  }
  function syncDetails(){
    const id=detailId();const page=id?detailPage(id):null;
    if(!id||!page){
      if(currentDetail){detailGeneration++;currentDetail='';currentDetailKey='';detailPanel=null;clearHeaderForPreviousDetail();}
      return;
    }
    if(currentDetail===id&&detailPanel?.isConnected&&detailPanel.closest('#itemDetailPage')===page)return;
    if(detailPanel?.isConnected)detailPanel.remove();
    clearHeaderForPreviousDetail();
    mountDetails(page,id);
  }
  function tick(){
    timer=0;onUserSwitch();
    mountHomeButton();
    syncDetails();
    decorateMalCards();
  }
  function schedule(){if(timer)return;timer=window.setTimeout(tick,180);}
  function init(){
    if(observing)return;observing=true;
    const mo=new MutationObserver(changes=>{
      // Own modal/form updates are not Jellyfin navigation.
      if(changes.some(c=>c.type==='childList' &&
        !(c.target?.nodeType===1 && c.target.closest('.mf-mal-detail-panel, .mf-mal-modal-overlay'))))schedule();
    });
    mo.observe(document.body,{childList:true,subtree:true});
    ['hashchange','pageshow','popstate'].forEach(e=>window.addEventListener(e,schedule));
    window.addEventListener('misioflix-mal-cache-changed',schedule);
    window.addEventListener('misioflix-mal-binding-ready',schedule);
    window.addEventListener('misioflix-mal-updated',()=>{
      connection=null;detailSessions.clear();detailGeneration++;indexRequestedUser='';detailPanel?.remove();
      detailPanel=null;currentDetail='';currentDetailKey='';schedule();
    });
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
