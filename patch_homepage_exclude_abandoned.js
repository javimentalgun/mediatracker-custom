// "Recently released" on the homepage was leaking dropped/abandoned items AND
// already-completed items (TVs with all episodes seen, movies/games/books
// already marked as seen). Two coordinated changes:
//   1. Backend: add excludeAbandoned to the dg(...) query — server-side filter
//      from patch_abandoned_filter.js drops abandoned items at the source.
//   2. Client: extend the existing n.filter() to also drop e.seen (which is
//      computed in items.js as "all episodes seen for TV / lastSeen for non-TV").

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:home-recent-noaband-noseen*/';
if (c.includes(marker)) {
  console.log('homepage recently released filter: already patched');
  process.exit(0);
}

// 1. Backend: excludeAbandoned in the query args.
const oldQ = 'dg({orderBy:"lastAiring",sortOrder:"desc",page:1,onlySeenItems:!1})';
const freshQ = 'dg({orderBy:"lastAiring",sortOrder:"desc",page:1,onlySeenItems:!1,excludeAbandoned:!0})';
if (!c.includes(oldQ)) {
  console.error('homepage recently released filter: dg() anchor not found'); process.exit(1);
}
c = c.replace(oldQ, freshQ);

// 2. Client: append `&& !e.seen` to the existing client-side filter that limits to last 90 days.
const oldFilter = 'n.filter((function(e){return new Date(e.lastAiring)>ss(new Date,90)}))';
const freshFilter = 'n.filter((function(e){return new Date(e.lastAiring)>ss(new Date,90)&&!e.seen}))' + marker;
if (!c.includes(oldFilter)) {
  console.error('homepage recently released filter: n.filter anchor not found'); process.exit(1);
}
c = c.replace(oldFilter, freshFilter);

fs.writeFileSync(bundlePath, c);
console.log('homepage recently released filter: now excludes abandoned + completed items');
