const fs = require('fs');
const path = '/app/build/migrations';
const fname = '20260428000003_addProgressToEpisode.js';
const dest = path + '/' + fname;
if (fs.existsSync(dest)) { console.log('episode-progress migration: already exists'); process.exit(0); }

const content = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = void 0;
exports.down = void 0;
async function up(knex) {
  await knex.schema.table('episode', table => {
    table.float('progress').nullable();
  });
}
async function down(knex) {
  await knex.schema.table('episode', table => {
    table.dropColumn('progress');
  });
}
exports.up = up;
exports.down = down;
//# sourceMappingURL=` + fname + `.map
`;

fs.writeFileSync(dest, content);
console.log('episode-progress migration: created', fname);
