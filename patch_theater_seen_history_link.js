// Bug: the "Seen history" / "Read history" / etc. link on the detail page
// branches on Io(movie)/Ro(tv)/Do(book)/jo(audiobook)/Ao(game) but never on
// theater. For theater items, the link renders as an empty <a> with no label
// (the user just sees nothing where the history link should be). Add a Tt(a)
// branch using the "Seen history" label.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: theater-seen-history-link */';
if (c.includes(marker)) {
  console.log('theater-seen-history-link: already patched');
  process.exit(0);
}

const old = '(Io(a)||Ro(a))&&r.createElement(Xe,{id:"Seen history"}),Ao(a)&&r.createElement(Xe,{id:"Played history"})';
const _new = '(Io(a)||Ro(a)||Tt(a))&&r.createElement(Xe,{id:"Seen history"}),Ao(a)&&r.createElement(Xe,{id:"Played history"})';

if (!c.includes(old)) {
  console.error('theater-seen-history-link: anchor not found in bundle');
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

console.log('theater-seen-history-link: added Tt(a) branch to "Seen history" link');
