const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

// Three endpoints for managing per-user abandoned items:
//   PUT    /api/abandoned/:mediaItemId   → mark as abandoned (idempotent)
//   DELETE /api/abandoned/:mediaItemId   → unmark
//   GET    /api/abandoned                → list mediaItemIds for current user
//
// Also extend the items query support: items.js destructure already includes
// new filters added by other patches; we add `excludeAbandoned` / `onlyAbandoned`
// in patch_abandoned_filter.js.

if (c.includes('abandonedAdd =')) {
  console.log('abandoned controller: already patched');
  process.exit(0);
}

const methods =
  "  abandonedAdd = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
  "    const userId = Number(req.user);\n" +
  "    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }\n" +
  "    const mediaItemId = Number(req.params.mediaItemId);\n" +
  "    if (!mediaItemId) { res.status(400).json({ error: 'mediaItemId requerido' }); return; }\n" +
  "    const knex = _dbconfig.Database.knex;\n" +
  "    const mi = await knex('mediaItem').where('id', mediaItemId).first('id');\n" +
  "    if (!mi) { res.status(404).json({ error: 'mediaItem no encontrado' }); return; }\n" +
  "    await knex.raw('INSERT OR IGNORE INTO abandoned (userId, mediaItemId, date) VALUES (?, ?, ?)', [userId, mediaItemId, Date.now()]);\n" +
  "    res.json({ ok: true });\n" +
  "  });\n" +
  "  abandonedRemove = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
  "    const userId = Number(req.user);\n" +
  "    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }\n" +
  "    const mediaItemId = Number(req.params.mediaItemId);\n" +
  "    if (!mediaItemId) { res.status(400).json({ error: 'mediaItemId requerido' }); return; }\n" +
  "    const knex = _dbconfig.Database.knex;\n" +
  "    await knex('abandoned').where({ userId, mediaItemId }).delete();\n" +
  "    res.json({ ok: true });\n" +
  "  });\n" +
  "  abandonedList = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
  "    const userId = Number(req.user);\n" +
  "    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }\n" +
  "    const knex = _dbconfig.Database.knex;\n" +
  "    const rows = await knex('abandoned').where('userId', userId).select('mediaItemId', 'date');\n" +
  "    res.json({ items: rows.map(r => r.mediaItemId), full: rows });\n" +
  "  });\n";

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('abandoned controller: anchor not found'); process.exit(1); }
c = c.replace(anchor, methods + anchor);
fs.writeFileSync(path, c);
console.log('abandoned controller: added abandonedAdd / abandonedRemove / abandonedList');
