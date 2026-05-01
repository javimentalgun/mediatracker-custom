const fs = require('fs');
const path = '/app/build/migrations/20260428000001_addLinksToMediaItem.js';

if (fs.existsSync(path)) { console.log('links migration: already exists'); process.exit(0); }

fs.writeFileSync(path, `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.down = down; exports.up = up;
async function up(knex) {
  const has = await knex.schema.hasColumn('mediaItem', 'links');
  if (!has) await knex.schema.alterTable('mediaItem', t => t.text('links').defaultTo('[]'));
}
async function down(knex) {
  const has = await knex.schema.hasColumn('mediaItem', 'links');
  if (has) await knex.schema.alterTable('mediaItem', t => t.dropColumn('links'));
}
`);
console.log('links migration: created');
