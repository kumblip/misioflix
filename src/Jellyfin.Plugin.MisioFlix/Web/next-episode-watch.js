/* MisioFlix 0.4.86: Intentional NEXT episode marks the previous episode
 * watched in Jellyfin after the native player confirms the transition.
 * No player replacement, no edits to NFO/MAL, no auto-next interception.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_NEXT_EPISODE_WATCH__) return;
  window.__MISIOFLIX_NEXT_EPISODE_WATCH__ = true;
  let lastSignal = 0;

  function activeApi() {
    return window.ApiClient || window.ConnectionManager?.getApiClient?.() || null;
  }
  function playingVideo() {
    // Only the active native player, not hidden details-page thumbnails.
    const videos = document.querySelectorAll('video');
    return Array.from(videos).some(v => !v.ended && v.readyState >= 1 &&
      (typeof v.getClientRects !== 'function' || v.getClientRects().length > 0));
  }
  function nextButton(node) {
    const button = node?.closest?.('button,[role="button"]');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return false;
    if (button.matches('.btnNextTrack,.btnNextEpisode,.btnNextVideo') ||
        button.closest('.btnNextTrack,.btnNextEpisode,.btnNextVideo')) return true;
    const icon = button.querySelector('.material-icons.skip_next,[data-testid="SkipNextIcon"],[data-testid="SkipNextRoundedIcon"]');
    if (icon) return true;
    const title = [button.getAttribute('aria-label'), button.getAttribute('title')]
      .filter(Boolean).join(' ').trim();
    return /^(następny( odcinek| utwór)?|next( episode| track| video)?|skip to next)$/i.test(title);
  }
  function intent() {
    if (!playingVideo()) return;
    const now = Date.now();
    if (now - lastSignal < 850) return; // no duplicate pointer/key events
    lastSignal = now;
    const api = activeApi();
    const token = typeof api?.accessToken === 'function' ? api.accessToken() : api?.accessToken;
    if (!token || typeof token !== 'string') return;
    const deviceId = typeof api?.deviceId === 'function' ? api.deviceId() : api?.deviceId;
    fetch('/MisioFlix/api/playback/next-episode-intent', {
      method: 'POST', credentials:'same-origin', cache:'no-store', keepalive:true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `MediaBrowser Client="MisioFlix", Device="Jellyfin Web", DeviceId="misioflix-next", Version="0.4.86", Token="${token.replace(/["\r\n]/g, '')}"`
      },
      body: JSON.stringify({deviceId:typeof deviceId === 'string' ? deviceId : null})
    }).then(r=>{if(!r.ok) console.warn('[MisioFlix Next Watch] HTTP',r.status);})
      .catch(e=>console.warn('[MisioFlix Next Watch] Could not record NEXT intent:',e?.message||e));
  }
  document.addEventListener('click', e => { if (nextButton(e.target)) intent(); }, true);
  document.addEventListener('keydown', e => {
    if (e.repeat || e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey ||
        e.target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
    // Jellyfin Web's 'next item' shortcut; do not intercept the original event.
    if ((e.shiftKey && String(e.key).toLowerCase() === 'n') || e.key === 'MediaTrackNext') intent();
  }, true);
})();
