const fs = require('fs');
const path = require('path');

// Add a knex migration that creates a per-user `abandoned` table. Each row marks
// (userId, mediaItemId) as "stopped consuming on purpose" — used by the
// /in-progress (Pendiente) filter to exclude these items, and by a new
// /abandoned page that lists them.

const dir = '/app/build/migrations';
const file = path.join(dir, '20260501000001_mtForkAbandoned.js');

if (fs.existsSync(file)) {
  console.log('abandoned migration: file already exists');
  process.exit(0);
}

const content =
  '"use strict";\n' +
  'Object.defineProperty(exports, "__esModule", { value: true });\n' +
  'exports.up = void 0;\n' +
  'exports.down = void 0;\n' +
  'async function up(knex) {\n' +
  '  // mt-fork: per-user "I gave up on this" flag. Excluded from Pendiente, listed\n' +
  '  // separately on /abandonados. Composite PK so toggling on/off is idempotent.\n' +
  '  await knex.raw(`\n' +
  '    CREATE TABLE IF NOT EXISTS abandoned (\n' +
  '      userId INTEGER NOT NULL,\n' +
  '      mediaItemId INTEGER NOT NULL,\n' +
  '      date BIGINT NOT NULL,\n' +
  '      PRIMARY KEY (userId, mediaItemId),\n' +
  '      FOREIGN KEY (userId) REFERENCES user(id),\n' +
  '      FOREIGN KEY (mediaItemId) REFERENCES mediaItem(id)\n' +
  '    )\n' +
  '  `);\n' +
  '  await knex.raw(\'CREATE INDEX IF NOT EXISTS abandoned_userid_index ON abandoned(userId)\');\n' +
  '  await knex.raw(\'CREATE INDEX IF NOT EXISTS abandoned_mediaitemid_index ON abandoned(mediaItemId)\');\n' +
  '}\n' +
  'async function down(knex) {\n' +
  '  await knex.raw(\'DROP INDEX IF EXISTS abandoned_userid_index\');\n' +
  '  await knex.raw(\'DROP INDEX IF EXISTS abandoned_mediaitemid_index\');\n' +
  '  await knex.raw(\'DROP TABLE IF EXISTS abandoned\');\n' +
  '}\n' +
  'exports.up = up;\n' +
  'exports.down = down;\n';

fs.writeFileSync(file, content);
console.log('abandoned migration: wrote ' + path.basename(file));
