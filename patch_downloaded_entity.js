const fs = require('fs');
const path = '/app/build/entity/mediaItem.js';
let c = fs.readFileSync(path, 'utf8');

const old = "'posterId', 'backdropId']";
const patched = "'posterId', 'backdropId', 'downloaded']";

if (c.includes(patched)) { console.log('entity: already patched'); process.exit(0); }
if (!c.includes(old)) { console.error('entity: anchor not found'); process.exit(1); }

fs.writeFileSync(path, c.replace(old, patched));
console.log('entity: added downloaded to mediaItemColumns');
