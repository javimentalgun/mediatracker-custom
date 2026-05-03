// Combined endpoint + shared in-flight cache so _AB and _AIP render together
// instead of popping in one after the other on the detail page.
//
//   - Backend: GET /api/item-flags/:mediaItemId returns
//       { abandoned, activelyInProgress, activelyInProgressExcluded }
//     Single round trip instead of two parallel ones.
//   - Frontend: window._mtItemFlags[mediaItemId] caches the in-flight Promise
//     so the second component to mount reuses the first one's request.
//   - _AB and _AIP read from this combined fetch instead of their old
//     per-component endpoints.

const fs = require('fs');
const child = require('child_process');

// ===== Backend: controller =====
{
  const path = '/app/build/controllers/item.js';
  let c = fs.readFileSync(path, 'utf8');

  if (c.includes('itemFlagsCombined =')) {
    console.log('item-flags combined: controller already patched');
  } else {
    const method =
      "  itemFlagsCombined = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
      "    const userId = Number(req.user);\n" +
      "    const mediaItemId = Number(req.params.mediaItemId);\n" +
      "    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }\n" +
      "    if (!mediaItemId) { res.status(400).json({ error: 'mediaItemId requerido' }); return; }\n" +
      "    const knex = _dbconfig.Database.knex;\n" +
      "    const [ab, aip, sw] = await Promise.all([\n" +
      "      knex('abandoned').where({ userId, mediaItemId }).first(),\n" +
      "      knex('activelyInProgress').where({ userId, mediaItemId }).first(),\n" +
      "      knex('seen').where({ userId, mediaItemId, kind: 'watched' }).first()\n" +
      "    ]);\n" +
      "    res.json({\n" +
      "      abandoned: !!ab,\n" +
      "      activelyInProgress: !!aip && !aip.excluded,\n" +
      "      activelyInProgressExcluded: !!aip && !!aip.excluded,\n" +
      "      seenWatched: !!sw\n" +
      "    });\n" +
      "  });\n" +
      "  seenWatchedDelete = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
      "    const userId = Number(req.user);\n" +
      "    const mediaItemId = Number(req.params.mediaItemId);\n" +
      "    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }\n" +
      "    if (!mediaItemId) { res.status(400).json({ error: 'mediaItemId requerido' }); return; }\n" +
      "    const n = await _dbconfig.Database.knex('seen').where({ userId, mediaItemId, kind: 'watched' }).delete();\n" +
      "    res.json({ ok: true, removed: n });\n" +
      "  });\n";
    const anchor = '}\nexports.MediaItemController = MediaItemController;';
    if (!c.includes(anchor)) {
      console.error('item-flags combined: controller anchor not found'); process.exit(1);
    }
    c = c.replace(anchor, method + anchor);
    fs.writeFileSync(path, c);
    console.log('item-flags combined: controller endpoint added');
  }
}

// ===== Backend: routes =====
{
  const path = '/app/build/generated/routes/routes.js';
  let c = fs.readFileSync(path, 'utf8');
  if (c.includes("/api/item-flags/")) {
    console.log('item-flags combined: route already present');
  } else {
    // Anchor on a stable upstream route (same pattern other custom routes use).
    const anchor = "router.post('/api/catalog/cleanup'";
    if (!c.includes(anchor)) {
      console.error('item-flags combined: routes anchor not found'); process.exit(1);
    }
    const route =
      "router.get('/api/item-flags/:mediaItemId', validatorHandler({}), _MediaItemController.itemFlagsCombined);\n" +
      "router.delete('/api/seen/watched/:mediaItemId', validatorHandler({}), _MediaItemController.seenWatchedDelete);\n";
    c = c.replace(anchor, route + anchor);
    fs.writeFileSync(path, c);
    console.log('item-flags combined: route registered');
  }
}

// ===== Frontend: shared cache + replace _AB and _AIP fetches =====
{
  const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
  let c = fs.readFileSync(bundlePath, 'utf8');

  const marker = '/*mt-fork:item-flags-shared*/';
  if (c.includes(marker)) {
    console.log('item-flags combined: frontend already patched');
    process.exit(0);
  }

  // Helper that fetches once per mediaItemId and reuses the in-flight Promise.
  // Stored on window so both _AB and _AIP (defined as separate vars in the
  // same comma-chain) share it without needing imports. CRITICAL: must be a
  // single comma-separated expression with NO `;` — _AB sits inside a
  // `var foo=…,_AB=function(e){…},_AIP=…` declaration, so introducing `;`
  // breaks the parse. Wrapping in an IIFE returns void and integrates as one
  // expression, then a trailing comma keeps the var-decl chain intact.
  const helperDef =
    '_mtFlagsHelpersInit=(function(){' +
      'window._mtFetchItemFlags=function(id){' +
        'window._mtItemFlags=window._mtItemFlags||{};' +
        'if(window._mtItemFlags[id])return window._mtItemFlags[id];' +
        'window._mtItemFlags[id]=fetch("/api/item-flags/"+id,{credentials:"same-origin"})' +
          '.then(function(r){return r.json()})' +
          '.catch(function(){return{abandoned:false,activelyInProgress:false,activelyInProgressExcluded:false}});' +
        'return window._mtItemFlags[id]' +
      '};' +
      'window._mtBustItemFlags=function(id){if(window._mtItemFlags)delete window._mtItemFlags[id]};' +
      'return true' +
    '})(),';

  // Inject helper before _AB definition (right before _v).
  const helperAnchor = '_AB=function(e){';
  if (!c.includes(helperAnchor)) {
    console.error('item-flags combined: _AB anchor not found'); process.exit(1);
  }
  c = c.replace(helperAnchor, helperDef + helperAnchor);

  // Rewrite the load() body inside _AB to use the shared cache.
  const abLoadOld =
    'fetch("/api/abandoned",{credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){setA((d.items||[]).indexOf(mi.id)>=0)}).catch(function(){setA(false)})';
  const abLoadNew =
    'window._mtFetchItemFlags(mi.id).then(function(d){setA(!!d.abandoned)})';
  if (!c.includes(abLoadOld)) {
    console.error('item-flags combined: _AB load body anchor not found'); process.exit(1);
  }
  c = c.replace(abLoadOld, abLoadNew);

  // Rewrite the load() body inside _AIP.
  const aipLoadOld =
    'fetch("/api/actively-in-progress",{credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){setA((d.included||d.items||[]).indexOf(mi.id)>=0)}).catch(function(){setA(false)})';
  const aipLoadNew =
    'window._mtFetchItemFlags(mi.id).then(function(d){setA(!!d.activelyInProgress)})';
  if (!c.includes(aipLoadOld)) {
    console.error('item-flags combined: _AIP load body anchor not found'); process.exit(1);
  }
  c = c.replace(aipLoadOld, aipLoadNew);

  // Bust the shared cache after each toggle so the next mount sees fresh state.
  // _AB toggle invalidates queries via HW; add a cache bust there too.
  const abInvalidate =
    "try{HW.invalidateQueries([\"items\"])}catch(_){}; try{HW.invalidateQueries([\"details\",mi.id])}catch(_){};";
  if (c.includes(abInvalidate)) {
    c = c.replace(abInvalidate, 'window._mtBustItemFlags(mi.id);' + abInvalidate);
  }
  // _AIP toggle uses removeQueries; add cache bust there too.
  const aipInvalidate =
    'try{HW.removeQueries(["items"])}catch(_){}; try{HW.invalidateQueries(["items"])}catch(_){}; try{HW.removeQueries(["details",mi.id])}catch(_){};';
  if (c.includes(aipInvalidate)) {
    c = c.replace(aipInvalidate, 'window._mtBustItemFlags(mi.id);' + aipInvalidate);
  }

  c = marker + c;
  fs.writeFileSync(bundlePath, c);
  console.log('item-flags combined: _AB and _AIP now share one fetch per item');
}

// Sanity check the modified controller.
try {
  delete require.cache[require.resolve('/app/build/controllers/item.js')];
  require('/app/build/controllers/item.js');
  console.log('item-flags combined: syntax OK');
} catch (e) {
  console.error('item-flags combined: SYNTAX ERROR -> ' + e.message.slice(0, 300));
  process.exit(1);
}
