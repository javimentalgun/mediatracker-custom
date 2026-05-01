const fs = require('fs');
const path = '/app/build/migrations';
const fname = '20260428000005_addSeenMediaItemUserIndex.js';
const dest = path + '/' + fname;
// Always overwrite — the v1 of this file used schema.table().index() which is
// not idempotent and crashes startup if the index already exists from a hot-fix.

const content = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = void 0;
exports.down = void 0;
async function up(knex) {
  // Composite index to speed up "is this mediaItem seen by this user" lookups.
  // The existing seen_userid_index forced a 31k-row scan per outer row in queries
  // like "tv shows in progress" — this drops them from ~9s to ~1ms.
  // Raw SQL with IF NOT EXISTS so this is idempotent across hot-fixes that
  // may have already created the index manually.
  await knex.raw('CREATE INDEX IF NOT EXISTS seen_mediaitem_user_idx ON seen(mediaItemId, userId)');
}
async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS seen_mediaitem_user_idx');
}
exports.up = up;
exports.down = down;
//# sourceMappingURL=` + fname + `.map
`;

fs.writeFileSync(dest, content);
console.log('perf indexes v2 migration: created', fname);
