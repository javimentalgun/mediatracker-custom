const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('INDEXED BY mediaitem_mediatype_index')) { console.log('items force index: already patched'); process.exit(0); }

// SQLite's planner picks `mediaitem_goodreadsid_mediatype_unique` instead of the
// plain `mediaitem_mediatype_index` for the items query — 100× slower (5400ms vs
// 46ms). Force the right index via INDEXED BY hint by replacing knex's
// `.from('mediaItem')` with a raw FROM clause.
const old = ".from('mediaItem')";
const fresh = ".from(_dbconfig.Database.knex.raw('`mediaItem` INDEXED BY mediaitem_mediatype_index'))";

if (!c.includes(old)) { console.error('items force index: anchor not found'); process.exit(1); }
// Only the OUTER from('mediaItem') — there are nested .from('seen'), .from('episode'), etc.
// Replace just the first/outermost (the chain pattern uses .from('mediaItem').leftJoin(...))
const idx = c.indexOf(old + '.leftJoin');
if (idx < 0) { console.error('items force index: outer from anchor not found'); process.exit(1); }
c = c.slice(0, idx) + fresh + c.slice(idx + old.length);

fs.writeFileSync(path, c);
console.log('items force index: forced mediaitem_mediatype_index (fixes 5400ms→46ms planner regression)');
