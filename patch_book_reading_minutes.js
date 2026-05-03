// Compute "minutos leyendo" for the homepage summary as numberOfPages × 2,
// instead of using sum(seen.duration) — which is almost always 0 because the
// user doesn't enter per-session reading time.
//
// `item.numberOfPages` in userStatisticsSummary is already the SUM across all
// `seen` rows for books (pages-per-read summed), so re-reads correctly count
// twice. Two minutes/page is the assumption (≈ 30 min per 15-page chapter).

const fs = require('fs');
const path = '/app/build/controllers/statisticsController.js';
let c = fs.readFileSync(path, 'utf8');

const marker = '/* mt-fork: book-reading-minutes */';
if (c.includes(marker)) {
  console.log('book reading minutes: already patched');
  process.exit(0);
}

// The lodash mapValues callback computes `duration` per mediaType. Swap the
// book branch to derive minutes from pages.
const old = "item.mediaType === 'book' ? item.duration :";
const fresh = "item.mediaType === 'book' ? (item.numberOfPages || 0) * 2 " + marker + " :";

if (!c.includes(old)) {
  console.error('book reading minutes: anchor not found (statisticsController layout changed?)');
  process.exit(1);
}

c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('book reading minutes: book duration = pages × 2');

try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('book reading minutes: syntax OK');
} catch (e) {
  console.error('book reading minutes: SYNTAX ERROR ->', e.message.slice(0, 300));
  process.exit(1);
}
