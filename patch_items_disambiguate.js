// Disambiguate "progress" references in items.js after we added episode.progress
// (which made `progress` column ambiguous between progress.progress and the
// joined episode tables' progress column).
const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/* PROGRESS_DISAMBIGUATED */")) {
  console.log('items disambiguate: already patched'); process.exit(0);
}

// Specifically replace `whereNotNull('progress')` with `whereNotNull('progress.mediaItemId')`
const old = "whereNotNull('progress')";
const fresh = "whereNotNull('progress.mediaItemId')";
if (!c.includes(old)) {
  console.error('items disambiguate: anchor not found'); process.exit(1);
}
const cnt = c.split(old).length - 1;
c = c.split(old).join(fresh);
c += '\n/* PROGRESS_DISAMBIGUATED */\n';
fs.writeFileSync(path, c);
console.log('items disambiguate:', cnt, 'whereNotNull(progress) -> whereNotNull(progress.mediaItemId)');
