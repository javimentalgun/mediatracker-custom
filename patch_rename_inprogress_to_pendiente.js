const fs = require('fs');
const child = require('child_process');

// Rename "En progreso" / "In progress" to "Pendiente" for the user-visible text:
//   - hardcoded h2 heading on /in-progress page  ("En progreso" → "Pendiente")
//   - Spanish i18n value for the "In progress" key  ("En proceso" → "Pendiente")
// Path stays /in-progress (route rename would break bookmarks/PWA).

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:rename-inprogress*/';
if (c.includes(marker)) {
  console.log('rename inprogress: already patched');
  process.exit(0);
}

let changed = 0;

// 1. Hardcoded heading on /in-progress page.
const oldHeading = '"text-2xl mb-4 px-2"},"En progreso")';
const newHeading = '"text-2xl mb-4 px-2"},"Pendiente")';
if (c.includes(oldHeading)) {
  c = c.replace(oldHeading, newHeading);
  changed++;
  console.log('rename inprogress: page heading → Pendiente');
} else {
  console.log('rename inprogress: page heading anchor not found (skipping)');
}

// 2. Spanish i18n value. Match exactly so we don't touch other locales.
const oldEsKey = '"In progress":"En proceso"';
const newEsKey = '"In progress":"Pendiente"';
if (c.includes(oldEsKey)) {
  c = c.replace(oldEsKey, newEsKey);
  changed++;
  console.log('rename inprogress: ES i18n value → Pendiente');
} else {
  console.log('rename inprogress: ES i18n value anchor not found (skipping)');
}

if (changed === 0) {
  console.error('rename inprogress: no anchors matched — upstream may have changed both the heading and the ES i18n');
  process.exit(1);
}

c = marker + c;
fs.writeFileSync(bundlePath, c);
console.log('rename inprogress: complete (' + changed + ' replacement' + (changed === 1 ? '' : 's') + ')');
