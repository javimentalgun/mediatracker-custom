const fs = require('fs');

// Add `excludeAbandoned` and `onlyAbandoned` filters to the items query.
// - excludeAbandoned: drops items where the user has an `abandoned` row.
//   Used by the Pendiente page so abandoned items don't show.
// - onlyAbandoned: keeps only those items. Used by the new /abandonados page.
//
// Also patch the controller's req.query destructure so the params reach the
// query function.

// === 1. items.js: add filters to destructure + apply WHERE clauses ===
{
  const p = '/app/build/knex/queries/items.js';
  let c = fs.readFileSync(p, 'utf8');

  if (c.includes('// mt-fork: abandoned-filter')) {
    console.log('abandoned filter (items.js): already patched');
  } else {
    // Add to args destructure. Last var depends on patch order (onlyWatched if
    // seen_kind_wiring ran first, onlyDownloaded otherwise).
    if (c.includes("onlyDownloaded\n  } = args;")) {
      c = c.replace(
        "onlyDownloaded\n  } = args;",
        "onlyDownloaded,\n    excludeAbandoned,\n    onlyAbandoned\n  } = args;"
      );
    } else if (c.includes("onlyWatched\n  } = args;")) {
      c = c.replace(
        "onlyWatched\n  } = args;",
        "onlyWatched,\n    excludeAbandoned,\n    onlyAbandoned\n  } = args;"
      );
    } else {
      console.error('abandoned filter: items.js destructure anchor not found');
      process.exit(1);
    }

    // Apply WHERE clauses. Insert after the onlyDownloaded block.
    const filterAnchor =
      "      if (onlyDownloaded) {\n" +
      "        query.where('mediaItem.downloaded', true);\n" +
      "      }";
    const filterInjection = filterAnchor +
      "\n      // mt-fork: abandoned-filter\n" +
      "      if (excludeAbandoned === true || excludeAbandoned === 'true' || excludeAbandoned === 1) {\n" +
      "        query.whereNotExists(function() { this.from('abandoned').where('abandoned.userId', userId).whereRaw('abandoned.mediaItemId = mediaItem.id'); });\n" +
      "      }\n" +
      "      if (onlyAbandoned === true || onlyAbandoned === 'true' || onlyAbandoned === 1) {\n" +
      "        query.whereExists(function() { this.from('abandoned').where('abandoned.userId', userId).whereRaw('abandoned.mediaItemId = mediaItem.id'); });\n" +
      "      }";

    if (!c.includes(filterAnchor)) {
      console.error('abandoned filter: filter-anchor (onlyDownloaded block) not found');
      process.exit(1);
    }
    c = c.replace(filterAnchor, filterInjection);
    fs.writeFileSync(p, c);
    console.log('abandoned filter (items.js): destructure + WHERE clauses added');
  }
}

// === 2. controllers/items.js: pass-through from req.query ===
{
  const p = '/app/build/controllers/items.js';
  let c = fs.readFileSync(p, 'utf8');

  if (c.includes('excludeAbandoned')) {
    console.log('abandoned filter (controllers/items.js): already patched');
  } else {
    // Two destructure lines (paginated + non-paginated). Add excludeAbandoned + onlyAbandoned to both.
    c = c.replace(/onlyDownloaded\n    \} = req\.query;/g, 'onlyDownloaded,\n      excludeAbandoned,\n      onlyAbandoned\n    } = req.query;');
    c = c.replace(/onlyDownloaded: onlyDownloaded\n    /g, 'onlyDownloaded: onlyDownloaded,\n      excludeAbandoned: excludeAbandoned,\n      onlyAbandoned: onlyAbandoned\n    ');
    fs.writeFileSync(p, c);
    console.log('abandoned filter (controllers/items.js): added excludeAbandoned + onlyAbandoned pass-through');
  }
}
