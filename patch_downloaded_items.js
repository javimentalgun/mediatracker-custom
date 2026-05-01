const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

const old = "onWatchlist: Boolean(row['listItem.id']),";
const patched = "downloaded: Boolean(row['mediaItem.downloaded']),\n    onWatchlist: Boolean(row['listItem.id']),";

if (c.includes(patched)) { console.log('items: already patched'); process.exit(0); }
if (!c.includes(old)) { console.error('items: anchor not found'); process.exit(1); }

fs.writeFileSync(path, c.replace(old, patched));
console.log('items: added downloaded field to result mapping');
