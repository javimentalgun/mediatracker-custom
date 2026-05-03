// The four item states (pendiente / en curso / visto / completado) must be
// independent toggles — clicking one button must not implicitly mutate the
// others. Upstream `addItem` in progress.js auto-adds to the watchlist when
// progress<1 and auto-removes when progress===1; that means "Quitar
// completado" (which sets progress=0) silently adds the item back to
// Pendientes. Strip both branches.

const fs = require('fs');
const path = '/app/build/controllers/progress.js';
let c = fs.readFileSync(path, 'utf8');

const marker = '/* mt-fork: states-independent — no implicit watchlist mutation */';

if (c.includes(marker)) {
  console.log('states-independent: already patched');
  process.exit(0);
}

const oldBlock =
  "  if (args.progress < 1) {\n" +
  "    await _listItemRepository.listItemRepository.addItem({\n" +
  "      userId: args.userId,\n" +
  "      mediaItemId: args.mediaItemId,\n" +
  "      watchlist: true\n" +
  "    });\n" +
  "  } else if (args.progress === 1 && args.episodeId == undefined) {\n" +
  "    await _listItemRepository.listItemRepository.removeItem({\n" +
  "      userId: args.userId,\n" +
  "      mediaItemId: args.mediaItemId,\n" +
  "      watchlist: true\n" +
  "    });\n" +
  "  }";

if (!c.includes(oldBlock)) {
  console.error('states-independent: addItem watchlist anchor not found');
  process.exit(1);
}

c = c.replace(oldBlock, '  ' + marker);
fs.writeFileSync(path, c);
console.log('states-independent: progress.addItem no longer mutates watchlist');
