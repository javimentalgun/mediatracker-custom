// Backend for the "Marcar como en proceso" feature.
//   - Schema: tiny table with (userId, mediaItemId, createdAt). Unique per pair.
//   - Endpoints: PUT/DELETE /api/actively-in-progress/:mediaItemId, GET list.
//   - Items query: leftJoin so the API returns mediaItem.activelyInProgress bool
//     for the frontend to display the badge.
//
// Why the separate table instead of just creating a `progress` row?  Because
// progress rows are also used by Plex/scrobbling; mixing the two flags makes
// it impossible to tell "I clicked the button" from "I started watching".
// This flag is purely a user-visible category.

const fs = require('fs');

// ===== 1. Migrations =====
{
  const dir = '/app/build/migrations';
  // 1a. Original table.
  const fname1 = '20260502120000_mtForkActivelyInProgress.js';
  const path1 = dir + '/' + fname1;
  if (!fs.existsSync(path1)) {
    fs.writeFileSync(path1,
      "exports.up = async knex => {\n" +
      "  const exists = await knex.schema.hasTable('activelyInProgress');\n" +
      "  if (exists) return;\n" +
      "  await knex.schema.createTable('activelyInProgress', t => {\n" +
      "    t.increments('id').primary();\n" +
      "    t.integer('userId').notNullable().references('id').inTable('user');\n" +
      "    t.integer('mediaItemId').notNullable().references('id').inTable('mediaItem');\n" +
      "    t.float('createdAt').notNullable();\n" +
      "    t.unique(['userId', 'mediaItemId']);\n" +
      "    t.index('userId');\n" +
      "    t.index('mediaItemId');\n" +
      "  });\n" +
      "};\n" +
      "exports.down = async knex => {\n" +
      "  await knex.schema.dropTableIfExists('activelyInProgress');\n" +
      "};\n");
    console.log('actively-in-progress migration: written ' + fname1);
  } else {
    console.log('actively-in-progress migration: ' + fname1 + ' already present');
  }
  // 1b. Add `excluded` column for "force-hide from /in-progress" semantics.
  const fname2 = '20260502160000_mtForkActivelyInProgressExcluded.js';
  const path2 = dir + '/' + fname2;
  if (!fs.existsSync(path2)) {
    fs.writeFileSync(path2,
      "exports.up = async knex => {\n" +
      "  const has = await knex.schema.hasColumn('activelyInProgress', 'excluded');\n" +
      "  if (has) return;\n" +
      "  await knex.schema.alterTable('activelyInProgress', t => {\n" +
      "    t.boolean('excluded').notNullable().defaultTo(false);\n" +
      "  });\n" +
      "};\n" +
      "exports.down = async knex => {\n" +
      "  const has = await knex.schema.hasColumn('activelyInProgress', 'excluded');\n" +
      "  if (!has) return;\n" +
      "  await knex.schema.alterTable('activelyInProgress', t => { t.dropColumn('excluded'); });\n" +
      "};\n");
    console.log('actively-in-progress migration: written ' + fname2);
  } else {
    console.log('actively-in-progress migration: ' + fname2 + ' already present');
  }
}

// ===== 2. Controller (mount on item.js MediaItemController) =====
{
  const path = '/app/build/controllers/item.js';
  let c = fs.readFileSync(path, 'utf8');

  // Strip prior versions for idempotency on rebuild.
  ['activelyInProgressAdd', 'activelyInProgressRemove', 'activelyInProgressList'].forEach(name => {
    const re = new RegExp('  ' + name + ' = \\(0, _typescriptRoutesToOpenapiServer\\.createExpressRoute\\)\\(async \\(req, res\\) => \\{[\\s\\S]*?\\n  \\}\\);\\n', 'g');
    c = c.replace(re, '');
  });

  // Upsert helper: same userId/mediaItemId pair toggles between included
  // (excluded=0) and excluded (excluded=1) in a single row. PUT inserts/updates
  // to excluded=0; DELETE inserts/updates to excluded=1 (overrides the 4 default
  // cláusulas so the user can force-hide an item from /in-progress).
  const methods =
    "  activelyInProgressAdd = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
    "    const userId = Number(req.user);\n" +
    "    const mediaItemId = Number(req.params.mediaItemId);\n" +
    "    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }\n" +
    "    if (!mediaItemId) { res.status(400).json({ error: 'mediaItemId requerido' }); return; }\n" +
    "    const knex = _dbconfig.Database.knex;\n" +
    "    const existing = await knex('activelyInProgress').where({ userId, mediaItemId }).first();\n" +
    "    if (existing) {\n" +
    "      await knex('activelyInProgress').where({ id: existing.id }).update({ excluded: false });\n" +
    "    } else {\n" +
    "      await knex('activelyInProgress').insert({ userId, mediaItemId, excluded: false, createdAt: Date.now() });\n" +
    "    }\n" +
    "    res.json({ ok: true });\n" +
    "  });\n" +
    "  activelyInProgressRemove = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
    "    const userId = Number(req.user);\n" +
    "    const mediaItemId = Number(req.params.mediaItemId);\n" +
    "    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }\n" +
    "    if (!mediaItemId) { res.status(400).json({ error: 'mediaItemId requerido' }); return; }\n" +
    "    const knex = _dbconfig.Database.knex;\n" +
    "    const existing = await knex('activelyInProgress').where({ userId, mediaItemId }).first();\n" +
    "    if (existing) {\n" +
    "      await knex('activelyInProgress').where({ id: existing.id }).update({ excluded: true });\n" +
    "    } else {\n" +
    "      await knex('activelyInProgress').insert({ userId, mediaItemId, excluded: true, createdAt: Date.now() });\n" +
    "    }\n" +
    "    res.json({ ok: true });\n" +
    "  });\n" +
    "  activelyInProgressList = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
    "    const userId = Number(req.user);\n" +
    "    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }\n" +
    "    const rows = await _dbconfig.Database.knex('activelyInProgress').where({ userId }).select('mediaItemId', 'excluded');\n" +
    "    const included = rows.filter(r => !r.excluded).map(r => r.mediaItemId);\n" +
    "    const excluded = rows.filter(r => r.excluded).map(r => r.mediaItemId);\n" +
    "    res.json({ included, excluded, items: included });\n" +
    "  });\n";

  const anchor = '}\nexports.MediaItemController = MediaItemController;';
  if (!c.includes(anchor)) { console.error('actively-in-progress controller: anchor not found'); process.exit(1); }
  c = c.replace(anchor, methods + anchor);
  fs.writeFileSync(path, c);
  console.log('actively-in-progress controller: 3 endpoints attached');
}

// ===== 3. Routes =====
{
  const path = '/app/build/generated/routes/routes.js';
  let c = fs.readFileSync(path, 'utf8');
  if (c.includes("/api/actively-in-progress'")) {
    console.log('actively-in-progress routes: already present');
  } else {
    const anchor = "router.post('/api/catalog/cleanup'";
    if (!c.includes(anchor)) { console.error('actively-in-progress routes: anchor not found'); process.exit(1); }
    const route =
      "router.put('/api/actively-in-progress/:mediaItemId', validatorHandler({}), _MediaItemController.activelyInProgressAdd);\n" +
      "router.delete('/api/actively-in-progress/:mediaItemId', validatorHandler({}), _MediaItemController.activelyInProgressRemove);\n" +
      "router.get('/api/actively-in-progress', validatorHandler({}), _MediaItemController.activelyInProgressList);\n";
    c = c.replace(anchor, route + anchor);
    fs.writeFileSync(path, c);
    console.log('actively-in-progress routes: registered 3 endpoints');
  }
}

// ===== 4. items.js (knex query): leftJoin + return field =====
{
  const path = '/app/build/knex/queries/items.js';
  let c = fs.readFileSync(path, 'utf8');
  if (c.includes('// mt-fork: actively-in-progress-join')) {
    console.log('actively-in-progress (items.js): already patched');
  } else {
    // 4a. Inject leftJoin right after the .leftJoin(...progress)... chain.
    // We anchor on the progress join's terminating semicolon ".leftJoin(qb => qb.from('progress')..." ends a chain that closes with `);`.
    const joinAnchor = ".leftJoin(qb => qb.from('progress').where('userId', userId).whereNull('episodeId').whereNot('progress', 1).as('progress'), 'progress.mediaItemId', 'mediaItem.id');";
    if (!c.includes(joinAnchor)) {
      console.error('actively-in-progress (items.js): join anchor not found'); process.exit(1);
    }
    const joinExtra = joinAnchor +
      "\n  // mt-fork: actively-in-progress-join\n" +
      "  query.leftJoin(qb => qb.from('activelyInProgress').where('userId', userId).as('activelyInProgress'), 'activelyInProgress.mediaItemId', 'mediaItem.id');\n" +
      "  query.select(_dbconfig.Database.knex.raw(\"CASE WHEN \\\"activelyInProgress\\\".\\\"id\\\" IS NOT NULL AND COALESCE(\\\"activelyInProgress\\\".\\\"excluded\\\", 0) = 0 THEN 1 ELSE 0 END AS \\\"activelyInProgressFlag\\\"\"));\n" +
      "  query.select(_dbconfig.Database.knex.raw(\"CASE WHEN COALESCE(\\\"activelyInProgress\\\".\\\"excluded\\\", 0) = 1 THEN 1 ELSE 0 END AS \\\"activelyInProgressExcludedFlag\\\"\"));";
    c = c.replace(joinAnchor, joinExtra);

    // 4b. Add `activelyInProgress` + `activelyInProgressExcluded` to the per-item return object.
    const fieldAnchor = "onWatchlist: Boolean(row['listItem.id']),";
    if (!c.includes(fieldAnchor)) {
      console.error('actively-in-progress (items.js): field anchor not found'); process.exit(1);
    }
    c = c.replace(fieldAnchor, fieldAnchor + "\n    activelyInProgress: Boolean(row.activelyInProgressFlag),\n    activelyInProgressExcluded: Boolean(row.activelyInProgressExcludedFlag),");

    fs.writeFileSync(path, c);
    console.log('actively-in-progress (items.js): join + return field added');
  }
}

// Sanity-check syntax of the two JS files we modified at runtime.
for (const p of ['/app/build/controllers/item.js', '/app/build/knex/queries/items.js']) {
  try {
    delete require.cache[require.resolve(p)];
    require(p);
    console.log('actively-in-progress: syntax OK -> ' + p);
  } catch (e) {
    console.error('actively-in-progress: SYNTAX ERROR in ' + p + ' -> ' + e.message.slice(0, 300));
    process.exit(1);
  }
}
