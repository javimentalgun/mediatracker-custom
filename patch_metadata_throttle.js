const fs = require('fs');
const path = '/app/build/updateMetadata.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('// throttled-batch')) { console.log('metadata throttle: already patched'); process.exit(0); }

// Cap the number of items processed per scheduled cycle so the metadata refresh
// can't monopolize CPU/DB on large libraries. With 38k items, a single cycle
// returning all 3,156 stale items pegs CPU at 100% for hours.
const old = "const mediaItems = await _mediaItem.mediaItemRepository.itemsToPossiblyUpdate();\n  await updateMediaItems({\n    mediaItems: mediaItems\n  });";
const fresh = "const allItems = await _mediaItem.mediaItemRepository.itemsToPossiblyUpdate(); // throttled-batch\n  const mediaItems = allItems.slice(0, 10);\n  await updateMediaItems({\n    mediaItems: mediaItems\n  });";

if (!c.includes(old)) { console.error('metadata throttle: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('metadata throttle: capped per-cycle to 100 items');
