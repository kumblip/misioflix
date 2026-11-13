/* MisioFlix Simkl module v0.4.46 — intentionally independent of mal.js.
 * Read-only on playback; only a manual "Zapisz w Simkl" submits mutations.
 * No MAL caches, MAL classes, MAL APIs, Jellyfin play-state or NFO writes.
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
  const headers=()=>({Authorization:`MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-simkl", Version="0.4.46", Token="${token().replace(/["\r\n]/g,'')}"`});
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
  function resetUser(){
    const id=user();if(id===currentUser)return;
    currentUser=id;connection=null;connectionPromise=null;button=null;sessions.clear();generation++;
    panel?.remove();panel=null;currentDetail='';closeModal();
  }
  async function getConnection(force=false){
    resetUser();if(!valid(currentUser)||!token())return {connected:false};
    if(connection&&!force)return connection;
    if(connectionPromise&&!force)return connectionPromise;
    const id=currentUser;
    const pending=request('/connection').then(data=>{if(id===currentUser){connection=data;syncHomeButton();}return data;})
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
    function draw(c){
      body.replaceChildren(message);
      if(c?.connected){
        note('Simkl jest połączony wyłącznie z tym użytkownikiem Jellyfin. Historia oglądania w MisioFlix nie wysyła żadnych zmian do Simkl.');
        body.append(el('p','mf-simkl-message',c.canWrite?'Dostęp do ręcznej edycji: aktywny.':'Brak uprawnienia media:write — połącz konto ponownie.'));
        body.append(action('Sprawdź status',async()=>{try{connection=null;draw(await getConnection(true));}catch(e){note(e.message);}}));
        body.append(action('Rozłącz Simkl',async()=>{
          if(!window.confirm('Odłączyć Simkl dla tego użytkownika Jellyfin? Lista Simkl pozostanie bez zmian.'))return;
          try{await request('/disconnect','POST');connection={connected:false};sessions.clear();syncHomeButton();draw(connection);}
          catch(e){note(e.message);}
        }));
        return;
      }
      note('Połącz własne konto Simkl. Używany jest osobny kod PIN AUTH V2. Nic nie jest automatycznie wysyłane do listy.');
      body.append(action('Rozpocznij łączenie Simkl',async()=>{
        try{
          const result=await request('/connect','POST');
          body.replaceChildren(message);
          note('Wpisz kod na stronie Simkl i zatwierdź dostęp. Następnie kliknij „Sprawdź zatwierdzenie”.');
          const code=el('strong','mf-simkl-pin',result.code);
          const link=el('a','mf-simkl-link','Otwórz simkl.com/pin');link.href=result.uri;link.rel='noopener noreferrer';link.target='_blank';
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
    const entry=session.data.entry;
    const kind=session.data.kind;const season=session.data.seasonNumber;
    const rows=[
      ['Moja ocena',entry?.score>0?`${entry.score}/10`:'Bez oceny'],
      ['Status',entry?statusName(kind,entry.status):'Nie dodano do Simkl'],
      ['Ponowne obejrzenia','Brak danych'],
      ['Obejrzane odcinki',kind==='shows'?(entry?.watchedEpisodes??'Brak danych'):'Nie dotyczy']
    ];
    const read=el('div','mf-simkl-readonly');
    for(const [label,value] of rows){const cell=el('div','mf-simkl-readonly-cell');cell.append(el('span','mf-simkl-readonly-label',label),el('strong','mf-simkl-readonly-value',value));read.append(cell);}
    content.append(read);
    if(season!==null && season!==undefined)content.append(el('p','mf-simkl-summary',`Sezon ${season}: Simkl pokazuje status i ocenę całego serialu, nie osobną listę sezonu.`));
    if(kind==='shows')content.append(el('p','mf-simkl-summary','Licznik obejrzanych odcinków jest tylko do odczytu. Jego zmiana wymaga historii konkretnych odcinków.'));
    const actions=el('div','mf-simkl-view-actions');
    const refresh=el('button','mf-simkl-action-secondary','Odśwież z Simkl');refresh.type='button';
    const live=el('span','mf-simkl-save-message');live.setAttribute('role','status');actions.append(refresh,live);content.append(actions);
    const editor=el('details','mf-simkl-editor');editor.append(el('summary','mf-simkl-editor-toggle','Edytuj Simkl'));
    const status=select(statuses(kind),entry?.status||'plantowatch');
    const score=select([['0','Bez oceny'],...Array.from({length:10},(_,i)=>[String(i+1),`${i+1}/10`])],String(entry?.score||0));
    const form=el('form','mf-simkl-form');form.append(field('Status',status),field('Moja ocena',score));
    const saveRow=el('div','mf-simkl-detail-actions');const save=el('button','mf-simkl-action','Zapisz w Simkl');save.type='submit';
    const result=el('span','mf-simkl-save-message');result.setAttribute('role','status');
    saveRow.append(save,result);form.append(saveRow);editor.append(form);content.append(editor);
    const same=()=>session.id===currentDetail&&session.user===currentUser&&panel?.isConnected;
    async function reload(){
      const key=`${session.catalogId}:${session.seasonId||''}`;
      const latest=await request(`/item?catalogId=${session.catalogId}${session.seasonId?'&seasonId='+session.seasonId:''}&refresh=true`);
      if(!same())return;
      session.data=latest;session.at=Date.now();session.phase='ready';renderReady(session);
    }
    refresh.addEventListener('click',async()=>{
      refresh.disabled=true;live.textContent='Sprawdzanie Simkl…';
      try{await reload();}catch(e){live.textContent=e.message;}finally{refresh.disabled=false;}
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const changedStatus=entry===null||status.value!==entry.status;
      const changedScore=Number(score.value)!==Number(entry?.score||0);
      if(!changedStatus&&!changedScore){result.textContent='Nie zmieniono żadnego pola.';return;}
      if(!window.confirm('Zapisać wybrane zmiany w Simkl? To jedyna operacja, która modyfikuje Twoją listę Simkl.'))return;
      save.disabled=true;refresh.disabled=true;result.textContent='Zapisywanie w Simkl…';
      try{
        await request('/update','POST',{catalogId:session.catalogId,seasonId:session.seasonId||null,
          status:status.value,score:Number(score.value),changeStatus:changedStatus,changeScore:changedScore});
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
        if(!['Series','Season','Movie'].includes(media.Type))return;
        session.catalogId=media.Type==='Season'?compact(media.SeriesId):session.id;
        session.seasonId=media.Type==='Season'?session.id:'';
        if(!valid(session.catalogId))throw new Error('Brak identyfikatora serialu.');
        const result=await request(`/item?catalogId=${session.catalogId}${session.seasonId?'&seasonId='+session.seasonId:''}`);
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
    if(!session){session={key,user:currentUser,id,phase:'idle',at:0,data:null,message:'',catalogId:'',seasonId:''};sessions.set(key,session);}
    show(session);void read(session);
  }
  function syncDetails(){
    const id=detailId();const page=id?pageFor(id):null;
    if(!id||!page){if(currentDetail){currentDetail='';panel=null;generation++;}return;}
    if(currentDetail===id&&panel?.isConnected&&panel.closest('#itemDetailPage')===page)return;
    panel?.remove();panel=null;mount(page,id);
  }
  function tick(){timer=0;resetUser();mountHome();syncDetails();}
  function schedule(){if(!timer)timer=window.setTimeout(tick,180);}
  function init(){
    const observer=new MutationObserver(changes=>{
      if(changes.some(c=>c.type==='childList' &&
        !(c.target?.nodeType===1&&c.target.closest('.mf-simkl-detail-panel, .mf-simkl-modal-overlay'))))schedule();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    ['hashchange','pageshow','popstate'].forEach(evt=>window.addEventListener(evt,schedule));
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
