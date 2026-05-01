const fs = require('fs');
const path = '/app/build/migrations';
const fname = '20260429000001_addSeenKind.js';
const dest = path + '/' + fname;

const content = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = void 0;
exports.down = void 0;
async function up(knex) {
  // Adds a 'kind' column to seen so we can distinguish "actually played" from
  // "watched only" (e.g. someone watching a gameplay video). Default 'played'
  // preserves prior behavior for items that aren't reclassified.
  await knex.raw("ALTER TABLE seen ADD COLUMN kind TEXT NOT NULL DEFAULT 'played'");
  // Initial reclassification: rows whose mediaItem is on the user's watchlist
  // are likely "watched" (eye-clicks added before active play) — mark them so.
  await knex.raw(\`
    UPDATE seen SET kind = 'watched'
    WHERE id IN (
      SELECT s.id FROM seen s
      WHERE EXISTS(
        SELECT 1 FROM listItem li
        JOIN list l ON l.id = li.listId
        WHERE l.userId = s.userId AND l.isWatchlist = 1
          AND li.mediaItemId = s.mediaItemId
          AND li.seasonId IS NULL AND li.episodeId IS NULL
      )
    )
  \`);
  await knex.raw('CREATE INDEX IF NOT EXISTS seen_kind_index ON seen(kind)');
}
async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS seen_kind_index');
  await knex.raw('ALTER TABLE seen DROP COLUMN kind');
}
exports.up = up;
exports.down = down;
//# sourceMappingURL=` + fname + `.map
`;

fs.writeFileSync(dest, content);
console.log('seen kind migration: created', fname);
