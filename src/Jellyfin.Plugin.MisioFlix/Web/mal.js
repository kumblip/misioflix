/* MisioFlix v0.4.30: per-Jellyfin-user MyAnimeList UI.
 * Home: OAuth connect/disconnect only, never fetch anime list.
 * Item details: lazy one-item MAL read, local display cache and explicit save/refresh.
 * Does not alter Jellyfin playback, NFO or native React-owned DOM children.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_MAL_0430__) return;
  window.__MISIOFLIX_MAL_0430__ = true;
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
  const headers=()=>({Authorization:`MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-mal", Version="0.4.30", Token="${token().replace(/["\r\n]/g,'')}"`});
  const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x;};
  const params=()=>new URLSearchParams((window.location.hash||'').split('?')[1]||'');
  const homeRoute=()=>/^#\/(?:home)?(?:\?|$)/i.test(location.hash||'#/home') && (params().get('tab')||'0')==='0' && !params().has('mfCollections');
  const detailId=()=>/^#\/details\?/i.test(location.hash||'')?compact(params().get('id')):'';
  const cacheKey=(uid,malId)=>`misioflix-mal-v1:${compact(uid)}:${malId}`;
  const loadCache=(uid,malId)=>{
    try {const a=JSON.parse(localStorage.getItem(cacheKey(uid,malId))||'null');return a&&typeof a.at==='number'&&a.at>Date.now()-7*24*3600e3?a:null;}
    catch{return null;}
  };
  const saveCache=(uid,malId,entry)=>{try{localStorage.setItem(cacheKey(uid,malId),JSON.stringify({at:Date.now(),entry}));}catch{}};
  const clearCache=uid=>{
    try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith(`misioflix-mal-v1:${compact(uid)}:`))localStorage.removeItem(k);}}catch{}
  };
  async function request(path,method='GET',body){
    const r=await fetch(API+path,{method,cache:'no-store',credentials:'same-origin',headers:{...headers(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data.error||`Błąd MAL: HTTP ${r.status}`);
    return data;
  }
  function value(o,...keys){for(const key of keys){if(o&&o[key]!==undefined&&o[key]!==null)return o[key];}return undefined;}
  function entryFields(item){
    // Old MAL service models may use PascalCase or MAL's native snake_case.
    const obj=value(item,'my_list_status','MyListStatus')||item||{};
    return {
      status:String(value(obj,'status','Status')||'plan_to_watch'),
      score:Number(value(obj,'score','Score')||0),
      episodesWatched:Number(value(obj,'num_episodes_watched','NumEpisodesWatched','episodesWatched','EpisodesWatched')||0),
      timesRewatched:Number(value(obj,'num_times_rewatched','NumTimesRewatched','timesRewatched','TimesRewatched')||0)
    };
  }
  let currentUser='',connection=null,connectionPromise=null,dialog=null,homeButton=null;
  let currentDetail='',detailGeneration=0,detailPanel=null,observing=false,timer=0;
  const sessionValidated=new Set();
  function onUserSwitch(){
    const uid=compact(userId());
    if(uid===currentUser)return;
    currentUser=uid;connection=null;connectionPromise=null;homeButton=null;
    sessionValidated.clear();detailGeneration++;
    detailPanel?.remove();detailPanel=null;currentDetail='';
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
  function storeVisible(uid,malId,entry){saveCache(uid,malId,entry);sessionValidated.add(`${uid}:${malId}`);}
  function renderEntry(panel,entry,ctx,fromCache=false){
    if(!panel.isConnected||ctx.generation!==detailGeneration||detailId()!==ctx.pageId)return;
    const main=panel.querySelector('.mf-mal-content');main.replaceChildren();
    const summary=el('p','mf-mal-summary',fromCache?'Dane zapisane lokalnie. Odśwież, aby sprawdzić zmiany w MAL.':'Dane MyAnimeList dla tego tytułu.');main.append(summary);
    const parsed=entryFields(entry);
    const status=makeSelect(statuses,parsed.status);if(!statuses.some(([s])=>s===parsed.status))status.value='plan_to_watch';
    const scores=[['0','Bez oceny'],...Array.from({length:10},(_,i)=>[String(i+1),`${i+1}/10`])];
    const score=makeSelect(scores,parsed.score);
    const episodes=el('input');episodes.type='number';episodes.min='0';episodes.max='9999';episodes.step='1';episodes.value=String(Math.max(0,parsed.episodesWatched));
    const rewatches=el('input');rewatches.type='number';rewatches.min='0';rewatches.max='9999';rewatches.step='1';rewatches.value=String(Math.max(0,parsed.timesRewatched));
    const form=el('form','mf-mal-form');form.append(
      inputRow('Status',status),inputRow('Ocena',score),
      inputRow('Obejrzane odcinki',episodes,'Liczba odcinków oznaczonych w MAL jako obejrzane.'),
      inputRow('Ponowne pełne obejrzenia',rewatches,'MAL liczy tylko powtórki, nie pierwsze obejrzenie.')
    );
    const fullView=el('p','mf-mal-summary');
    const updateFullView=()=>{
      const repeats=Number(rewatches.value)||0;
      fullView.textContent='Pełne obejrzenia łącznie: '+(status.value==='completed'?String(repeats+1):'nieustalone')+
        ' (w MAL liczba powtórek: '+repeats+').';
    };
    status.addEventListener('change',updateFullView);
    rewatches.addEventListener('input',updateFullView);
    updateFullView();
    form.appendChild(fullView);
    const actions=el('div','mf-mal-detail-actions');
    const save=el('button','mf-mal-action','Zapisz w MAL');save.type='submit';
    const refresh=el('button','mf-mal-action-secondary','Odśwież z MAL');refresh.type='button';
    const message=el('span','mf-mal-save-message');message.setAttribute('role','status');
    actions.append(save,refresh,message);form.append(actions);main.append(form);
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(!form.isConnected)return;
      const fields=[Number(score.value),Number(episodes.value),Number(rewatches.value)];
      if(fields.some(v=>!Number.isSafeInteger(v)||v<0)||fields[0]>10||fields[1]>9999||fields[2]>9999){message.textContent='Nieprawidłowe wartości.';return;}
      save.disabled=true;refresh.disabled=true;message.textContent='Zapisywanie…';
      try{
        const answer=await request('/update','POST',{catalogId:ctx.catalogId,seasonId:ctx.seasonId||null,status:status.value,score:fields[0],episodesWatched:fields[1],timesRewatched:fields[2]});
        const result=answer&&typeof answer==='object'?answer:{status:status.value,score:fields[0],episodesWatched:fields[1],timesRewatched:fields[2]};
        if(ctx.generation===detailGeneration&&currentUser===ctx.userId){
          storeVisible(ctx.userId,ctx.malId,result);
          message.textContent='Zapisano w MyAnimeList.';
        }
      }catch(e){message.textContent=e.message||'Błąd zapisu w MAL';}
      finally{save.disabled=false;refresh.disabled=false;}
    });
    refresh.addEventListener('click',async()=>{
      refresh.disabled=true;message.textContent='Sprawdzanie MAL…';
      try{
        const data=await request(`/item?catalogId=${ctx.catalogId}${ctx.seasonId?'&seasonId='+ctx.seasonId:''}&refresh=true`);
        if(data.connected&&ctx.generation===detailGeneration&&currentUser===ctx.userId&&panel.isConnected){storeVisible(ctx.userId,ctx.malId,data.entry);renderEntry(panel,data.entry,ctx,false);}
        else message.textContent='MAL nie jest połączony.';
      }catch(e){message.textContent=e.message;}finally{refresh.disabled=false;}
    });
  }
  async function mountDetails(page,id){
    const serial=++detailGeneration;
    const panel=el('section','mf-mal-detail-panel');panel.setAttribute('aria-label','Moja lista anime na MyAnimeList');
    panel.append(el('h3','','Moje MyAnimeList'),el('p','mf-mal-detail-caption','Ocena, status i obejrzenia — osobno dla tego anime lub sezonu.'));
    const content=el('div','mf-mal-content');content.append(el('p','mf-mal-message','Sprawdzanie MAL ID z NFO…'));panel.append(content);
    const host=page.querySelector('.mf-detail-main')||page.querySelector('.detailPagePrimaryContent');
    if(!host)return;
    const seriesSections=host.querySelector('.mf-detail-series-sections');
    host.insertBefore(panel,seriesSections||null);
    detailPanel=panel;currentDetail=id;
    function say(message){if(serial===detailGeneration&&panel.isConnected)content.replaceChildren(el('p','mf-mal-message',message));}
    try{
      const metadata=await fetch(`/Users/${compact(userId())}/Items/${id}`,{headers:headers(),cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Nie udało się odczytać rodzaju anime');return r.json();});
      if(serial!==detailGeneration||!panel.isConnected)return;
      if(!['Series','Season','Movie'].includes(metadata.Type)){panel.remove();return;}
      const catalogId=metadata.Type==='Season'?compact(metadata.SeriesId):id;
      const seasonId=metadata.Type==='Season'?id:'';
      if(!valid(catalogId)){panel.remove();return;}
      const r=await fetch('/MisioFlix/api/item/'+catalogId,{headers:headers(),cache:'no-store'});
      if(!r.ok){panel.remove();return;}
      const catalog=await r.json();
      if(serial!==detailGeneration||!panel.isConnected)return;
      if(!catalog?.item?.anime){panel.remove();return;}
      const season=catalog.seasons?.find(s=>compact(s.id)===seasonId);
      const malId=seasonId?Number(season?.mal_id):Number(catalog.item.mal_id);
      if(!Number.isSafeInteger(malId)||malId<=0){say(seasonId?'Ten sezon nie ma MAL ID w season.nfo.':'Ten tytuł nie ma MAL ID w NFO.');return;}
      panel.querySelector('.mf-mal-detail-caption').textContent=`MAL ID: ${malId} · ${seasonId?'Ten sezon':'Ten tytuł'}`;
      const ctx={catalogId,seasonId,malId,generation:serial,pageId:id,userId:currentUser};
      const c=await connectionStatus();
      if(serial!==detailGeneration||!panel.isConnected)return;
      if(!c.connected){
        const a=el('a','mf-mal-link','Połącz konto MAL na stronie głównej');a.href='#/home';content.replaceChildren(a);return;
      }
      const cached=loadCache(currentUser,malId);
      if(cached){renderEntry(panel,cached.entry,ctx,true);}
      // Read only when the anime/season details is selected. The backend
      // uses the cached list unless the user explicitly presses refresh.
      if(cached&&Date.now()-cached.at<cacheTime)return;
      say('Wczytywanie zapamiętanych danych MAL…');
      const data=await request(`/item?catalogId=${catalogId}${seasonId?'&seasonId='+seasonId:''}&refresh=false`);
      if(serial!==detailGeneration||!panel.isConnected)return;
      if(!data.connected){say('MAL odłączony. Połącz konto na stronie głównej.');return;}
      storeVisible(currentUser,malId,data.entry);renderEntry(panel,data.entry,ctx,false);
    }catch(error){say('Nie udało się odczytać MAL: '+error.message);}
  }
  function syncDetails(){
    const id=detailId();const page=id?detailPage(id):null;
    if(!id||!page){if(currentDetail){detailGeneration++;currentDetail='';detailPanel=null;}return;}
    if(currentDetail===id&&detailPanel?.isConnected)return;
    if(detailPanel?.isConnected)detailPanel.remove();
    void mountDetails(page,id);
  }
  function tick(){
    timer=0;onUserSwitch();
    mountHomeButton();
    syncDetails();
  }
  function schedule(){if(timer)return;timer=window.setTimeout(tick,180);}
  function init(){
    if(observing)return;observing=true;
    const mo=new MutationObserver(changes=>{if(changes.some(c=>c.type==='childList'))schedule();});
    mo.observe(document.body,{childList:true,subtree:true});
    ['hashchange','pageshow','popstate'].forEach(e=>window.addEventListener(e,schedule));
    window.addEventListener('misioflix-mal-updated',()=>{connection=null;detailGeneration++;detailPanel?.remove();detailPanel=null;currentDetail='';schedule();});
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
