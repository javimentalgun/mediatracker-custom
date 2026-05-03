const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

// Admin endpoint to backfill mediaItem.runtime for every video_game with an
// igdbId. Without this, the patch_igdb_time_to_beat.js change only takes
// effect on the 24h metadata-refresh cycle, so existing libraries see "0h"
// in the homepage games block until each game's lastTimeUpdated rolls over.
//
// One-shot, idempotent (re-running is fine — it only writes when the value
// differs). Throttled by IGDB's own request queue (250ms between calls).

if (c.includes('refreshGameRuntimes =') && c.includes('refreshGameRuntimeOne =')) {
  console.log('refresh game runtimes: already patched');
  process.exit(0);
}

// Strip prior versions so re-running this patch picks up new logic.
['refreshGameRuntimes', 'refreshGameRuntimeOne'].forEach(name => {
  const re = new RegExp('  ' + name + ' = \\(0, _typescriptRoutesToOpenapiServer\\.createExpressRoute\\)\\(async \\(req, res\\) => \\{[\\s\\S]*?\\n  \\}\\);\\n', 'g');
  c = c.replace(re, '');
});

const method =
  "  refreshGameRuntimes = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
  "    if (!(await this.jellyfinIsAdmin(req, res))) return;\n" +
  "    const knex = _dbconfig.Database.knex;\n" +
  "    const { metadataProviders } = require('../metadata/metadataProviders');\n" +
  "    const igdb = metadataProviders.get('video_game', 'IGDB');\n" +
  "    if (!igdb) { res.status(500).json({ error: 'IGDB provider not available' }); return; }\n" +
  "    const games = await knex('mediaItem').where({ mediaType: 'video_game' }).whereNotNull('igdbId').select('id','igdbId','runtime','title');\n" +
  "    let updated = 0, unchanged = 0, missing = 0, failed = 0;\n" +
  "    for (const g of games) {\n" +
  "      let ttb = null;\n" +
  "      try { ttb = await igdb.gameTimeToBeat(g.igdbId); }\n" +
  "      catch (_) { failed++; continue; }\n" +
  "      if (!ttb) { missing++; continue; }\n" +
  "      if (g.runtime === ttb) { unchanged++; continue; }\n" +
  "      try {\n" +
  "        await knex('mediaItem').where('id', g.id).update({ runtime: ttb });\n" +
  "        updated++;\n" +
  "      } catch (_) { failed++; }\n" +
  "    }\n" +
  "    res.json({ ok: true, total: games.length, updated, unchanged, missing, failed });\n" +
  "  });\n" +
  // Per-game variant: refresh a single video_game's runtime from IGDB.
  // Any logged-in user can trigger this for an item they care about; the
  // change writes mediaItem.runtime which is shared across users (same as
  // upstream's metadata refresh button).
  "  refreshGameRuntimeOne = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
  "    const userId = Number(req.user);\n" +
  "    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }\n" +
  "    const id = Number(req.params.mediaItemId);\n" +
  "    if (!id) { res.status(400).json({ error: 'mediaItemId requerido' }); return; }\n" +
  "    const knex = _dbconfig.Database.knex;\n" +
  "    const { metadataProviders } = require('../metadata/metadataProviders');\n" +
  "    const igdb = metadataProviders.get('video_game', 'IGDB');\n" +
  "    if (!igdb) { res.status(500).json({ error: 'IGDB provider not available' }); return; }\n" +
  "    const g = await knex('mediaItem').where({ id, mediaType: 'video_game' }).whereNotNull('igdbId').first();\n" +
  "    if (!g) { res.status(404).json({ error: 'game not found or has no igdbId' }); return; }\n" +
  "    let ttb = null;\n" +
  "    try { ttb = await igdb.gameTimeToBeat(g.igdbId); }\n" +
  "    catch (e) { res.status(502).json({ error: 'IGDB error: ' + e.message }); return; }\n" +
  "    if (!ttb) { res.json({ ok: true, updated: false, reason: 'no time-to-beat from IGDB', runtime: g.runtime }); return; }\n" +
  "    if (g.runtime === ttb) { res.json({ ok: true, updated: false, reason: 'unchanged', runtime: ttb }); return; }\n" +
  "    await knex('mediaItem').where('id', id).update({ runtime: ttb });\n" +
  "    res.json({ ok: true, updated: true, runtime: ttb });\n" +
  "  });\n";

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('refresh game runtimes: anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('refresh game runtimes: added refreshGameRuntimes endpoint');

// Register the route
const routesPath = '/app/build/generated/routes/routes.js';
let r = fs.readFileSync(routesPath, 'utf8');
if (r.includes("/api/refresh-game-runtimes'") && r.includes("/api/refresh-game-runtime/:mediaItemId'")) {
  console.log('refresh game runtimes: routes already registered');
} else {
  // Strip prior versions so re-running picks up the new (per-game) route too.
  r = r.replace(/router\.post\('\/api\/refresh-game-runtimes?'[^\n]*\n/g, '');
  r = r.replace(/router\.post\('\/api\/refresh-game-runtime\/:mediaItemId'[^\n]*\n/g, '');
  const routeAnchor = "router.post('/api/catalog/cleanup'";
  if (!r.includes(routeAnchor)) { console.error('refresh game runtimes: route anchor not found'); process.exit(1); }
  const routeLines =
    "router.post('/api/refresh-game-runtimes', validatorHandler({}), _MediaItemController.refreshGameRuntimes);\n" +
    "router.post('/api/refresh-game-runtime/:mediaItemId', validatorHandler({}), _MediaItemController.refreshGameRuntimeOne);\n";
  r = r.replace(routeAnchor, routeLines + routeAnchor);
  fs.writeFileSync(routesPath, r);
  console.log('refresh game runtimes: 2 routes registered (bulk + per-game)');
}
