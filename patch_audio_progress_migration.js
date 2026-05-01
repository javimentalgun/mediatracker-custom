const fs = require('fs');
const path = '/app/build/migrations';
const list = fs.readdirSync(path).filter(f => f.endsWith('.js')).sort();

const fname = '20260428000002_addAudioProgressToMediaItem.js';
const dest = path + '/' + fname;
if (fs.existsSync(dest)) { console.log('audio-progress migration: already exists'); process.exit(0); }

const content = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = void 0;
exports.down = void 0;
async function up(knex) {
  await knex.schema.table('mediaItem', table => {
    table.float('audioProgress').nullable();
  });
}
async function down(knex) {
  await knex.schema.table('mediaItem', table => {
    table.dropColumn('audioProgress');
  });
}
exports.up = up;
exports.down = down;
//# sourceMappingURL=` + fname + `.map
`;

fs.writeFileSync(dest, content);
console.log('audio-progress migration: created', fname);
