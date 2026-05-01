const fs = require('fs');

// === 1. /api/seen handler: accept `kind` from query, default 'played' ===
{
  const path = '/app/build/controllers/seen.js';
  let c = fs.readFileSync(path, 'utf8');
  if (!c.includes('kind: kind || ')) {
    // Anchor: the destructure of req.query inside `add =`
    const old = "const {\n      mediaItemId,\n      seasonId,\n      episodeId,\n      lastSeenAt,\n      lastSeenEpisodeId,\n      duration\n    } = req.query;";
    const fresh = "const {\n      mediaItemId,\n      seasonId,\n      episodeId,\n      lastSeenAt,\n      lastSeenEpisodeId,\n      duration,\n      kind\n    } = req.query;";
    if (c.includes(old)) c = c.replace(old, fresh);

    // Anchor: the trx('seen').insert call — add `kind` column
    const ins = "await trx('seen').insert({\n        userId: userId,\n        mediaItemId: mediaItem.id,\n        episodeId: (episode === null || episode === void 0 ? void 0 : episode.id) || null,\n        date: Date.now(),\n        duration: duration\n      });";
    const insNew = "await trx('seen').insert({\n        userId: userId,\n        mediaItemId: mediaItem.id,\n        episodeId: (episode === null || episode === void 0 ? void 0 : episode.id) || null,\n        date: Date.now(),\n        duration: duration,\n        kind: kind || 'played'\n      });";
    if (c.includes(ins)) c = c.replace(ins, insNew);

    fs.writeFileSync(path, c);
    console.log('seen kind wiring: /api/seen handler accepts and stores `kind`');
  } else {
    console.log('seen kind wiring: /api/seen already wired');
  }
}

// === 2. Eye-click _SE: send kind=watched ===
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
