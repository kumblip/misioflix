/* MisioFlix v0.4.88 — Jellyfin Web player toolbar Back -> current season.
 * Only intercepts the native ArrowBackIcon while a visible video is playing.
 * Resolve the CURRENT episode from the authenticated server playback events,
 * and its parent season from the authenticated Jellyfin user-items endpoint.
 * NEVER use browser history or the previously opened detail URL.
 * One direct route transition to the season; no appRouter.back(),
 * no second redirect and no full-page reload. The native player lifecycle
 * is responsible for reporting PlaybackStopped as its view is torn down.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_PLAYER_BACK_088__) return;
  window.__MISIOFLIX_PLAYER_BACK_088__ = true;

  const ID = /^[a-f\d]{32}$/i;
  let busy = false;
  let replayNative = false;

  const api = () => window.ApiClient || window.ConnectionManager?.getApiClient?.();
  const compact = value => String(value || '').replace(/-/g, '').toLowerCase();

  function activeVideo() {
    return Array.from(document.querySelectorAll('video')).some(video =>
      !video.ended && (video.readyState >= 1 || /^#\/(video|playback|player)([?/]|$)/i.test(window.location.hash)) &&
      (!video.getClientRects || video.getClientRects().length > 0) &&
      !video.closest?.('.hide,[hidden]'));
  }

  function playerBackButton(target) {
    const button = target?.closest?.('button[aria-label],button[title]');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return null;
    const label = button.getAttribute('aria-label') || button.getAttribute('title') || '';
    // Narrow to the native React toolbar's back button (not MisioFlix details).
    if (!/^(wstecz|back)$/i.test(label.trim())) return null;
    if (!button.querySelector('svg[data-testid="ArrowBackIcon"]')) return null;
    return button;
  }

  function authHeader(currentApi) {
    const token = typeof currentApi?.accessToken === 'function' ? currentApi.accessToken() : currentApi?.accessToken;
    if (typeof token !== 'string' || !token) return null;
    return `MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-player-back", Version="0.4.89", Token="${token.replace(/["\r\n]/g, '')}"`;
  }

  async function currentEpisode() {
    const currentApi = api();
    const auth = authHeader(currentApi);
    if (!auth) return null;
    const deviceId = typeof currentApi?.deviceId === 'function' ? currentApi.deviceId() : currentApi?.deviceId;
    const query = typeof deviceId === 'string' && deviceId.trim() ?
      '?deviceId=' + encodeURIComponent(deviceId.trim()) : '';
    const response = await fetch('/MisioFlix/api/playback/current-episode' + query, {
      method: 'GET', headers: {Authorization:auth}, credentials:'same-origin', cache:'no-store'
    });
    if (!response.ok || response.status === 204) return null;
    const item = await response.json();
    const id = compact(item?.itemId);
    return item?.type === 'Episode' && ID.test(id) ? id : null;
  }

  // Read the parent from Jellyfin itself. In particular, an episode reached
  // through Next in the player may be in a DIFFERENT season from the episode
  // whose details were open when playback began.
  async function seasonOfCurrentEpisode(episodeId) {
    const currentApi = api();
    const userId = compact(currentApi?.getCurrentUserId?.());
    if (!ID.test(userId) || typeof currentApi?.getJSON !== 'function' ||
        typeof currentApi?.getUrl !== 'function') return null;
    const path = 'Users/' + encodeURIComponent(userId) + '/Items/' + encodeURIComponent(episodeId);
    const item = await currentApi.getJSON(currentApi.getUrl(path));
    if (compact(item?.Id) !== episodeId || String(item?.Type || '').toLowerCase() !== 'episode') return null;
    const seasonId = compact(item?.SeasonId || item?.ParentId);
    return ID.test(seasonId) ? seasonId : null;
  }

  function detailRoute(itemId) {
    const currentApi = api();
    const serverId = typeof currentApi?.serverId === 'function' ? currentApi.serverId() : currentApi?.serverId;
    const sid = compact(serverId);
    return '#/details?id=' + encodeURIComponent(itemId) +
      (ID.test(sid) ? '&serverId=' + encodeURIComponent(sid) : '');
  }

  function nativeFallback(button) {
    // When the playback event has not arrived, preserve Jellyfin's own Back;
    // never open an unrelated episode just because it was visited earlier.
    try {
      if (button?.isConnected !== false) {
        replayNative = true;
        button.click();
      }
    } finally {
      replayNative = false;
      busy = false;
    }
  }

  async function navigateToCurrentSeason(button) {
    try {
      const episodeId = await currentEpisode();
      if (!episodeId || !activeVideo()) { nativeFallback(button); return; }
      const seasonId = await seasonOfCurrentEpisode(episodeId);
      if (!seasonId || !activeVideo()) { nativeFallback(button); return; }
      const route = detailRoute(seasonId);
      // The button does not have an href: React owns its original onClick.
      // Capture the click and replace that ACTION with exactly one destination.
      // Do not invoke the native Back handler, change to an episode first,
      // or try to repair a later navigation with setTimeout/reload.
      window.location.hash = route;
      try { window.scrollTo(0, 0); } catch { /* embedded WebView */ }
      console.info('[MisioFlix Player Back] Przejście bezpośrednio do sezonu', seasonId);

    } catch (error) {
      console.warn('[MisioFlix Player Back] Unable to resolve current season:', error?.message || error);
      nativeFallback(button);
    } finally {
      busy = false;
    }
  }

  document.addEventListener('click', event => {
    if (replayNative) return;
    const button = playerBackButton(event.target);
    if (!button || !activeVideo()) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    if (busy) return;
    busy = true;
    void navigateToCurrentSeason(button);
  }, true);
})();
