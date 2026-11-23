/* v0.4.138: Home filter visual states stay consistent without touching JS logic. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const postcss=require('postcss');
const root=path.resolve(__dirname,'../..');
const css=postcss.parse(fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/theme.css'),'utf8'));
const home=fs.readFileSync(path.join(root,'src/Jellyfin.Plugin.MisioFlix/Web/home.js'),'utf8');

const stateColors=[
  [".mf-home-content-mode-toggle[data-mf-home-mode=\"recommendations\"]",'green'],
  [".mf-home-anime-toggle[aria-checked=\"true\"]",'green'],
  [".mf-home-audio-toggle[data-mf-audio-mode=\"pl\"]",'green'],
  [".mf-home-subtitles-toggle[data-mf-subtitles-mode=\"all\"]",'green'],
  [".mf-home-content-mode-toggle[data-mf-home-mode=\"libraries\"]",'blue'],
  [".mf-home-anime-toggle[aria-checked=\"false\"]",'blue'],
  [".mf-home-audio-toggle[data-mf-audio-mode=\"original\"]",'blue'],
  [".mf-home-subtitles-toggle[data-mf-subtitles-mode=\"pl\"]",'blue'],
  [".mf-home-audio-toggle[data-mf-audio-mode=\"all\"]",'orange'],
  [".mf-home-subtitles-toggle[data-mf-subtitles-mode=\"en\"]",'orange'],
];
const palettes={
  green:{'--mf-home-switch-border':'#45b879','--mf-home-switch-track':'#45b879'},
  blue:{'--mf-home-switch-border':'#56b6ef','--mf-home-switch-track':'#329bdb'},
  orange:{'--mf-home-switch-border':'#f0a14a','--mf-home-switch-track':'#dc9335'},
};
const declarations=rule=>Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(d=>[d.prop,d.value]));
function lastRule(selector,within){
  let found=null;
  css.walkRules(rule=>{
    if(!rule.selectors.includes(selector))return;
    const media=rule.parent.type==='atrule' && rule.parent.name==='media' ? rule.parent.params : '';
    if(media!==(within||''))return;
    found=rule;
  });
  assert.ok(found,`missing rule ${selector} in media ${within||'root'}`);
  return declarations(found);
}
for(const [state,palette] of stateColors){
  const declarationsForState=lastRule('html.misioflix-skin '+state);
  for(const [prop,value] of Object.entries(palettes[palette]))
    assert.equal(declarationsForState[prop],value,`${state} must be ${palette}`);
}
const shared=lastRule('html.misioflix-skin .mf-home-switches .mf-home-libraries-toggle');
assert.equal(shared.background,'var(--mf-home-switch-bg)');
assert.equal(shared['border-color'],'var(--mf-home-switch-border)');
assert.equal(shared.color,'var(--mf-home-switch-ink)');
const track=lastRule('html.misioflix-skin .mf-home-switches .mf-home-libraries-toggle .mf-home-libraries-track');
assert.equal(track.background,'var(--mf-home-switch-track)');
assert.equal(track['border-color'],'var(--mf-home-switch-track)');
assert.equal(lastRule('html.misioflix-skin .mf-home-switches')['justify-content'],'safe flex-end');
assert.equal(lastRule('html.misioflix-skin .mf-home-switches','(max-width:880px)')['justify-content'],'flex-start');
const knob=(state,media='')=>lastRule('html.misioflix-skin .mf-home-switches .mf-home-subtitles-toggle[data-mf-subtitles-mode="'+state+'"] .mf-home-libraries-track::after',media);
assert.equal(knob('all').transform,'translateX(28px)');
assert.equal(knob('en').transform,'translateX(0)');
assert.equal(knob('all','(max-width:560px)').transform,'translateX(26px)');
assert.match(home,/let recommendationIncludeAnime = true/);
assert.match(home,/let recommendationAudioMode = 'pl'/);
assert.match(home,/let recommendationSubtitlesMode = 'all'/);
assert.match(home,/recommendationIncludeAnime=true; \/\/ ON by default/);
assert.match(home,/recommendationAudioMode='pl'; \/\/ First mode/);
assert.match(home,/recommendationSubtitlesMode='all'; \/\/ Subtitles/);
console.log('PASS v0.4.138: default green/right, alternatives blue, third states orange, desktop right/mobile safe');
