// Add a `.btn-green` class to the CSS bundle, matching the visual weight of
// `.btn-red` / `.btn-blue` (outlined button: 1px border + colored text). Used
// by the _AIP toggle on the detail page.
//
// Must run BEFORE patch_css_rename.js so the rename's content hash reflects the
// final CSS (otherwise the rule is in the file but caches keep serving the
// old hash and the class looks unstyled).

const fs = require('fs');
const child = require('child_process');
const cssPath = child.execSync("ls /app/public/main_*.css | grep -v '\\.LICENSE\\|\\.map'").toString().trim();
let c = fs.readFileSync(cssPath, 'utf8');

const marker = '/* mt-fork: btn-green */';
if (c.includes(marker)) {
  console.log('css btn-green: already patched');
  process.exit(0);
}

// Light mode green: tailwind green-700 (rgb 21 128 61). Dark mode: green-400.
// Mirrors how btn-blue uses two `.btn-blue { color: ... }` rules at different
// specificities for light/dark.
const rules =
  '\n' + marker + '\n' +
  '.btn-green { display: inline-block !important; padding: 2px 16px !important; border-radius: 4px !important; border-width: 1px !important; cursor: pointer !important; transition: all 150ms !important; user-select: none !important; border-color: currentColor; color: rgb(21 128 61); }\n' +
  '.btn-green:hover { box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); }\n' +
  '.btn-green:disabled { cursor: auto; background-color: rgb(209 213 219); }\n' +
  '.dark .btn-green { color: rgb(74 222 128); }\n';

c = c + rules;
fs.writeFileSync(cssPath, c);
console.log('css btn-green: appended .btn-green rules');
