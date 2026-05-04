// Update <title> in index.html: "Media Tracker" → "MediaTOC".
// Idempotent: only rewrites if the upstream title is still present.

const fs = require('fs');
const path = '/app/public/index.html';
let c = fs.readFileSync(path, 'utf8');

const old = '<title>Media Tracker</title>';
const fresh = '<title>MediaTOC</title>';

if (c.includes(fresh)) {
  console.log('index.html title: already MediaTOC');
  process.exit(0);
}
if (!c.includes(old)) {
  console.log('index.html title: anchor not found (upstream changed?), skipping');
  process.exit(0);
}
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('index.html title: rewritten to MediaTOC');
