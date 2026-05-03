// Add a "Solo visto" / "Just watched" filter (games-only). While at it, fix
// upstream's broken pass-through: the items controller never forwarded
// onlyWatched/onlyPlayed to the repository, so the existing "Played" and
// "Visto" dropdown entries didn't actually filter — they only changed the
// header count (because the count fast-path *did* read the flags).
//
// Coordinated edits:
//   1. controllers/items.js: destructure onlyWatched, onlyPlayed, onlyJustWatched
//      from req.query and forward to mediaItemRepository.items({...}). Both
//      getPaginated and get handlers.
//   2. knex/queries/items.js: destructure onlyJustWatched (onlyWatched/onlyPlayed
//      already destructured upstream); apply WHERE clauses for all three; add
//      a count fast-path branch for onlyJustWatched.
//   3. main bundle (frontend): inject {onlyJustWatched:"Just watched"} into the
//      filter dropdown for games. The xo._("Just watched") key already exists
//      in patch_i18n_custom.js (ES: "Solo visto").

const fs = require('fs');
const child = require('child_process');

// ===== Backend: controllers/items.js =====
{
  const path = '/app/build/controllers/items.js';
  let c = fs.readFileSync(path, 'utf8');

  if (c.includes('// mt-fork: only-watched-passthrough')) {
    console.log('only just watched (controllers/items.js): already patched');
  } else {
    // Two destructures (getPaginated + get): both end with `onlyAbandoned\n    } = req.query;`.
    const destrRe = /(\n\s+)(onlyAbandoned)(\s*\n\s*\}\s*=\s*req\.query;)/g;
    const destrMatches = c.match(destrRe);
    if (!destrMatches || destrMatches.length === 0) {
      console.error('only just watched (controllers): destructure anchor not found'); process.exit(1);
    }
    c = c.replace(destrRe, (_, ws, last, tail) =>
      `${ws}${last},${ws}onlyWatched,${ws}onlyPlayed,${ws}onlyJustWatched${tail}`
    );

    // Two `mediaItemRepository.items({ ... })` calls — append the three flags
    // before the closing `})`. Anchor on `onlyAbandoned: onlyAbandoned\n    });`.
    const callRe = /(onlyAbandoned: onlyAbandoned)(\s*\n\s*\}\);)/g;
    const callMatches = c.match(callRe);
    if (!callMatches || callMatches.length === 0) {
      console.error('only just watched (controllers): items() call anchor not found'); process.exit(1);
    }
    c = c.replace(callRe, (_, body, tail) =>
      body + ',\n      onlyWatched: onlyWatched,\n      onlyPlayed: onlyPlayed,\n      onlyJustWatched: onlyJustWatched' + tail
    );

    c = '// mt-fork: only-watched-passthrough\n' + c;
    fs.writeFileSync(path, c);
    console.log('only just watched (controllers/items.js): forwarded onlyWatched/Played/JustWatched (' + destrMatches.length + ' destructures, ' + callMatches.length + ' calls)');
  }
}

// ===== Backend: knex/queries/items.js =====
{
  const path = '/app/build/knex/queries/items.js';
  let c = fs.readFileSync(path, 'utf8');

  if (c.includes('// mt-fork: only-just-watched')) {
    console.log('only just watched (items.js): already patched');
  } else {
    // Add onlyJustWatched to the args destructure (last identifier before `} = args;`).
    const destrRe = /(\n\s+)(onlyAbandoned|onlyDownloaded|onlyWatched)(\s*\n\s*\}\s*=\s*args;)/;
    const m = c.match(destrRe);
    if (!m) {
      console.error('only just watched (items.js): destructure anchor not found'); process.exit(1);
    }
    c = c.replace(destrRe, `${m[1]}${m[2]},${m[1]}onlyJustWatched${m[3]}`);

    // Apply WHERE clauses for onlyWatched, onlyPlayed, onlyJustWatched.
    // Anchor: end of the abandoned-filter block (which is the last filter currently applied).
    const whereAnchor = "if (onlyAbandoned === true || onlyAbandoned === 'true' || onlyAbandoned === 1) {\n        query.whereExists(function() { this.from('abandoned').where('abandoned.userId', userId).whereRaw('abandoned.mediaItemId = mediaItem.id'); });\n      }";
    if (!c.includes(whereAnchor)) {
      console.error('only just watched (items.js): WHERE anchor not found'); process.exit(1);
    }
    const whereInject = whereAnchor +
      "\n      // mt-fork: pass-through onlyWatched / onlyPlayed (upstream had them in count only)\n" +
      "      if (onlyWatched === true || onlyWatched === 'true' || onlyWatched === 1) {\n" +
      "        query.whereExists(function() { this.from('seen').whereRaw('seen.mediaItemId = mediaItem.id').where('seen.userId', userId).where('seen.kind', 'watched'); });\n" +
      "      }\n" +
      "      if (onlyPlayed === true || onlyPlayed === 'true' || onlyPlayed === 1) {\n" +
      "        query.whereExists(function() { this.from('seen').whereRaw('seen.mediaItemId = mediaItem.id').where('seen.userId', userId).where('seen.kind', 'played'); });\n" +
      "      }\n" +
      "      // mt-fork: only-just-watched — kind='watched' AND no kind='played'\n" +
      "      if (onlyJustWatched === true || onlyJustWatched === 'true' || onlyJustWatched === 1) {\n" +
      "        query.whereExists(function() { this.from('seen').whereRaw('seen.mediaItemId = mediaItem.id').where('seen.userId', userId).where('seen.kind', 'watched'); });\n" +
      "        query.whereNotExists(function() { this.from('seen').whereRaw('seen.mediaItemId = mediaItem.id').where('seen.userId', userId).where('seen.kind', 'played'); });\n" +
      "      }";
    c = c.replace(whereAnchor, whereInject);

    // Count fast-path: mirror onlyWatched but with the extra whereNotExists.
    const countAnchor = "  } else if (onlyWatched) {\n    sqlCountQuery = _knex('mediaItem').modify(_applyMt)\n      .whereExists(qb => qb.from('seen').whereRaw('seen.mediaItemId = mediaItem.id').where('seen.userId', userId).where('seen.kind', 'watched'))\n      .count('* as count');";
    if (!c.includes(countAnchor)) {
      console.error('only just watched (items.js): count fast-path anchor not found'); process.exit(1);
    }
    const countInject = countAnchor +
      "\n  } else if (onlyJustWatched) {\n" +
      "    sqlCountQuery = _knex('mediaItem').modify(_applyMt)\n" +
      "      .whereExists(qb => qb.from('seen').whereRaw('seen.mediaItemId = mediaItem.id').where('seen.userId', userId).where('seen.kind', 'watched'))\n" +
      "      .whereNotExists(qb => qb.from('seen').whereRaw('seen.mediaItemId = mediaItem.id').where('seen.userId', userId).where('seen.kind', 'played'))\n" +
      "      .count('* as count');";
    c = c.replace(countAnchor, countInject);

    c = '// mt-fork: only-just-watched\n' + c;
    fs.writeFileSync(path, c);
    console.log('only just watched (items.js): destructure + WHERE (3 filters) + count branch added');
  }
}

// ===== Frontend =====
{
  const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
  let c = fs.readFileSync(bundlePath, 'utf8');

  const marker = '/*mt-fork:filter-only-just-watched*/';
  if (c.includes(marker)) {
    console.log('only just watched (frontend): already patched');
  } else {
    // The games filter dropdown stays as upstream (one "Visto" option, no
    // sibling "Solo visto"). The backend filter and pass-through stay in
    // place — onlyJustWatched is reachable via URL ?onlyJustWatched=true
    // until we ship a proper sub-dropdown nested under "Visto".
    c = marker + c;
    fs.writeFileSync(bundlePath, c);
    console.log('only just watched (frontend): kept dropdown as upstream (no extra entry); backend filter still wired');
  }
}
