const fs = require('fs');
const child = require('child_process');

// Rename the hardcoded "En progreso" heading on /in-progress to "En proceso"
// (which is also the default Spanish i18n value for the "In progress" key, so
// the menu and the page heading stay in sync). Path remains /in-progress to
// avoid breaking bookmarks/PWA.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:rename-inprogress*/';
if (c.includes(marker)) {
  console.log('rename inprogress: already patched');
  process.exit(0);
}

let changed = 0;

// Hardcoded heading on /in-progress page: "En progreso" → "En proceso".
const oldHeading = '"text-2xl mb-4 px-2"},"En progreso")';
const newHeading = '"text-2xl mb-4 px-2"},"En proceso")';
if (c.includes(oldHeading)) {
  c = c.replace(oldHeading, newHeading);
  changed++;
  console.log('rename inprogress: page heading → En proceso');
} else {
  console.log('rename inprogress: page heading anchor not found (skipping)');
}

if (changed === 0) {
  console.error('rename inprogress: no anchors matched — upstream may have changed both the heading and the ES i18n');
  process.exit(1);
}

c = marker + c;
fs.writeFileSync(bundlePath, c);
console.log('rename inprogress: complete (' + changed + ' replacement' + (changed === 1 ? '' : 's') + ')');
