const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

// Gate backup, restore, import, export, dupes, cleanup endpoints to admin users only.
// Without this, a non-admin user could download the full data.db (other users' data leak)
// or wipe/import data globally.
//
// Reuses jellyfinIsAdmin helper installed by patch_jellyfin_admin_only.js.
// Idempotent: only injects the check at the top of each handler if not already present.

const targets = [
  'downloadBackup', 'exportJson', 'importJson', 'exportLetterboxd', 'restoreBackup',
  'cleanupCatalog', 'findDupes', 'mergeDupes',
];

let count = 0;
for (const name of targets) {
  const pat = new RegExp('(' + name + ' = \\(0, _typescriptRoutesToOpenapiServer\\.createExpressRoute\\)\\(async \\(req, res\\) => \\{\\n)(?!    if \\(!\\(await this\\.jellyfinIsAdmin)', 'g');
  const before = c;
  c = c.replace(pat, '$1    if (!(await this.jellyfinIsAdmin(req, res))) return;\n');
  if (c !== before) count++;
}

fs.writeFileSync(path, c);
console.log('admin-only endpoints: gated ' + count + ' of ' + targets.length + ' endpoints (idempotent re-runs leave already-gated ones alone)');
