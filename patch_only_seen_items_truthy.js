const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('// only-seen-truthy')) { console.log('only-seen truthy: already patched'); process.exit(0); }

// Original:  if (onlySeenItems === true) { query.whereNotNull('lastSeen.mediaItemId'); }
// Bug: query string params arrive as strings ("true"), so === true is always false
// → filter never applies → data returns ALL items, only count shows correct N.
const old = "    if (onlySeenItems === true) {\n      query.whereNotNull('lastSeen.mediaItemId');\n    }";
const fresh = "    if (onlySeenItems === true || onlySeenItems === 'true' || onlySeenItems === 1) { // only-seen-truthy\n      query.whereNotNull('lastSeen.mediaItemId');\n    }";
if (!c.includes(old)) { console.error('only-seen truthy: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);

fs.writeFileSync(path, c);
console.log('only-seen truthy: filter now accepts "true"/1 string-form too');
