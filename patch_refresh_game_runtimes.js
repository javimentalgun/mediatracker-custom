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

if (c.includes('refreshGameRuntimes =')) {
  console.log('refresh game runtimes: already patched');
  process.exit(0);
}

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
  "  });\n";

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('refresh game runtimes: anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('refresh game runtimes: added refreshGameRuntimes endpoint');

// Register the route
const routesPath = '/app/build/generated/routes/routes.js';
let r = fs.readFileSync(routesPath, 'utf8');
if (r.includes("/api/refresh-game-runtimes'")) {
  console.log('refresh game runtimes: route already registered');
} else {
  // Anchor on a stable upstream route — patch order with later jellyfin/youtube
  // route patches doesn't matter this way.
  const routeAnchor = "router.post('/api/catalog/cleanup'";
  if (!r.includes(routeAnchor)) { console.error('refresh game runtimes: route anchor not found'); process.exit(1); }
  const routeLine = "router.post('/api/refresh-game-runtimes', validatorHandler({}), _MediaItemController.refreshGameRuntimes);\n";
  r = r.replace(routeAnchor, routeLine + routeAnchor);
  fs.writeFileSync(routesPath, r);
  console.log('refresh game runtimes: route registered');
}
