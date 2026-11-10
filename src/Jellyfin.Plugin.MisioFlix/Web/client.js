/* MisioFlix v0.4.7 — non-invasive enhancement of existing Jellyfin Web elements.
 * This script deliberately DOES NOT create a home page, section, route, card,
 * media list or second navigation bar. Jellyfin remains the sole UI/data owner.
 * No catalogue/metadata API calls, no playback interception, no remote assets.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_SKIN_V047__) return;
  window.__MISIOFLIX_SKIN_V047__ = true;

  const CARD_QUERY = '.card, .MuiCard-root, [data-testid="item-card"], [data-testid="media-card"]';
  const IMAGE_QUERY = '.cardImageContainer, .cardContent.cardImageContainer, .MuiCardMedia-root, img';
  const WATCHED_QUERY = '.playedIndicator, .playedIndicatorIcon, [data-testid="played-indicator"], [aria-label="Played"], [aria-label="Obejrzane"]';
  const PROGRESS_QUERY = '.itemProgressBarForeground, .resumeProgress, .resumeProgressBar, .playbackProgress, [data-testid="progress-indicator"]';
  const EXPLICIT_UNWATCHED_QUERY = '.unplayedIndicator, [data-testid="unplayed-indicator"]';

  function inferWatchState(card) {
    // These are Jellyfin's OWN indicators. If the current layout exposes none,
    // do not guess a status and do not show a misleading colour.
    if (card.querySelector(WATCHED_QUERY) || card.matches('[data-played="true"]')) return 'watched';
    if (card.querySelector(PROGRESS_QUERY) || card.matches('[data-in-progress="true"]')) return 'started';
    if (card.querySelector(EXPLICIT_UNWATCHED_QUERY) || card.matches('[data-played="false"]')) return 'unwatched';
    return '';
  }

  function decorate() {
    const root = document.body;
    if (!root) return;
    for (const card of root.querySelectorAll(CARD_QUERY)) {
      if (card.closest('.dialog, #dashboardPage, [role="dialog"]')) continue;
      if (!card.querySelector(IMAGE_QUERY)) continue;
      // No new cards, no cloned poster art, no event listeners on media links.
      if (!card.hasAttribute('data-mf-card')) card.setAttribute('data-mf-card', '1');
      const status = inferWatchState(card);
      if (status) {
        if (card.getAttribute('data-mf-watch') !== status) card.setAttribute('data-mf-watch', status);
      } else if (card.hasAttribute('data-mf-watch')) {
        card.removeAttribute('data-mf-watch');
      }
    }
  }

  let scheduled = false;
  function queueDecoration() {
    if (scheduled) return;
    scheduled = true;
    // Avoid scanning the DOM for every small React/Legacy client mutation.
    window.setTimeout(() => { scheduled = false; decorate(); }, 180);
  }

  function start() {
    document.documentElement.classList.add('misioflix-skin');
    // Clean up fragments left in the DOM only if an older injected script
    // is still running in this very page; full refresh is still recommended.
    document.querySelector('#mf-portal')?.remove();
    document.querySelector('#mf-launch')?.remove();
    for (const host of document.querySelectorAll('.mf-hosted')) host.classList.remove('mf-hosted');
    queueDecoration();
    // Child additions represent Jellyfin rendering a new home/library/detail page.
    // We do not observe our own data-* attribute writes (no feedback loop).
    const observer = new MutationObserver(queueDecoration);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('pageshow', queueDecoration);
    window.addEventListener('popstate', queueDecoration);
    window.addEventListener('hashchange', queueDecoration);
    document.addEventListener('viewshow', queueDecoration);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
