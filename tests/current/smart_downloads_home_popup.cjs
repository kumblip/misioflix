'use strict';
// Regression test: MisioFlix Home no longer renders Smart Downloads UI.
// MisioCache remains independent; these tests must not access or modify it.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const home = fs.readFileSync('src/Jellyfin.Plugin.MisioFlix/Web/home.js', 'utf8');
const css = fs.readFileSync('src/Jellyfin.Plugin.MisioFlix/Web/theme.css', 'utf8');

for (const [name, content] of [['home.js', home], ['theme.css', css]]) {
  assert(!/Smart Downloads|smartDownloads|mf-smart-downloads|mf-home-smart-downloads-button|MisioCacheSmartDownloads/i.test(content),
    `${name}: unexpected Smart Downloads UI remnants`);
}
assert(home.includes("'Wyszukiwarka anime'"));
assert(home.includes("'Wyszukiwarka filmów i seriali'"));
assert(css.includes('.mf-home-mal-button{order:2}'));
assert(css.includes('.mf-home-simkl-button{order:3}'));
assert(css.includes('.mf-home-folder-buttons::before{'));
assert(css.includes("background:url('/MisioFlix/assets/logo.png')"));
console.log('PASS no Smart Downloads button/popup; MAL, Simkl, searches, mobile logo retained');
