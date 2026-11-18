#!/usr/bin/env python3
"""MisioFlix 0.4.100: narrow, fail-closed upgrade of search-only catalogue caching.

Does not replace newer v0.4.99 sources; modifies the user's checkout in place after
verifying anchors and required base version. Designed for an isolated checkout.
"""
import argparse
import json
import re
from pathlib import Path

CACHE_BLOCK = r'''  // v0.4.100: search-only snapshots; never persist authorization tokens.
  // Database keys include Jellyfin server, authenticated user and catalog schema.
  const catalogFetchedAt = new Map();
  const catalogRequests = new Map();
  const SEARCH_CATALOG_FRESH_MS = 90000;
  const SEARCH_CATALOG_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
  const SEARCH_CATALOG_DB = 'misioflix-search-catalog-v1';
  let catalogDatabasePromise = null;
  const catalogSchemaVersion = 'v1'; // Increment only when catalogue DTO semantics change.
  function catalogScope(){
    const client = window.ApiClient || window.ConnectionManager?.getApiClient?.();
    const userId = client?.getCurrentUserId?.();
    const serverId = typeof client?.serverId === 'function' ? client.serverId() : client?.serverId;
    return currentToken() && validId(userId) && validId(serverId)
      ? compactId(serverId) + ':' + compactId(userId) + ':' + catalogSchemaVersion : '';
  }
  function catalogFullKey(libraryId){
    const scope = catalogScope();
    const lib = validId(libraryId) ? compactId(libraryId) : 'all';
    return scope ? scope + ':' + lib : '';
  }
  function openCatalogDatabase(){
    if(!('indexedDB' in window))return Promise.resolve(null);
    if(catalogDatabasePromise)return catalogDatabasePromise;
    catalogDatabasePromise = new Promise(resolve => {
      try{
        const attempt = window.indexedDB.open(SEARCH_CATALOG_DB, 1);
        attempt.onupgradeneeded = () => {
          if(!attempt.result.objectStoreNames.contains('catalogs'))
            attempt.result.createObjectStore('catalogs', {keyPath:'key'});
        };
        attempt.onsuccess = () => resolve(attempt.result);
        attempt.onerror = () => resolve(null);
        attempt.onblocked = () => resolve(null);
      }catch{resolve(null);}
    });
    return catalogDatabasePromise;
  }
  async function readCatalogSnapshot(fullKey){
    if(!fullKey)return null;
    // IndexedDB may be disabled or blocked. Never hold up search indefinitely.
    const database = await Promise.race([
      openCatalogDatabase(),
      new Promise(resolve => window.setTimeout(() => resolve(null), 900))
    ]);
    if(!database)return null;
    return new Promise(resolve => {
      try{
        const transaction = database.transaction('catalogs','readonly');
        const op = transaction.objectStore('catalogs').get(fullKey);
        op.onsuccess = () => {
          const row = op.result;
          const valid = row && row.key===fullKey &&
            Number.isFinite(row.savedAt) && row.savedAt <= Date.now() &&
            Date.now() - row.savedAt < SEARCH_CATALOG_MAX_AGE_MS &&
            Array.isArray(row.data?.items) && row.data?.genres;
          resolve(valid ? row : null);
        };
        op.onerror = () => resolve(null);
        transaction.onabort = () => resolve(null);
      }catch{resolve(null);}
    });
  }
  async function writeCatalogSnapshot(fullKey, data, savedAt){
    if(!fullKey || catalogFullKey(fullKey.split(':').pop()) !== fullKey)return;
    const db = await openCatalogDatabase();
    if(!db || catalogFullKey(fullKey.split(':').pop()) !== fullKey)return;
    try{
      const tx = db.transaction('catalogs','readwrite');
      tx.objectStore('catalogs').put({key:fullKey, savedAt, data});
    }catch{/* Full storage or private mode: memory cache still works. */}
  }
  async function clearCatalogSnapshots(){
    const db=await openCatalogDatabase();
    if(!db)return;
    try{db.transaction('catalogs','readwrite').objectStore('catalogs').clear();}
    catch{/* Best effort only. */}
  }
'''

REPLACE_GET = r'''  // CATALOG LOADS ONLY AFTER THE USER OPENS SEARCH. Never on initial Home.
  // The search catalogue is fetched on demand, not during Home mounting.
  // Cached entries are immediately available after revisiting Home, and persist
  // across normal browser reloads when IndexedDB is available. A fresh network
  // request remains the source of truth and never receives a cached HTTP response.
  function normalizeCatalogResponse(data){
    return {
      items:Array.isArray(data?.items)?data.items:[],
      genres:{anime:Array.isArray(data?.genres?.anime)?data.genres.anime:[],
              media:Array.isArray(data?.genres?.media)?data.genres.media:[]}
    };
  }
  async function fetchCurrentCatalog(libraryId=''){
    const fullKey=catalogFullKey(libraryId);
    const key=validId(libraryId)?compactId(libraryId):'all';
    const path='/catalog'+(key==='all'?'':'?libraryId='+encodeURIComponent(key));
    // Without an identity, do not coalesce requests across token changes.
    if(!fullKey)return normalizeCatalogResponse(await request(path,'GET',undefined,90000));
    const capturedToken=currentToken();
    const networkKey=fullKey;
    if(catalogRequests.has(networkKey))return catalogRequests.get(networkKey);
    const pending=request(path,'GET',undefined,90000).then(raw=>{
      const normalized=normalizeCatalogResponse(raw);
      // A logout, server switch or Jellyfin user switch must never save or
      // publish a previous user's catalogue as the current user's data.
      if(capturedToken===currentToken() && fullKey===catalogFullKey(libraryId)){
        const at=Date.now();
        catalogFetchedAt.set(fullKey,at);
        catalogCache.set(fullKey,Promise.resolve(normalized));
        void writeCatalogSnapshot(fullKey,normalized,at);
      }
      return normalized;
    }).finally(()=>{if(catalogRequests.get(networkKey)===pending)catalogRequests.delete(networkKey);});
    catalogRequests.set(networkKey,pending);
    return pending;
  }
  async function getCatalogForSearch(libraryId='',force=false){
    const fullKey=catalogFullKey(libraryId);
    // Without verified Jellyfin identity, always fetch through authenticated API.
    if(!fullKey)return fetchCurrentCatalog(libraryId);
    if(force)return fetchCurrentCatalog(libraryId);
    if(!catalogCache.has(fullKey)){
      const pending=(async()=>{
        const stored=await readCatalogSnapshot(fullKey);
        if(fullKey!==catalogFullKey(libraryId))throw Error('Zmieniono użytkownika Jellyfin');
        if(stored){
          catalogFetchedAt.set(fullKey,stored.savedAt);
          return stored.data;
        }
        return await fetchCurrentCatalog(libraryId);
      })();
      const guarded=pending.catch(error=>{
        if(catalogCache.get(fullKey)===guarded)catalogCache.delete(fullKey);
        throw error;
      });
      catalogCache.set(fullKey,guarded);
    }
    return catalogCache.get(fullKey);
  }
'''

REPLACE_SCOPED = r'''  async function loadScopedCatalog(state){
    return loadScopedCatalogForMode(state,false);
  }
  async function refreshScopedCatalog(state){
    return loadScopedCatalogForMode(state,true);
  }
  async function loadScopedCatalogForMode(state,force){
    const libraries=state.scopedLibraries;
    if(!libraries.length)return {items:[],needsRefresh:false};
    const all=await Promise.all(libraries.map(async lib=>{
      const data=await getCatalogForSearch(lib.id,force);
      return data.items.map(item=>({...item,library_id:compactId(lib.id),library_name:lib.name}));
    }));
    const needsRefresh=!force && libraries.some(lib=>{
      const stamp=catalogFetchedAt.get(catalogFullKey(lib.id));
      return stamp && Date.now()-stamp>SEARCH_CATALOG_FRESH_MS;
    });
    return {items:all.flat(),needsRefresh};
  }
'''

REPLACE_LOAD = r'''  function displaySearchCatalog(state,data,preserveFilters=false){
    const previous=preserveFilters?new Map(state.genreStates):null;
    const previousCount=preserveFilters?state.shown:0;
    const previousScroll=preserveFilters?state.scroller.scrollTop:0;
    state.pool=sortCatalog(data.items.filter(x=>state.kind==='anime'
      ? x.anime && ['Series','Movie','Season'].includes(x.type)
      : !x.anime && ['Series','Movie'].includes(x.type)));
    indexAnimeSeasons(state);
    state.unmatchedGenre='';
    initializeGenres(state,data);
    if(previous){
      for(const [genre,mode] of previous){
        if(state.genreNames.has(genre) && mode)state.genreStates.set(genre,mode);
      }
      drawGenreButtons(state);
    }
    paintSearchResults(state);
    if(preserveFilters){
      while(state.shown<previousCount && state.shown<state.matches.length)appendMoreResults(state);
      state.scroller.scrollTop=previousScroll;
    }
    if(state.unmatchedGenre)state.status.textContent='Nie znaleziono gatunku „'+state.unmatchedGenre+'” w tej wyszukiwarce.';
  }
  async function loadSearch(state,force=false){
    const job=++state.requestId;
    state.status.textContent=force?'Odświeżanie katalogu z Jellyfina…':'Odczytywanie katalogu — bez przeładowania strony Jellyfin…';
    state.refresh.disabled=true;
    try{
      const data=await (force?refreshScopedCatalog(state):loadScopedCatalog(state));
      if(state!==activeSearch || !state.overlay.isConnected || job!==state.requestId)return;
      displaySearchCatalog(state,data,false);
      if(data.needsRefresh){
        // Display cached results first, then silently replace with current data.
        // Do not reset any user's typed query, type, library or genre filters.
        void refreshScopedCatalog(state).then(updated=>{
          if(state!==activeSearch || !state.overlay.isConnected || job!==state.requestId)return;
          displaySearchCatalog(state,updated,true);
        }).catch(()=>{
          if(state===activeSearch && state.overlay.isConnected && job===state.requestId)
            state.status.textContent='Katalog z pamięci. Odświeżanie nie powiodło się; użyj „Odśwież dane”.';
        });
      }
    }catch(error){
      if(state===activeSearch && state.overlay.isConnected && job===state.requestId){
        state.status.textContent='Nie udało się odczytać katalogu. Użyj „Odśwież dane”.';
        if(!state.pool.length)state.grid.replaceChildren();
      }
    }finally{if(job===state.requestId)state.refresh.disabled=false;}
  }
'''

OLD_GET = '''  // CATALOG LOADS ONLY AFTER THE USER OPENS SEARCH. Never on initial Home.
  async function getCatalogForSearch(libraryId=''){
    const key=validId(libraryId)?compactId(libraryId):'all';
    if(!catalogCache.has(key)){
      const path='/catalog'+(key==='all'?'':'?libraryId='+encodeURIComponent(key));
      const promise=request(path,'GET',undefined,90000).then(data=>({
        items:Array.isArray(data?.items)?data.items:[],
        genres:{anime:Array.isArray(data?.genres?.anime)?data.genres.anime:[],
                media:Array.isArray(data?.genres?.media)?data.genres.media:[]}
      })).catch(error=>{catalogCache.delete(key);throw error;});
      catalogCache.set(key,promise);
    }
    return await catalogCache.get(key);
  }
'''
OLD_SCOPED = '''  async function loadScopedCatalog(state){
    const libraries=state.scopedLibraries;
    if(!libraries.length)return {items:[]};
    const all=await Promise.all(libraries.map(async lib=>{
      const data=await getCatalogForSearch(lib.id);
      return data.items.map(item=>({...item,library_id:compactId(lib.id),library_name:lib.name}));
    }));
    return {items:all.flat()};
  }
'''
OLD_LOAD = '''  async function loadSearch(state){
    const job=++state.requestId;
    state.status.textContent='Odczytywanie katalogu — bez przeładowania strony Jellyfin…';
    state.refresh.disabled=true;
    try{
      const data=await loadScopedCatalog(state);
      if(state!==activeSearch || !state.overlay.isConnected || job!==state.requestId)return;
      state.pool=sortCatalog(data.items.filter(x=>state.kind==='anime'
        ? x.anime && ['Series','Movie','Season'].includes(x.type)
        : !x.anime && ['Series','Movie'].includes(x.type)));
      indexAnimeSeasons(state);
      initializeGenres(state,data);
      paintSearchResults(state);
      if(state.unmatchedGenre)state.status.textContent='Nie znaleziono gatunku „'+state.unmatchedGenre+'” w tej wyszukiwarce.';
    }catch(error){
      if(state===activeSearch && state.overlay.isConnected){
        state.status.textContent='Nie udało się odczytać katalogu. Użyj „Odśwież dane”.';
        state.grid.replaceChildren();
      }
    }finally{state.refresh.disabled=false;}
  }
'''


def replace_once(source, old, new, label):
    qty=source.count(old)
    if qty!=1:
        raise RuntimeError(f'{label}: expected ONE matching source block, got {qty}; no changes written')
    return source.replace(old,new,1)


def transform(home):
    # Validate all matches before any files are saved.
    home=replace_once(home,'  const catalogCache = new Map();\n',
                      '  const catalogCache = new Map();\n'+CACHE_BLOCK, 'cache helper insertion')
    home=replace_once(home,OLD_GET,REPLACE_GET,'catalog request implementation')
    home=replace_once(home,OLD_SCOPED,REPLACE_SCOPED,'user-scoped load implementation')
    old_refresh="""      for(const lib of state.scopedLibraries)catalogCache.delete(compactId(lib.id));
      state.watchSnapshot=null;state.watchFallback=false;
      ++state.watchRequestId;state.watchLoading=false;
      loadSearch(state);
"""
    new_refresh="""      // Explicit refresh bypasses all snapshots, including IndexedDB.
      state.watchSnapshot=null;state.watchFallback=false;
      ++state.watchRequestId;state.watchLoading=false;
      loadSearch(state,true);
"""
    home=replace_once(home,old_refresh,new_refresh,'manual refresh implementation')
    home=replace_once(home,OLD_LOAD,REPLACE_LOAD,'search paint and revalidate implementation')
    # On SPA navigation, keep memory snapshots. Logout/user switch still clears.
    old_nav="""      librariesCache=[];catalogCache.clear();
      owner=token;
"""
    new_nav="""      librariesCache=[];
      if(!token || token!==owner){
        catalogCache.clear();catalogFetchedAt.clear();
        if(!token && owner)void clearCatalogSnapshots();
      }
      owner=token;
"""
    home=replace_once(home,old_nav,new_nav,'SPA navigation cache persistence')
    home=replace_once(home,
      'resumeData={items:[],hidden:[]};librariesCache=[];catalogCache.clear();',
      'resumeData={items:[],hidden:[]};librariesCache=[];catalogCache.clear();catalogFetchedAt.clear();',
      'user-switch cache isolation')
    return home


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('repository',type=Path,help='Repository checkout containing meta.json and src/.../Web/home.js')
    parser.add_argument('--smoke-base-094',action='store_true',help='Internal: validate on bundled v0.4.94 snapshot without version bump')
    args=parser.parse_args()
    root=args.repository.resolve()
    meta_path=root/'meta.json'
    home_path=root/'src/Jellyfin.Plugin.MisioFlix/Web/home.js'
    tests=root/'tests/current'
    if not(meta_path.is_file() and home_path.is_file() and tests.is_dir()):
        raise SystemExit('Wrong repository directory or missing project components')
    old_meta=json.loads(meta_path.read_text(encoding='utf-8'))
    expected='0.4.94.0' if args.smoke_base_094 else '0.4.99.0'
    if old_meta.get('version')!=expected:
        raise SystemExit(f'Expected base {expected}, found {old_meta.get("version")}. No changes made.')
    old_home=home_path.read_text(encoding='utf-8')
    try: new_home=transform(old_home)
    except RuntimeError as ex: raise SystemExit('ABORTED - source mismatch, nothing changed: '+str(ex))
    if new_home==old_home: raise SystemExit('No changes generated')
    new_meta=dict(old_meta)
    if not args.smoke_base_094:
        new_meta['version']='0.4.100.0'
        new_meta['description']='MisioFlix 0.4.100: szybkie ponowne otwieranie wyszukiwarki i cache katalogu per użytkownik'
    # Apply source only after the complete transformation succeeds. Never touch
    # Jellyfin files, user NFO, media or NAS data.
    home_path.write_text(new_home,encoding='utf-8')
    if not args.smoke_base_094:
        meta_path.write_text(json.dumps(new_meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    tests_source=Path(__file__).resolve().parent/'tests'/'search_catalog_cache_100.cjs'
    tests_dest=tests/'search_catalog_cache_100.cjs'
    tests_dest.write_bytes(tests_source.read_bytes())
    # One legacy regression caps the version at 0.4.99, which is not a
    # functional constraint. Make its version matcher future-safe.
    legacy_version_test=tests/'test_library_collections_0425.py'
    if legacy_version_test.is_file() and not args.smoke_base_094:
        old_test=legacy_version_test.read_text(encoding='utf-8')
        old_regex=r"r'^0\.4\.(?:2[5-9]|[3-9][0-9])\.0$'"
        new_regex=r"r'^0\.4\.[1-9][0-9]*\.0$'"
        if old_regex in old_test:
            legacy_version_test.write_text(old_test.replace(old_regex,new_regex),encoding='utf-8')
    if not args.smoke_base_094:
        source_changelog=Path(__file__).resolve().parent/'CHANGELOG_v0.4.100_SEARCH_CACHE.md'
        (root/source_changelog.name).write_bytes(source_changelog.read_bytes())
    print(f'OK: patch applied to {root} (base {expected}); home.js, meta.json, new cache test, changelog and optional legacy version test.')
    print('Build/version sync: python tools/sync_version.py')
    print('Run tests: python tools/run_tests.py')

if __name__=='__main__': main()
