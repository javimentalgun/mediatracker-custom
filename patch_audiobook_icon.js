const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// In the non-TV seen check, show music_note for audiobooks instead of check_circle_outline
const old = 's.showUnwatchedEpisodesCount&&1==t.seen&&r.createElement("div",{className:"absolute inline-flex pointer-events-auto foo right-1 top-1"},r.createElement(Fv,null,r.createElement("i",{className:"flex text-white select-none material-icons"},"check_circle_outline")))';

const patched = 's.showUnwatchedEpisodesCount&&1==t.seen&&r.createElement("div",{className:"absolute inline-flex pointer-events-auto foo right-1 top-1"},r.createElement(Fv,null,r.createElement("i",{className:"flex text-white select-none material-icons"},"audiobook"===t.mediaType?"music_note":"check_circle_outline")))';

if (c.includes(patched)) { console.log('audiobook_icon: already patched'); process.exit(0); }
if (!c.includes(old)) { console.error('audiobook_icon: anchor not found'); process.exit(1); }

c = c.replace(old, patched);
fs.writeFileSync(bundlePath, c);
console.log('audiobook_icon: music_note for listened audiobooks OK');
