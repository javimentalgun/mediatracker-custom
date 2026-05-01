const fs = require('fs');
const path = '/app/build/entity/mediaItem.js';
let c = fs.readFileSync(path, 'utf8');

const old = "'posterId', 'backdropId', 'downloaded']";
const pat = "'posterId', 'backdropId', 'downloaded', 'links']";

if (c.includes(pat)) { console.log('links entity: already patched'); process.exit(0); }
if (!c.includes(old)) { console.error('links entity: anchor not found'); process.exit(1); }

fs.writeFileSync(path, c.replace(old, pat));
console.log('links entity: added links to mediaItemColumns');
