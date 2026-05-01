const fs = require('fs');
const path = require('path');

// One-shot migration: zero out video_game runtimes > 500h (= 30000 min). The
// previous build (v0.1.6) had no cap, so endless games like Star Citizen and
// MMOs polluted mediaItem.runtime with absurd values from IGDB. The auto-refresh
// path now caps at 500h, so we just need to invalidate the existing rows for
// the auto-refresh to re-fetch them with the cap applied.

const dir = '/app/build/migrations';
const file = path.join(dir, '20260501000002_mtForkResetOutlierGameRuntimes.js');

if (fs.existsSync(file)) {
  console.log('reset outlier game runtimes: file already exists');
  process.exit(0);
}

const content =
  '"use strict";\n' +
  'Object.defineProperty(exports, "__esModule", { value: true });\n' +
  'exports.up = void 0;\n' +
  'exports.down = void 0;\n' +
  'async function up(knex) {\n' +
  '  // 30000 min = 500h. Anything above that is IGDB telling us the game is\n' +
  '  // effectively endless (MMOs, sandbox, live-service) — skip from the total.\n' +
  '  await knex.raw(`UPDATE mediaItem SET runtime = NULL WHERE mediaType = ? AND runtime > ?`, [\'video_game\', 30000]);\n' +
  '}\n' +
  'async function down(knex) {\n' +
  '  // No-op — old values are gone; re-fetch via the IGDB time-to-beat refresh.\n' +
  '}\n' +
  'exports.up = up;\n' +
  'exports.down = down;\n';

fs.writeFileSync(file, content);
console.log('reset outlier game runtimes: wrote ' + path.basename(file));
