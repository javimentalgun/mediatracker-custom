const fs = require('fs');
const path = '/app/build/entity/mediaItem.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("'audioProgress'") || c.includes('"audioProgress"')) {
  console.log('audio-progress entity: already patched');
  process.exit(0);
}

// Add 'audioProgress' to the mediaItemColumns array (next to 'downloaded' / 'links')
const old = "'downloaded',";
if (!c.includes(old)) { console.error('audio-progress entity: anchor not found'); process.exit(1); }
c = c.replace(old, "'downloaded', 'audioProgress',");
fs.writeFileSync(path, c);
console.log('audio-progress entity: added audioProgress to mediaItemColumns');
