// Fix `ambiguous column name: progress` SQL error when sorting by orderBy=progress.
//
// Items query joins `progress` table aliased `progress` AND selects
// `progress.progress AS progress` (the column). The orderBy ELSE branch
// references bare `"progress"` which SQLite can't disambiguate → query fails
// with "ambiguous column name: progress" → frontend goes blank.
//
// Fix: qualify with `"progress"."progress"`.

const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

const marker = '/* mt-fork: progress-sort-disambig */';
if (c.includes(marker)) { console.log('progress sort disambig: already patched'); process.exit(0); }

const oldExpr = 'WHEN "mediaItem"."mediaType" = \'tv\' THEN "unseenEpisodesCount"\n                            ELSE "progress"';
const newExpr = 'WHEN "mediaItem"."mediaType" = \'tv\' THEN "unseenEpisodesCount"\n                            ELSE "progress"."progress"';

if (!c.includes(oldExpr)) {
  console.error('progress sort disambig: anchor not found');
  process.exit(1);
}
c = c.replace(oldExpr, newExpr);
c = '// ' + marker + '\n' + c;
fs.writeFileSync(path, c);
console.log('progress sort disambig: applied');
