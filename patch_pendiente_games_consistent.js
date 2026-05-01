const fs = require('fs');
const child = require('child_process');

// On the /in-progress (Pendiente) page, the games section was rendering
// _GamesSection (a special component with three sub-dropdowns: On list /
// Played / Seen). The other media-type sections all use the simpler _Section
// with `onlyWithProgress`. Make games match: replace the _GamesSection usage
// with a single _Section showing only what the user is currently playing.
//
// The other usage of _GamesSection (Watchlist page) is left alone —
// only the Pendiente page is being normalized.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:pendiente-games-consistent*/';
if (c.includes(marker)) {
  console.log('pendiente games consistent: already patched');
  process.exit(0);
}

// Anchor: the Pendiente page builds Movies → TV → _GamesSection → Books, where TV
// uses onlyWithProgress (Watchlist uses onlyOnWatchlist, so this is unique).
const oldFrag = 'args:{mediaType:"tv",onlyWithProgress:!0}}),r.createElement(_GamesSection,null),';
const newFrag = 'args:{mediaType:"tv",onlyWithProgress:!0}}),r.createElement(_Section,{label:xo._("Games"),args:{mediaType:"video_game",onlyWithProgress:!0}}),';

if (!c.includes(oldFrag)) {
  console.error('pendiente games consistent: anchor not found (Pendiente page TV→Games sequence changed?)');
  process.exit(1);
}

c = marker + c.replace(oldFrag, newFrag);
fs.writeFileSync(bundlePath, c);
console.log('pendiente games consistent: replaced _GamesSection with single onlyWithProgress section');
