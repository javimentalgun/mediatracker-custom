const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

// Add audioProgress + links to mapRawResult so cards can read them.
// (lastSeenAt is already mapped natively by upstream — see line ~394 of
// items.js: `lastSeenAt: row['lastSeenAt']` — so it's available on cards
// without us needing to add it.)
const old = "downloaded: Boolean(row['mediaItem.downloaded']),";
const fresh = "downloaded: Boolean(row['mediaItem.downloaded']),\n    audioProgress: row['mediaItem.audioProgress'],\n    links: row['mediaItem.links'],";

if (c.includes("audioProgress: row['mediaItem.audioProgress']")) {
  console.log('audio-progress in items: already mapped');
  process.exit(0);
}
if (!c.includes(old)) {
  const idx = c.indexOf("downloaded:");
  console.error('audio-progress in items: anchor not found. Found "downloaded:" at idx=' + idx);
  if (idx > -1) console.error('Context: ' + JSON.stringify(c.slice(idx, idx+80)));
  process.exit(1);
}
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('audio-progress in items: added audioProgress + links to mapRawResult');
