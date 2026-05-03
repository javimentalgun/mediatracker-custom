// Frontend bug: the "Add to seen history" big button (rendered as a btn-blue
// label inside the action panel below each card) checks the mediaType against
// audiobook/book/video_game/movie/tv but NOT theater. As a result, on theater
// cards only the small rating star and download toggle are shown — the big
// "Marcar como visto" button is missing entirely. Add a Tt(n) (theater) branch
// so theater items use the same "Add to seen history" label as movies.

const fs = require('fs');
const path = require('path');
const dir = '/app/public';

// Find the actual hashed bundle file: main_*.js (not .br/.gz/.LICENSE.txt)
const bundle = fs.readdirSync(dir)
  .filter(f => /^main_[0-9a-f_]+\.js$/.test(f) && !f.endsWith('.LICENSE.txt'))[0];
if (!bundle) {
  console.error('theater seen button: bundle main_*.js not found in /app/public');
  process.exit(1);
}
const bundlePath = path.join(dir, bundle);
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: theater-seen-button */';
if (c.includes(marker)) {
  console.log('theater seen button: already patched (' + bundle + ')');
  process.exit(0);
}

const old = 'Io(n)&&r.createElement(Xe,{id:"Add to seen history"}),Ro(n)&&';
const _new = 'Io(n)&&r.createElement(Xe,{id:"Add to seen history"}),Tt(n)&&r.createElement(Xe,{id:"Add to seen history"}),Ro(n)&&';

if (!c.includes(old)) {
  console.error('theater seen button: anchor not found in ' + bundle + ' (bundle layout changed?)');
  process.exit(1);
}
c = c.replace(old, _new);
c = marker + c;
fs.writeFileSync(bundlePath, c);

// Invalidate compressed variants so the server stops serving the old gzip/br
// versions instead of our patched bytes.
for (const ext of ['.br', '.gz']) {
  const p = bundlePath + ext;
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
    catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
  }
}

console.log('theater seen button: added Tt(n) branch to "Add to seen history" render in ' + bundle);
