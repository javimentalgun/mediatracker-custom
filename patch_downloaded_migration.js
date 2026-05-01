const fs = require('fs');
const path = '/app/build/migrations/20260428000000_addDownloadedToMediaItem.js';

if (fs.existsSync(path)) {
  console.log('migration: already exists, skipping');
  process.exit(0);
}

const content = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.down = down;
exports.up = up;
async function up(knex) {
  const has = await knex.schema.hasColumn('mediaItem', 'downloaded');
  if (!has) {
    await knex.schema.alterTable('mediaItem', table => {
      table.boolean('downloaded').defaultTo(false);
    });
  }
}
async function down(knex) {
  const has = await knex.schema.hasColumn('mediaItem', 'downloaded');
  if (has) {
    await knex.schema.alterTable('mediaItem', table => {
      table.dropColumn('downloaded');
    });
  }
}
`;

fs.writeFileSync(path, content);
console.log('migration: created 20260428000000_addDownloadedToMediaItem.js');
