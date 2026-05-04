const fs = require('fs');
const path = '/app/build/controllers/statisticsController.js';
let c = fs.readFileSync(path, 'utf8');

// Auto-trigger the IGDB time-to-beat backfill the FIRST time userStatisticsSummary
// runs, if there are any video_game items missing runtime. Without this the user
// has to manually click "Refrescar tiempos de juegos" on the Backup page before
// the homepage games block has anything to display.
//
// Fire-and-forget — we don't await; the stats response returns immediately with
// whatever's currently in the DB. The first reload after the refresh finishes
// (~85s for 334 games at 250ms each) will show the populated hours.
//
// One-shot per container lifetime via global._mtAutoRefreshGamesDone flag.

if (c.includes('// mt-fork: auto-refresh-games')) {
  console.log('auto refresh games on stats: already patched');
  process.exit(0);
}

// Anchor at the top of userStatisticsSummary, right after `const userStatisticsSummary = async userId => {`
const oldFn = "const userStatisticsSummary = async userId => {\n  const res = await _dbconfig.Database.knex('seen')";
const newFn =
  "const userStatisticsSummary = async userId => {\n" +
  "  // mt-fork: auto-refresh-games — fire once per container lifetime\n" +
  "  if (!global._mtAutoRefreshGamesDone) {\n" +
  "    global._mtAutoRefreshGamesDone = true;\n" +
  "    setImmediate(async () => {\n" +
  "      try {\n" +
  "        const knex = _dbconfig.Database.knex;\n" +
  "        const games = await knex('mediaItem').where({ mediaType: 'video_game' }).whereNotNull('igdbId').whereNull('runtime').select('id', 'igdbId', 'title');\n" +
  "        if (!games.length) return;\n" +
  "        const { metadataProviders } = require('../metadata/metadataProviders');\n" +
  "        const igdb = metadataProviders.get('video_game', 'IGDB');\n" +
  "        if (!igdb) return;\n" +
  "        _logger.logger.info('mt-fork: auto-refreshing IGDB time-to-beat for ' + games.length + ' game(s) without runtime');\n" +
  "        let updated = 0, missing = 0, failed = 0;\n" +
  "        // Process in batches of 5 in parallel — drops total time from ~250ms*N to ~250ms*(N/5).\n" +
  "        // Going wider risks IGDB rate-limiting the user's app credentials.\n" +
  "        const BATCH = 5;\n" +
  "        for (let i = 0; i < games.length; i += BATCH) {\n" +
  "          const slice = games.slice(i, i + BATCH);\n" +
  "          await Promise.all(slice.map(async g => {\n" +
  "            let ttb = null;\n" +
  "            try { ttb = await igdb.gameTimeToBeat(g.igdbId); }\n" +
  "            catch (_) { failed++; return; }\n" +
  "            if (!ttb) { missing++; return; }\n" +
  "            try { await knex('mediaItem').where('id', g.id).update({ runtime: ttb }); updated++; }\n" +
  "            catch (_) { failed++; }\n" +
  "          }));\n" +
  "        }\n" +
  "        _logger.logger.info('mt-fork: auto-refresh done — updated=' + updated + ', missing=' + missing + ', failed=' + failed);\n" +
  "      } catch (e) {\n" +
  "        _logger.logger.error('mt-fork: auto-refresh failed: ' + (e && e.message));\n" +
  "      }\n" +
  "    });\n" +
  "  }\n" +
  "  const res = await _dbconfig.Database.knex('seen')";

if (!c.includes(oldFn)) {
  console.error('auto refresh games on stats: function-start anchor not found');
  process.exit(1);
}

// Need _logger import. Check it's available; if not, add it.
if (!/_logger\s*=\s*require/.test(c) && !/var _logger\s*=\s*require/.test(c) && !c.includes('require("../logger")') && !c.includes("require('../logger')")) {
  // Add logger import at top (after the existing requires)
  const reqAnchor = 'var _dbconfig = require("../dbconfig");';
  const reqInjection = 'var _dbconfig = require("../dbconfig");\nvar _logger = require("../logger");';
  if (c.includes(reqAnchor)) {
    c = c.replace(reqAnchor, reqInjection);
    console.log('auto refresh games on stats: added _logger import');
  }
}

c = c.replace(oldFn, newFn);
fs.writeFileSync(path, c);
console.log('auto refresh games on stats: installed background backfill on first stats request');
