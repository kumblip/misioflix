/* MisioFlix 0.4.8 — skin existing Jellyfin Web, never create second application.
 * Zero requests to Jellyfin/MAL, zero extra posters, zero navigation interception.
 * Only DOM annotations so CSS can style the actual native sections and cards.
 */
(() => {
  'use strict';
  if (window.__MISIOFLIX_SKIN_V048__) return;
  window.__MISIOFLIX_SKIN_V048__ = true;

  const CARD = '.card, .MuiCard-root, [data-testid="item-card"], [data-testid="media-card"]';
  const ART = '.cardImageContainer, .cardContent.cardImageContainer, .MuiCardMedia-root, img';
  const PLAYED = '.playedIndicator, .playedIndicatorIcon, [data-testid="played-indicator"], [aria-label="Played"], [aria-label="Obejrzane"]';
  const PROGRESS = '.itemProgressBarForeground, .resumeProgress, .resumeProgressBar, .playbackProgress, [data-testid="progress-indicator"]';
  const UNWATCHED = '[data-testid="unplayed-indicator"]';
  const HEADING = 'h1, h2, h3, h4, .sectionTitle, .sectionTitleTextButton, .MuiTypography-h4, .MuiTypography-h5';
  const KEYS = [
    ['resume', /\b(kontynuuj odtwarzanie|oglądaj dalej|continue watching|resume)\b/i],
    ['libraries', /\b(moje multimedia|my media|moje biblioteki|my libraries)\b/i],
    ['latest', /\b(ostatnio dodane|niedawno dodane|recently added|latest media)\b/i]
  ];
  // A section is a CONTAINER ALREADY RENDERED BY JELLYFIN; no DOM created.
  function findSection(node) {
    let p = node.parentElement;
    let fallback = null;
    for (let steps = 0; p && steps < 5; steps++, p = p.parentElement) {
      if (p === document.body || p === document.documentElement) break;
      if (!fallback && p.parentElement) fallback = p;
      if (p.matches && p.matches('section, .verticalSection, .homeSection, [data-testid="home-section"]')) return p;
      const count = p.querySelectorAll(CARD).length;
      if (count >= 1 && count <= 70 && p.querySelectorAll(HEADING).length <= 3) return p;
      const buttons = p.querySelectorAll('a,button,[role="button"]').length;
      if (buttons >= 2 && buttons <= 25 && steps >= 1 && p.querySelectorAll(HEADING).length <= 3) return p;
    }
    return fallback;
  }
  function decorateSections() {
    // Scan headings already rendered on the current document; Modern may keep a
    // hidden Legacy home root mounted, so selecting the first .homePage is unsafe.
    const root = document.body;
    // Restrict to a small number of nearby headings — never scan metadata or whole library.
    for (const head of [...root.querySelectorAll(HEADING)].slice(0, 75)) {
      const title = (head.textContent || '').trim();
      if (!title || title.length > 120) continue;
      let kind = '';
      for (const [id, re] of KEYS) if (re.test(title)) {kind = id;break;}
      if (!kind) continue;
      const section = findSection(head);
      if (!section || section === document.body || !section.setAttribute) continue;
      section.classList.add('mf-section');
      section.setAttribute('data-mf-section',kind);
      if (kind === 'libraries') {
        for (const item of [...section.querySelectorAll('.card,.MuiCard-root,.MuiButton-root,button')].slice(0, 35)) {
          if (!item.closest('.skinHeader,.MuiAppBar-root')) item.setAttribute('data-mf-library-tile','1');
        }
      }
    }
  }
  function inferState(card) {
    const p = card.querySelector(PROGRESS);
    // Resume in progress has priority over a separate 'played' overlay in some Jellyfin layouts.
    if (p && !p.matches?.('[aria-valuenow="0"]')) return 'started';
    if (card.querySelector(PLAYED) || card.matches('[data-played="true"]')) return 'watched';
    if (card.querySelector(UNWATCHED) || card.matches('[data-played="false"]')) return 'unwatched';
    return '';
  }
  function decorateCards() {
    for (const card of document.body.querySelectorAll(CARD)) {
      if (card.closest('.dialog,#dashboardPage,[role="dialog"]')) continue;
      if (!card.querySelector(ART)) continue;
      if (card.getAttribute('data-mf-card') !== '1') card.setAttribute('data-mf-card','1');
      const status = inferState(card);
      if (status && card.getAttribute('data-mf-watch') !== status) card.setAttribute('data-mf-watch',status);
      if (!status && card.hasAttribute('data-mf-watch')) card.removeAttribute('data-mf-watch');
    }
  }
  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    window.setTimeout(() => { pending = false; decorateCards(); decorateSections(); }, 240);
  }
  function start() {
    document.documentElement.classList.add('misioflix-skin');
    // Old legacy portal artifacts can survive SPA navigation until full reload.
    document.querySelector('#mf-portal')?.remove();
    document.querySelector('#mf-launch')?.remove();
    schedule();
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
    window.addEventListener('pageshow',schedule);
    window.addEventListener('popstate',schedule);
    window.addEventListener('hashchange',schedule);
    document.addEventListener('viewshow',schedule);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
