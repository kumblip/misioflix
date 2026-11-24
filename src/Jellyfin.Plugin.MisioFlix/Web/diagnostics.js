/* MisioFlix 0.4.141.0 candidate: local diagnostics core, no automatic instrumentation. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MisioFlixDiagnostics = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const operations = Object.freeze(['catalog', 'recommendations', 'carouselRender', 'filterChange', 'playHandoff', 'recommendationCards']);
  function createDiagnostics({ enabled = false, capacity = 256, clock = () => performance.now() } = {}) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 4096) throw new RangeError('capacity');
    const bins = new Map();
    let active = Boolean(enabled), generation = 0, hits = 0, misses = 0, apiErrors = 0;
    function reset() { generation++; bins.clear(); hits = misses = apiErrors = 0; }
    function setEnabled(value) { const next = Boolean(value); if (next !== active) { reset(); active = next; } }
    function record(operation, duration, cache = 'unknown') {
      if (!active || !operations.includes(operation) || !['cold','warm','unknown'].includes(cache) || !Number.isFinite(duration) || duration < 0) return;
      const key = operation + ':' + cache;
      let bin = bins.get(key);
      if (!bin) { bin = { values: [], cursor: 0, count: 0 }; bins.set(key, bin); }
      if (bin.values.length < capacity) bin.values.push(duration);
      else { bin.values[bin.cursor] = duration; bin.cursor = (bin.cursor + 1) % capacity; }
      bin.count++;
    }
    function start(operation, cache = 'unknown') {
      if (!active || !operations.includes(operation)) return () => {};
      const started = clock(), current = generation;
      let ended = false;
      return () => { if (ended) return; ended = true; if (current === generation && active) record(operation, clock() - started, cache); };
    }
    function cacheResult(hit) { if (!active) return; if (hit === true) hits++; else if (hit === false) misses++; }
    function apiError() { if (active) apiErrors++; }
    function snapshot() {
      const metrics = [];
      for (const operation of operations) for (const cache of ['cold','warm','unknown']) {
        const bin = bins.get(operation + ':' + cache); if (!bin) continue;
        const sorted = [...bin.values].sort((a,b) => a-b), n = sorted.length;
        metrics.push({ operation, cache, totalCount: bin.count, sampleCount: n,
          meanMs: sorted.reduce((a,b) => a+b, 0)/n, maxMs: sorted[n-1], p95Ms: sorted[Math.ceil(n*0.95)-1] });
      }
      return { schemaVersion: 1, enabled: active, sampleCapacityPerMetric: capacity, metrics,
        cache: { hits, misses, hitRate: hits+misses ? hits/(hits+misses) : null }, apiErrors };
    }
    return Object.freeze({ setEnabled, reset, start, record, cacheResult, apiError, snapshot, exportJson: () => JSON.stringify(snapshot(), null, 2) });
  }
  return Object.freeze({ createDiagnostics });
});

// Browser-only session: opt-in on the admin page, never persisted or sent.
if (typeof window !== 'undefined' && window.MisioFlixDiagnostics && !window.MisioFlixDiagnosticSession) {
  (() => {
    const d = window.MisioFlixDiagnostics.createDiagnostics();
    let owner = '';
    function scope() {
      try {
        const api = window.ApiClient || window.ConnectionManager?.getApiClient?.();
        const uid = api?.getCurrentUserId?.();
        const sid = typeof api?.serverId === 'function' ? api.serverId() : api?.serverId;
        const token = typeof api?.accessToken === 'function' ? api.accessToken() : api?.accessToken;
        return uid && sid && token ? JSON.stringify([sid, uid]) : '';
      } catch { return ''; }
    }
    function guard() { if (owner && owner !== scope()) { d.setEnabled(false); owner = ''; } }
    window.MisioFlixDiagnosticSession = Object.freeze({
      setEnabled(value) { guard(); owner = value ? scope() : ''; d.setEnabled(Boolean(owner)); },
      reset() { guard(); d.reset(); },
      snapshot() { guard(); return d.snapshot(); },
      isEnabled() { guard(); return Boolean(owner); },
      start(operation, cache) { guard(); const end = d.start(operation, cache); return () => { guard(); end(); }; },
      cacheResult(hit) { guard(); d.cacheResult(hit); },
      apiError() { guard(); d.apiError(); }
    });
    window.addEventListener('hashchange', guard);
  })();
}
