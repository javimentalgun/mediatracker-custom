// The `ug` component (green "Progreso" button used by movies/tv/games/
// theater on the detail page) only renders the button — no progress
// percentage is shown below it. The book/audiobook variant DOES show
// "Progreso: X%" below each green button. Add the same text below ug so
// movies/games/theater get a consistent layout (green button + progress
// text below).
//
// Visually this becomes: <green Progreso btn> + <small "Progreso: X%" below>.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: ug-progress-text */';
if (c.includes(marker)) {
  console.log('ug-progress-text: already patched');
  process.exit(0);
}

// Wrap the ug return in a fragment with the original button + a percentage line.
const old = 'ug=function(e){var t=e.mediaItem;return r.createElement(mo,{openModal:function(e){return r.createElement("div",{className:"text-sm text-green-500 btn",onClick:function(){return e()}},"Progreso")}},(function(e){return r.createElement(Rp,{mediaItem:t,closeModal:e})}))}';
const _new = 'ug=function(e){var t=e.mediaItem;' +
  'var _pct=Math.round(100*(t.progress||t.audioProgress||0));' +
  'return r.createElement(r.Fragment,null,' +
    'r.createElement(mo,{openModal:function(e){' +
      'return r.createElement("div",{className:"text-sm text-green-500 btn",onClick:function(){return e()}},"Progreso")' +
    '}},(function(e){return r.createElement(Rp,{mediaItem:t,closeModal:e})})),' +
    'r.createElement("div",{className:"text-xs mt-1"},"Progreso: ",_pct,"%")' +
  ')}';

if (!c.includes(old)) {
  console.error('ug-progress-text: ug anchor not found');
  process.exit(1);
}
c = c.replace(old, _new);
c = marker + c;
fs.writeFileSync(bundlePath, c);

const path = require('path');
for (const ext of ['.br', '.gz']) {
  const p = bundlePath + ext;
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
    catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
  }
}

console.log('ug-progress-text: added "Progreso: X%" line below the green button for movies/games/theater');
