const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Recently released home slider:
//   - Remove onlyOnWatchlist filter (show all library)
//   - Extend the recency window from 30 → 90 days
const oldQuery = 'n=dg({orderBy:"lastAiring",sortOrder:"desc",page:1,onlyOnWatchlist:!0,onlySeenItems:!1}).items';
const newQuery = 'n=dg({orderBy:"lastAiring",sortOrder:"desc",page:1,onlySeenItems:!1}).items';

const oldFilter = 'return new Date(e.lastAiring)>ss(new Date,30)';
const newFilter = 'return new Date(e.lastAiring)>ss(new Date,90)';

if (c.includes(newQuery) && c.includes(newFilter)) {
  console.log('recently released: already patched');
  process.exit(0);
}

if (c.includes(oldQuery)) {
  c = c.replace(oldQuery, newQuery);
  console.log('recently released: removed onlyOnWatchlist filter');
}
if (c.includes(oldFilter)) {
  c = c.replace(oldFilter, newFilter);
  console.log('recently released: extended window 30→90 days');
}

fs.writeFileSync(bundlePath, c);
