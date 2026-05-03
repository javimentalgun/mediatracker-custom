const fs = require('fs');

// === 0. entity/seen.js: add 'kind' to seenColumns ===
// The base repository's create() does `_.pick(value, columnNames)` to filter
// allowed fields. Without 'kind' in the array, any kind we pass to create()
// gets silently stripped and the column DEFAULT 'played' kicks in — which is
// exactly why every "Marcar como visto" click was being recorded as kind=played.
{
  const path = '/app/build/entity/seen.js';
  let c = fs.readFileSync(path, 'utf8');
  const oldCols = "['date', 'id', 'mediaItemId', 'episodeId', 'userId', 'duration']";
  const newCols = "['date', 'id', 'mediaItemId', 'episodeId', 'userId', 'duration', 'kind']";
  if (c.includes("'kind'")) {
    console.log('seen kind wiring: entity already includes kind');
  } else if (c.includes(oldCols)) {
    c = c.replace(oldCols, newCols);
    fs.writeFileSync(path, c);
    console.log('seen kind wiring: entity seenColumns now includes kind');
  } else {
    console.error('seen kind wiring: entity seenColumns anchor not found');
    process.exit(1);
  }
}

// === 1. /api/seen handler: accept `kind` from query, default 'played' ===
{
  const path = '/app/build/controllers/seen.js';
  let c = fs.readFileSync(path, 'utf8');

  // 1a. Destructure: add `kind` to req.query unpack inside `add =`
  const destructOld = "const {\n      mediaItemId,\n      seasonId,\n      episodeId,\n      lastSeenAt,\n      lastSeenEpisodeId,\n      duration\n    } = req.query;";
  const destructNew = "const {\n      mediaItemId,\n      seasonId,\n      episodeId,\n      lastSeenAt,\n      lastSeenEpisodeId,\n      duration,\n      kind\n    } = req.query;";
  if (c.includes(destructNew)) {
    // already applied
  } else if (c.includes(destructOld)) {
    c = c.replace(destructOld, destructNew);
    console.log('seen kind wiring: /api/seen destructure now includes kind');
  } else {
    console.error('seen kind wiring: /api/seen destructure anchor not found');
    process.exit(1);
  }

  // 1b. addByExternalId: trx('seen').insert — add `kind` column
  const insOld = "await trx('seen').insert({\n        userId: userId,\n        mediaItemId: mediaItem.id,\n        episodeId: (episode === null || episode === void 0 ? void 0 : episode.id) || null,\n        date: Date.now(),\n        duration: duration\n      });";
  const insNew = "await trx('seen').insert({\n        userId: userId,\n        mediaItemId: mediaItem.id,\n        episodeId: (episode === null || episode === void 0 ? void 0 : episode.id) || null,\n        date: Date.now(),\n        duration: duration,\n        kind: kind || 'played'\n      });";
  if (c.includes(insNew)) {
    // already applied
  } else if (c.includes(insOld)) {
    c = c.replace(insOld, insNew);
    console.log('seen kind wiring: addByExternalId insert stores kind');
  }

  // 1c. addByExternalId: 12-hour dedupe — filter by kind so visto/played dedupe independently
  const dedupeOld = "const previousSeenItem = await trx('seen').where('userId', userId).where('mediaItemId', mediaItem.id).where('episodeId', (episode === null || episode === void 0 ? void 0 : episode.id) || null).where('date', '>', Date.now() - 1000 * 60 * 60 * 12);";
  const dedupeNew = "const previousSeenItem = await trx('seen').where('userId', userId).where('mediaItemId', mediaItem.id).where('episodeId', (episode === null || episode === void 0 ? void 0 : episode.id) || null).where('kind', kind || 'played').where('date', '>', Date.now() - 1000 * 60 * 60 * 12);";
  if (c.includes(dedupeNew)) {
    // already applied
  } else if (c.includes(dedupeOld)) {
    c = c.replace(dedupeOld, dedupeNew);
    console.log('seen kind wiring: addByExternalId dedupe is per-kind');
  }

  // 1d. add handler: non-TV (movies/games/books) seenRepository.create — add kind.
  // This is the path the "Marcar como visto" (_MAS) and "Marcar como completado"
  // buttons hit. Without this edit kind is silently dropped and every row
  // becomes kind='played' (the column DEFAULT).
  const createNonTvOld = "await _seen.seenRepository.create({\n            userId: userId,\n            mediaItemId: mediaItemId,\n            episodeId: null,\n            date: ((_date5 = date) === null || _date5 === void 0 ? void 0 : _date5.getTime()) || null,\n            duration: duration || null\n          });";
  const createNonTvNew = "await _seen.seenRepository.create({\n            userId: userId,\n            mediaItemId: mediaItemId,\n            episodeId: null,\n            date: ((_date5 = date) === null || _date5 === void 0 ? void 0 : _date5.getTime()) || null,\n            duration: duration || null,\n            kind: kind || 'played'\n          });";
  if (c.includes(createNonTvNew)) {
    // already applied
  } else if (c.includes(createNonTvOld)) {
    c = c.replace(createNonTvOld, createNonTvNew);
    console.log('seen kind wiring: add handler non-TV create now stores kind');
  } else {
    console.error('seen kind wiring: add handler non-TV create anchor not found');
    process.exit(1);
  }

  // 1e. add handler: episodeId path — add kind.
  const createEpOld = "await _seen.seenRepository.create({\n          userId: userId,\n          mediaItemId: mediaItemId,\n          episodeId: episodeId,\n          date: ((_date2 = date) === null || _date2 === void 0 ? void 0 : _date2.getTime()) || null\n        });";
  const createEpNew = "await _seen.seenRepository.create({\n          userId: userId,\n          mediaItemId: mediaItemId,\n          episodeId: episodeId,\n          date: ((_date2 = date) === null || _date2 === void 0 ? void 0 : _date2.getTime()) || null,\n          kind: kind || 'played'\n        });";
  if (c.includes(createEpNew)) {
    // already applied
  } else if (c.includes(createEpOld)) {
    c = c.replace(createEpOld, createEpNew);
    console.log('seen kind wiring: add handler episode create now stores kind');
  }

  // 1f. add handler: TV-show, seasonId, lastSeenEpisodeId createMany rows — add kind.
  // The "duration: ..." line appears at three different indents (10/12/14
  // spaces for lastSeenEpisodeId / seasonId / TV-show paths). One pass per
  // indent to preserve formatting.
  const durLine = "duration: episode.runtime * 60 * 1000 || mediaItem.runtime * 60 * 1000";
  const indents = ['          ', '            ', '              ']; // 10, 12, 14
  for (const ind of indents) {
    const oldL = ind + durLine + '\n';
    const newL = ind + durLine + ',\n' + ind + "kind: kind || 'played'\n";
    // Idempotent via the oldL match — once edited, the line ends in "..,\n"
    // and no longer matches oldL (which ends in "..\n").
    if (c.includes(oldL)) {
      c = c.replace(oldL, newL);
      console.log('seen kind wiring: createMany row at indent', ind.length, 'now stores kind');
    }
  }

  // 1g. Watchlist auto-removal: removed entirely. The four states (pendiente /
  // en curso / visto / completado) must be independent toggles — marking any
  // of them should not implicitly mutate the others. The user can clear the
  // watchlist explicitly via the "Quitar de pendientes" button.
  const wlOld = "if (mediaItem.mediaType !== 'tv') {\n        await _listItemRepository.listItemRepository.removeItem({\n          userId: userId,\n          mediaItemId: mediaItemId,\n          watchlist: true\n        });\n      }";
  const wlGate = "if (mediaItem.mediaType !== 'tv' && (kind || 'played') !== 'watched') {\n        await _listItemRepository.listItemRepository.removeItem({\n          userId: userId,\n          mediaItemId: mediaItemId,\n          watchlist: true\n        });\n      }";
  const wlNew = "/* mt-fork: states independent — no implicit watchlist mutation on /api/seen */";
  if (c.includes(wlNew)) {
    // already applied
  } else if (c.includes(wlOld)) {
    c = c.replace(wlOld, wlNew);
    console.log('seen kind wiring: add handler no longer removes from watchlist');
  } else if (c.includes(wlGate)) {
    // upgrade from the kind=watched-only gate
    c = c.replace(wlGate, wlNew);
    console.log('seen kind wiring: add handler no longer removes from watchlist (upgraded)');
  }

  // 1h. removeFromSeenHistory (DELETE /api/seen?mediaItemId=...): accept
  // optional `kind` query param so "Quitar completado" can delete only the
  // 'played' rows without nuking 'watched' rows (and vice-versa).
  const rmOld = "removeFromSeenHistory = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n    const userId = Number(req.user);\n    const {\n      mediaItemId,\n      seasonId,\n      episodeId\n    } = req.query;\n    if (episodeId) {\n      await _seen.seenRepository.delete({\n        userId: userId,\n        episodeId: episodeId\n      });\n    } else if (seasonId) {\n      await _seen.seenRepository.deleteForTvSeason({\n        userId: userId,\n        seasonId: seasonId\n      });\n    } else {\n      await _seen.seenRepository.delete({\n        userId: userId,\n        mediaItemId: mediaItemId\n      });\n    }\n    res.send();\n  });";
  const rmNew = "removeFromSeenHistory = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n    const userId = Number(req.user);\n    const {\n      mediaItemId,\n      seasonId,\n      episodeId,\n      kind\n    } = req.query;\n    if (episodeId) {\n      await _seen.seenRepository.delete({\n        userId: userId,\n        episodeId: episodeId,\n        kind: kind || undefined\n      });\n    } else if (seasonId) {\n      await _seen.seenRepository.deleteForTvSeason({\n        userId: userId,\n        seasonId: seasonId\n      });\n    } else {\n      await _seen.seenRepository.delete({\n        userId: userId,\n        mediaItemId: mediaItemId,\n        kind: kind || undefined\n      });\n    }\n    res.send();\n  });";
  if (c.includes("kind: kind || undefined")) {
    // already applied
  } else if (c.includes(rmOld)) {
    c = c.replace(rmOld, rmNew);
    console.log('seen kind wiring: removeFromSeenHistory accepts kind filter');
  } else {
    console.error('seen kind wiring: removeFromSeenHistory anchor not found');
    process.exit(1);
  }

  fs.writeFileSync(path, c);
}

// === 2. Eye-click _SE: send kind=watched ===
// (Eye on game cards was removed by patch_game_seen.js; this stays as a
// belt-and-braces edit in case the constant survives somewhere.)
{
  const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
  let c = fs.readFileSync(bundlePath, 'utf8');
  const oldUrl = '"/api/seen?mediaItemId="+e.id+"&lastSeenAt=now"';
  const newUrl = '"/api/seen?mediaItemId="+e.id+"&lastSeenAt=now&kind=watched"';
  if (c.includes('&kind=watched')) {
    console.log('seen kind wiring: eye-click already sends kind=watched');
  } else if (c.includes(oldUrl)) {
    c = c.replace(oldUrl, newUrl);
    fs.writeFileSync(bundlePath, c);
    console.log('seen kind wiring: eye-click _SE now sends kind=watched');
  } else {
    console.log('seen kind wiring: eye-click anchor not found (skipping)');
  }
}

// === 3. items.js: support onlyPlayed and onlyWatched filters (using seen.kind) ===
{
  const path = '/app/build/knex/queries/items.js';
  let c = fs.readFileSync(path, 'utf8');
  // Guard must check the destructure specifically — `onlyPlayed` alone also appears
  // in the count fast-path injected by patch_items_simple_count.js, which would
  // make this whole block a no-op even though the args destructure is missing.
  if (/onlyPlayed,\s*onlyWatched\s*\}\s*=\s*args;/.test(c)) {
    console.log('seen kind wiring: items.js already supports onlyPlayed/onlyWatched');
  } else {
    // Strip prior onlyKind injection if it exists
    c = c.replace(",\n    onlyKind", "");
    c = c.replace(/    if \(onlyKind === 'played' \|\| onlyKind === 'watched'\) \{[\s\S]*?\}\n    /, '    ');
    // Add to args destructure. Order-independent: handles whichever variable
    // happens to be last when this patch runs (onlyDownloaded if items_only_downloaded
    // ran first, otherwise onlyWithProgress). Both anchors live inside getItemsKnexSql
    // — the other `} = args;` in the file is `getItemsKnex`'s `{ page }` destructure.
    if (c.includes("onlyDownloaded\n  } = args;")) {
      c = c.replace("onlyDownloaded\n  } = args;", "onlyDownloaded,\n    onlyPlayed,\n    onlyWatched\n  } = args;");
    } else if (c.includes("onlyWithProgress\n  } = args;")) {
      c = c.replace("onlyWithProgress\n  } = args;", "onlyWithProgress,\n    onlyPlayed,\n    onlyWatched\n  } = args;");
    } else {
      console.error('seen kind wiring: items.js destructure anchor not found');
      process.exit(1);
    }
    // Add filter clauses near onlySeenItems (truthy on string|bool|number)
    const anchor = "if (onlySeenItems === true || onlySeenItems === 'true' || onlySeenItems === 1) {";
    const inject =
      "if (onlyPlayed === true || onlyPlayed === 'true' || onlyPlayed === 1) {\n" +
      "      query.whereExists(function() { this.from('seen').where('seen.userId', userId).where('seen.kind', 'played').whereRaw('seen.mediaItemId = mediaItem.id'); });\n" +
      "    }\n" +
      "    if (onlyWatched === true || onlyWatched === 'true' || onlyWatched === 1) {\n" +
      "      query.whereExists(function() { this.from('seen').where('seen.userId', userId).where('seen.kind', 'watched').whereRaw('seen.mediaItemId = mediaItem.id'); });\n" +
      "    }\n" +
      "    " + anchor;
    if (c.includes(anchor)) c = c.replace(anchor, inject);
    fs.writeFileSync(path, c);
    console.log('seen kind wiring: items.js accepts onlyPlayed and onlyWatched');
  }
}
