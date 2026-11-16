/* MisioFlix v0.4.87 — Jellyfin Web player toolbar Back -> current episode.
 * Only intercepts the native ArrowBackIcon while a visible video is playing.
 * Resolve the CURRENT episode from the authenticated server playback events;
 * NEVER use browser history or the previously opened detail URL.
 * Navigating away triggers Jellyfin's own viewbeforehide playback stop/report.
 * A delayed real reload then refreshes watched/progress metadata.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_PLAYER_BACK_087__) return;
  window.__MISIOFLIX_PLAYER_BACK_087__ = true;

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
    return `MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-player-back", Version="0.4.87", Token="${token.replace(/["\r\n]/g, '')}"`;
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

  function detailRoute(episodeId) {
    const currentApi = api();
    const serverId = typeof currentApi?.serverId === 'function' ? currentApi.serverId() : currentApi?.serverId;
    const sid = compact(serverId);
    return '#/details?id=' + encodeURIComponent(episodeId) +
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

  async function navigateToCurrentEpisode(button) {
    try {
      const episodeId = await currentEpisode();
      if (!episodeId || !activeVideo()) { nativeFallback(button); return; }
      const route = detailRoute(episodeId);
      window.location.hash = route; // Jellyfin's viewbeforehide stops/reports playback.
      try { window.scrollTo(0, 0); } catch { /* embedded WebView */ }
      // Do not reload immediately: the native player must report PlaybackStopped
      // first. Full reload avoids stale details/Continue Watching in the SPA.
      window.setTimeout(() => {
        // Native onPlaybackStopped can itself call appRouter.back(). Enforce the
        // requested episode even when that callback briefly changed the hash.
        if (window.location.hash !== route) window.location.hash = route;
        window.location.reload();
      }, 950);
    } catch (error) {
      console.warn('[MisioFlix Player Back] Unable to resolve current episode:', error?.message || error);
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
    void navigateToCurrentEpisode(button);
  }, true);
})();
