// React-Query default staleTime is 0, so every Zv mount re-fetches /api/items
// even when the same args were just fetched. On the games "Visto" filter the
// page renders three Zv instances (parent + two split sections) and a quick
// re-render pulls 3 sets of network requests + image reflows that look like
// covers "updating multiple times".
//
// Bump staleTime to 60s and cacheTime to 5 min so revisits within that window
// hit the cache. keepPreviousData stays so filter/page changes don't blank
// the grid while loading.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:items-query-cache*/';
if (c.includes(marker)) {
  console.log('items-query-cache: already patched');
  process.exit(0);
}

// Anchor: dg's useQuery options object — appears immediately after
// `Se.items.paginated(e)` in the await wrapper.
const old = 'Se.items.paginated(e));case 1:case"end":return t.stop()}}),t)}))),{keepPreviousData:!0})';
const fresh = 'Se.items.paginated(e));case 1:case"end":return t.stop()}}),t)}))),{keepPreviousData:!0,staleTime:60000,cacheTime:300000}' + marker + ')';

if (!c.includes(old)) {
  console.error('items-query-cache: dg useQuery anchor not found'); process.exit(1);
}
c = c.replace(old, fresh);
fs.writeFileSync(bundlePath, c);
console.log('items-query-cache: dg useQuery now has staleTime=60s, cacheTime=5m');
