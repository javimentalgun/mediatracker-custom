// The "Lo estoy viendo / leyendo / escuchando / jugando" button (the green
// Progreso button that opens the Rp modal) branches its label on
// Io(movie) / Do(book) / jo(audiobook) / Ao(game). For mediaType='theater'
// none of those match, so the wrapper div renders without a label
// (an empty 34×6 px ghost button).
//
// We're now the primary "in progress" UX (the duplicate _AIP button was
// removed from the grid), so theater MUST get a label here. Add a Tt(a)
// branch using "I am watching it" — fits a play just like a movie.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: theater-iam-watching-label */';
if (c.includes(marker)) {
  console.log('theater-iam-watching-label: already patched');
  process.exit(0);
}

const old = 'Io(a)&&r.createElement(Xe,{id:"I am watching it"}),Do(a)&&r.createElement(Xe,{id:"I am reading it"})';
const _new = 'Io(a)&&r.createElement(Xe,{id:"I am watching it"}),Tt(a)&&r.createElement(Xe,{id:"I am watching it"}),Do(a)&&r.createElement(Xe,{id:"I am reading it"})';

if (!c.includes(old)) {
  console.error('theater-iam-watching-label: anchor not found in bundle');
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

console.log('theater-iam-watching-label: added Tt(a) "I am watching it" branch');
