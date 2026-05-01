const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Position seen icon: audiobooks → centered horizontally at the top of cover; others → top-right
const old = '"absolute inline-flex pointer-events-auto foo right-1 top-1"';
const fresh = '"absolute inline-flex pointer-events-auto foo top-1 "+("audiobook"===t.mediaType?"left-1/2 -translate-x-1/2":"right-1")';

if (!c.includes(old)) {
  console.log('audiobook position: anchor not found (may already be patched)');
} else {
  c = c.replace(old, fresh);
  console.log('audiobook position: music_note for audiobooks now in top-left, check for others stays top-right');
}

fs.writeFileSync(bundlePath, c);
