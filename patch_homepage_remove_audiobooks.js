const fs = require('fs');
const child = require('child_process');

// Remove the audiobook block from the homepage summary. The block is rendered as
//   (null===(<id>=o.audiobook)||void 0===<id>?void 0:<id>.plays)>0&&r.createElement("div",…)
// Replacing the truthy gate with `false&&` short-circuits the createElement so the
// block doesn't render. Cheaper and safer than ripping the whole expression out.
// Re-emission of compressed bundle (.gz/.br) happens at the end of the Dockerfile,
// so this patch only edits the .js file.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:no-audiobook-summary*/';
if (c.includes(marker)) {
  console.log('homepage remove audiobooks: already patched');
  process.exit(0);
}

const re = /\(null===\(([a-zA-Z_$][a-zA-Z0-9_$]*)=o\.audiobook\)\|\|void 0===\1\?void 0:\1\.plays\)>0&&/g;
const matches = c.match(re);
if (!matches || matches.length === 0) {
  console.error('homepage remove audiobooks: anchor not found (homepage summary block layout changed?)');
  process.exit(1);
}
c = c.replace(re, marker + 'false&&');
fs.writeFileSync(bundlePath, c);

console.log('homepage remove audiobooks: short-circuited audiobook block (' + matches.length + ' occurrence' + (matches.length === 1 ? '' : 's') + ')');
