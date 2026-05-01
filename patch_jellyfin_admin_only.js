const fs = require('fs');

// 1. Item controller — gate the 5 jellyfin endpoints behind an admin check
{
  const path = '/app/build/controllers/item.js';
  let c = fs.readFileSync(path, 'utf8');

  // Helper: returns true iff the caller is an admin in MT's user table.
  if (!c.includes('jellyfinIsAdmin')) {
    const helper =
      "  jellyfinIsAdmin = async (req, res) => {\n" +
      "    const userId = Number(req.user);\n" +
      "    if (!userId) { res.status(401).json({ error: 'login required' }); return false; }\n" +
      "    const u = await _dbconfig.Database.knex('user').where('id', userId).first();\n" +
      "    if (!u || !u.admin) { res.status(403).json({ error: 'admin only' }); return false; }\n" +
      "    return true;\n" +
      "  };\n";
    c = c.replace('  jellyfinFetch = async', helper + '  jellyfinFetch = async');
  }

  // Inject the check at the top of each createExpressRoute body for the JF endpoints.
  const targets = ['jellyfinStatus', 'jellyfinSync', 'jellyfinSyncDownloaded', 'jellyfinLookup', 'jellyfinLibraryIds'];
  for (const name of targets) {
    const pat = new RegExp('(' + name + ' = \\(0, _typescriptRoutesToOpenapiServer\\.createExpressRoute\\)\\(async \\(req, res\\) => \\{\\n)(?!    if \\(!\\(await this\\.jellyfinIsAdmin)', 'g');
    c = c.replace(pat, '$1    if (!(await this.jellyfinIsAdmin(req, res))) return;\n');
  }

  fs.writeFileSync(path, c);
  console.log('jellyfin admin-only: gated 5 endpoints in item.js');
}

// 2. Seen controller — reverse-sync helper should only fire for admin MT users
{
  const path = '/app/build/controllers/seen.js';
  let c = fs.readFileSync(path, 'utf8');

  // Update the call site: pass userId so the helper can check admin
  if (!c.includes('_jfPushPlayed(mediaItem, episode, userId)')) {
    c = c.replace('_jfPushPlayed(mediaItem, episode);', '_jfPushPlayed(mediaItem, episode, userId);');
  }
  // Update the helper signature + add admin check
  if (!c.includes('// _jfPushPlayed admin-gated')) {
    const oldSig = 'async function _jfPushPlayed(mediaItem, episode) {';
    const newSig = 'async function _jfPushPlayed(mediaItem, episode, userId) { // _jfPushPlayed admin-gated\n' +
      "  try {\n" +
      "    const u = await _dbconfig.Database.knex('user').where('id', userId).first();\n" +
      "    if (!u || !u.admin) return;\n" +
      "  } catch (_) { return; }";
    c = c.replace(oldSig, newSig);
  }
  fs.writeFileSync(path, c);
  console.log('jellyfin admin-only: reverse-sync gated to admin users');
}
