// V3 perf-indexes migration — adds composite indexes that the backup import,
// listItem dedup, and userRating lookups need.
//
// Audit found these queries doing full or near-full table scans:
//   1) backup.importJson: SELECT FROM seen WHERE userId=? AND mediaItemId=? AND episodeId=?
//      → existing single-column indexes don't compose; add (userId, mediaItemId, episodeId).
//   2) userRating dedup: WHERE userId=? AND mediaItemId=? AND (seasonId=? OR seasonId IS NULL) AND (episodeId=? OR episodeId IS NULL)
//      → no composite at all today; add (userId, mediaItemId, seasonId, episodeId).
//   3) listItem dedup: WHERE listId=? AND mediaItemId=? [AND seasonId=? AND episodeId=?]
//      → only single-column indexes; add the full composite.
//
// Idempotent via `IF NOT EXISTS`. Down drops them.

const fs = require('fs');
const path = '/app/build/migrations';
const fname = '20260504010000_addPerfIndexesV3.js';
const dest = path + '/' + fname;

const content = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = void 0;
exports.down = void 0;
async function up(knex) {
  // seen: covers backup importJson dedup, "is episode N seen by user U" hot-path
  await knex.raw('CREATE INDEX IF NOT EXISTS seen_user_media_episode_idx ON seen(userId, mediaItemId, episodeId)');
  // userRating: covers all rating lookups across season/episode granularity
  await knex.raw('CREATE INDEX IF NOT EXISTS userrating_user_media_season_episode_idx ON userRating(userId, mediaItemId, seasonId, episodeId)');
  // listItem: dedup during list import + watchlist membership checks
  await knex.raw('CREATE INDEX IF NOT EXISTS listitem_list_media_season_episode_idx ON listItem(listId, mediaItemId, seasonId, episodeId)');
}
async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS seen_user_media_episode_idx');
  await knex.raw('DROP INDEX IF EXISTS userrating_user_media_season_episode_idx');
  await knex.raw('DROP INDEX IF EXISTS listitem_list_media_season_episode_idx');
}
exports.up = up;
exports.down = down;
//# sourceMappingURL=` + fname + `.map
`;

fs.writeFileSync(dest, content);
console.log('perf indexes v3 migration: created', fname);
