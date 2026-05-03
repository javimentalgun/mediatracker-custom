// React Query defaults: add staleTime (30s) so navigating between pages
// doesn't refetch every list immediately. keepPreviousData was already on.
// Keeps the UI snappy on back/forward without showing stale-for-too-long data.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:rq-stale*/';
if (c.includes(marker)) {
  console.log('query cache tuning: already patched');
  process.exit(0);
}

const old = 'queries:{queryFn:function(e){return console.log(e),null},keepPreviousData:!0,';
const fresh = 'queries:{queryFn:function(e){return console.log(e),null},keepPreviousData:!0,staleTime:30000,' + marker;
if (!c.includes(old)) {
  console.error('query cache tuning: anchor not found'); process.exit(1);
}
c = c.replace(old, fresh);
fs.writeFileSync(bundlePath, c);
console.log('query cache tuning: staleTime=30s added to QueryClient defaults');
