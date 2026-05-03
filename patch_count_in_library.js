// Bug: items.js getItemsKnexSql builds a separate fast-path "count" query for
// the default branch (no special filter). The data query restricts results to
// items the user actually has in their library:
//   query.where(qb => qb.whereNotNull('listItem.mediaItemId')
//                     .orWhereNotNull('lastSeen.mediaItemId'));
// …but the default count branch is just `count('* as count')` over all
// mediaItem rows of that type. Result: a section like /theater shows "9
// elementos" when only 2 are actually rendered (the other 7 are orphaned
// search results that got persisted but never added to a list/seen).
//
// Replace the default count branch with one that applies the same library
// membership filter (in any list of this user, or with any seen row).

const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

const marker = '// mt-fork: count-in-library';
if (c.includes(marker)) {
  console.log('count-in-library: already patched');
  process.exit(0);
}

const old = "} else {\n    sqlCountQuery = _knex('mediaItem').modify(_applyMt).count('* as count');\n  } // count-fast-path";
const _new = "} else {\n    " + marker + "\n    sqlCountQuery = _knex('mediaItem').modify(_applyMt).where(qb => qb\n      .whereExists(function(){ this.from('listItem').join('list','list.id','listItem.listId').whereRaw('listItem.mediaItemId = mediaItem.id').where('list.userId', userId); })\n      .orWhereExists(function(){ this.from('seen').whereRaw('seen.mediaItemId = mediaItem.id').where('seen.userId', userId); })\n    ).count('* as count');\n  } // count-fast-path";

if (!c.includes(old)) {
  console.error('count-in-library: anchor not found in items.js (layout changed?)');
  process.exit(1);
}
c = c.replace(old, _new);
fs.writeFileSync(path, c);
console.log('count-in-library: default count branch now requires list-membership or seen');

try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('count-in-library: syntax OK');
} catch (e) {
  console.error('count-in-library: SYNTAX ERROR -> ' + e.message.slice(0, 300));
  process.exit(1);
}
