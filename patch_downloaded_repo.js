const fs = require('fs');
const path = '/app/build/repository/mediaItem.js';
let c = fs.readFileSync(path, 'utf8');

const old = "booleanColumnNames: ['needsDetails']";
const patched = "booleanColumnNames: ['needsDetails', 'downloaded']";

if (c.includes(patched)) { console.log('repo: already patched'); process.exit(0); }
if (!c.includes(old)) { console.error('repo: anchor not found'); process.exit(1); }

fs.writeFileSync(path, c.replace(old, patched));
console.log('repo: added downloaded to booleanColumnNames');
