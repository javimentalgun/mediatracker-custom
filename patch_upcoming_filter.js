const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Upcoming page (ay): drop the onlyOnWatchlist filter so it shows ALL future items in the library
const old = 'ay=function(){return r.createElement(Zv,{args:{orderBy:"nextAiring",sortOrder:"asc",onlyOnWatchlist:!0,onlyWithNextAiring:!0}';
const fresh = 'ay=function(){return r.createElement(Zv,{args:{orderBy:"nextAiring",sortOrder:"asc",onlyWithNextAiring:!0}';

if (c.includes(fresh)) {
  console.log('upcoming filter: already relaxed');
} else if (!c.includes(old)) {
  console.error('upcoming filter: anchor not found'); process.exit(1);
} else {
  c = c.replace(old, fresh);
  console.log('upcoming filter: removed onlyOnWatchlist; now shows all future items in library');
}

fs.writeFileSync(bundlePath, c);
