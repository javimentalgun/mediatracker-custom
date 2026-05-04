// Insert an "IGDB token configurable in Application tokens" hint inline in the
// section-page header (Zv component) — between the "{N} items" count and the
// filter/sort dropdowns — but only when c.mediaType === "video_game" so it
// shows up on /games and not on Movies/Tv/Books/Theater.
//
// Anchor is the boundary between the items-count <div> and the `m && !w && …`
// Fragment that wraps the two dropdowns (N = Todo/filter, T = sort). We insert
// a guarded element right before that boundary so the hint renders inline
// inside the same `flex` row, hugging the count text on the left.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: games-igdb-hint */';
if (c.includes(marker)) {
  console.log('games igdb hint: already patched');
  process.exit(0);
}

const anchor = '})),m&&!w&&r.createElement(r.Fragment,null,r.createElement("div",{className:"flex ml-auto"},r.createElement(N,null))';
if (!c.includes(anchor)) {
  console.error('games igdb hint: anchor not found (Zv header layout changed?)');
  process.exit(1);
}

const hint =
  ',c.mediaType==="video_game"&&r.createElement("span",{className:"ml-3 text-xs italic text-gray-500 dark:text-gray-400 self-center"},' +
    'xo._("IGDB time configurable in "),' +
    'r.createElement("a",{href:"#/settings/application-tokens",className:"underline text-blue-600 dark:text-blue-400 not-italic"},xo._("Application tokens"))' +
  ')';

c = c.replace(anchor, '})),' + hint.slice(1) + ',m&&!w&&r.createElement(r.Fragment,null,r.createElement("div",{className:"flex ml-auto"},r.createElement(N,null))');

c = marker + c;
fs.writeFileSync(bundlePath, c);

// Invalidate compressed variants so the static server stops serving stale gzip/br.
const path = require('path');
for (const ext of ['.br', '.gz']) {
  const p = bundlePath + ext;
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
    catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
  }
}

console.log('games igdb hint: inserted hint between items count and filter dropdown');
