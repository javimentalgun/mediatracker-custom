// Bug: on the detail page, _AB / _AIP / _MAS each render `null` until their
// async fetch to /api/item-flags resolves, so the buttons pop in late — the
// user sees them appear at the same time as the cover image, not with the
// rest of the static action buttons.
//
// Fix: include the three flags inline in the /api/details/:id response. The
// button components initialize useState from `mi.<flag>` so they render
// synchronously with the rest of the page; the explicit /api/item-flags fetch
// becomes a stale-revalidate, not a blocker.
//
// Edits:
//   1. controllers/item.js: wrap the `details` handler to merge in
//      { abandoned, activelyInProgress, seenWatched } via three small queries
//      in parallel (cheap — single-row exists checks against indexed columns).
//   2. main bundle: change each button's useState(null) initializer to read
//      from `mi.<flag>` when present.

const fs = require('fs');
const child = require('child_process');

// ===== Backend =====
{
  const path = '/app/build/controllers/item.js';
  let c = fs.readFileSync(path, 'utf8');

  if (c.includes('/* mt-fork: details-includes-flags */')) {
    console.log('details-includes-flags: controller already patched');
  } else {
    const oldBlock =
      "    const details = await _mediaItem.mediaItemRepository.details({\n" +
      "      mediaItemId: mediaItemId,\n" +
      "      userId: userId\n" +
      "    });\n" +
      "    res.send(details);";
    const newBlock =
      "    /* mt-fork: details-includes-flags */\n" +
      "    const details = await _mediaItem.mediaItemRepository.details({\n" +
      "      mediaItemId: mediaItemId,\n" +
      "      userId: userId\n" +
      "    });\n" +
      "    if (details) {\n" +
      "      const _knex = _dbconfig.Database.knex;\n" +
      "      const [_ab, _aip, _sw] = await Promise.all([\n" +
      "        _knex('abandoned').where({ userId, mediaItemId }).first(),\n" +
      "        _knex('activelyInProgress').where({ userId, mediaItemId }).first(),\n" +
      "        _knex('seen').where({ userId, mediaItemId, kind: 'watched' }).first()\n" +
      "      ]);\n" +
      "      details.abandoned = !!_ab;\n" +
      "      details.activelyInProgress = !!_aip && !_aip.excluded;\n" +
      "      details.activelyInProgressExcluded = !!_aip && !!_aip.excluded;\n" +
      "      details.seenWatched = !!_sw;\n" +
      "    }\n" +
      "    res.send(details);";
    if (!c.includes(oldBlock)) {
      console.error('details-includes-flags: details handler anchor not found');
      process.exit(1);
    }
    c = c.replace(oldBlock, newBlock);
    fs.writeFileSync(path, c);
    console.log('details-includes-flags: details handler now returns flags inline');
  }
}

// ===== Frontend: initialize each button's useState from mi.<flag> =====
{
  const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
  let c = fs.readFileSync(bundlePath, 'utf8');

  const marker = '/*mt-fork:flags-prehydrated*/';
  if (c.includes(marker)) {
    console.log('details-includes-flags: bundle already patched');
  } else {
  // _AB: useState(null) → useState(mi.abandoned!=null?!!mi.abandoned:null)
  const abOld = "_AB=function(e){var mi=e.mediaItem;var _s=r.useState(null),abandoned=_s[0],setA=_s[1];";
  const abNew = "_AB=function(e){var mi=e.mediaItem;var _s=r.useState(mi.abandoned!=null?!!mi.abandoned:null),abandoned=_s[0],setA=_s[1];";
  if (!c.includes(abOld)) {
    console.error('details-includes-flags: _AB anchor not found');
    process.exit(1);
  }
  c = c.replace(abOld, abNew);

  // _AIP: useState(null) → useState(mi.activelyInProgress!=null?!!mi.activelyInProgress:null)
  const aipOld = "_AIP=function(e){/*mt-fork:actively-in-progress*/var mi=e.mediaItem;var _s=r.useState(null),active=_s[0],setA=_s[1];";
  const aipNew = "_AIP=function(e){/*mt-fork:actively-in-progress*/var mi=e.mediaItem;var _s=r.useState(mi.activelyInProgress!=null?!!mi.activelyInProgress:null),active=_s[0],setA=_s[1];";
  if (!c.includes(aipOld)) {
    console.error('details-includes-flags: _AIP anchor not found');
    process.exit(1);
  }
  c = c.replace(aipOld, aipNew);

  // _MAS: useState(null) → useState(mi.seenWatched!=null?!!mi.seenWatched:null)
  const masOld = "_MAS=function(e){/*mt-fork:mark-watched-btn*/var mi=e.mediaItem;var _s=r.useState(null),seen=_s[0],setS=_s[1];";
  const masNew = "_MAS=function(e){/*mt-fork:mark-watched-btn*/var mi=e.mediaItem;var _s=r.useState(mi.seenWatched!=null?!!mi.seenWatched:null),seen=_s[0],setS=_s[1];";
  if (!c.includes(masOld)) {
    console.error('details-includes-flags: _MAS anchor not found');
    process.exit(1);
  }
  c = c.replace(masOld, masNew);

  c = marker + c;
  fs.writeFileSync(bundlePath, c);
  console.log('details-includes-flags: _AB / _AIP / _MAS now hydrate from mi.* on first render');
  }
}

// Sanity check: the controller must still parse.
try {
  delete require.cache[require.resolve('/app/build/controllers/item.js')];
  require('/app/build/controllers/item.js');
  console.log('details-includes-flags: controller syntax OK');
} catch (e) {
  console.error('details-includes-flags: SYNTAX ERROR -> ' + e.message.slice(0, 300));
  process.exit(1);
}
