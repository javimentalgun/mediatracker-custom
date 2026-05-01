const fs = require('fs');

// 1. Add `onlyDownloaded` to the controller's destructure + pass-through
const ctrlPath = '/app/build/controllers/items.js';
let ctrl = fs.readFileSync(ctrlPath, 'utf8');
if (!ctrl.includes('onlyDownloaded')) {
  // Two destructure lines (paginated + non-paginated) — patch both
  ctrl = ctrl.replace(/onlyWithProgress\n    \} = req\.query;/g, 'onlyWithProgress,\n      onlyDownloaded\n    } = req.query;');
  ctrl = ctrl.replace(/onlyWithProgress: onlyWithProgress\n    /g, 'onlyWithProgress: onlyWithProgress,\n      onlyDownloaded: onlyDownloaded\n    ');
  fs.writeFileSync(ctrlPath, ctrl);
  console.log('items only-downloaded: controller wired');
} else {
  console.log('items only-downloaded: controller already wired');
}

// 2. Add `onlyDownloaded` to items query (filter clause + count fast-path)
const qPath = '/app/build/knex/queries/items.js';
let q = fs.readFileSync(qPath, 'utf8');
if (q.includes('onlyDownloaded')) {
  console.log('items only-downloaded: query already patched');
  process.exit(0);
}

// Add to args destructure. Order-independent: if patch_seen_kind_wiring.js already
// extended the destructure with onlyPlayed/onlyWatched, the original anchor won't
// match — fall back to inserting after onlyWatched. Otherwise insert after onlyWithProgress.
if (q.includes("onlyWatched\n  } = args;")) {
  q = q.replace(
    "onlyWatched\n  } = args;",
    "onlyWatched,\n    onlyDownloaded\n  } = args;"
  );
} else if (q.includes("onlyWithProgress\n  } = args;")) {
  q = q.replace(
    "onlyWithProgress\n  } = args;",
    "onlyWithProgress,\n    onlyDownloaded\n  } = args;"
  );
} else {
  console.error('items only-downloaded: query destructure anchor not found');
  process.exit(1);
}

// Add filter clause near the other filter blocks. Insert after onlyWithProgress block.
const filterAnchor = "if (onlyWithProgress) {";
const idx = q.indexOf(filterAnchor);
if (idx < 0) { console.error('items only-downloaded: filter anchor not found'); process.exit(1); }
// Find end of the block (matching brace)
let depth = 0, end = idx + filterAnchor.length;
for (; end < q.length; end++) {
  if (q[end] === '{') depth++;
  else if (q[end] === '}') { if (depth === 0) { end++; break; } depth--; }
}
const inject = "\n      if (onlyDownloaded) {\n        query.where('mediaItem.downloaded', true);\n      }";
q = q.slice(0, end) + inject + q.slice(end);

// Add count fast-path
const countAnchor = "} else if (onlyWithProgress) {";
const countIdx = q.indexOf(countAnchor);
if (countIdx < 0) { console.error('items only-downloaded: count anchor not found'); process.exit(1); }
const countInject = "} else if (onlyDownloaded) {\n    sqlCountQuery = _knex('mediaItem').modify(_applyMt).where('downloaded', true).count('* as count');\n  ";
q = q.slice(0, countIdx) + countInject + q.slice(countIdx);

fs.writeFileSync(qPath, q);
console.log('items only-downloaded: filter + count fast-path added');
