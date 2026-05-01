const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const child = require('child_process');

// Same trick as patch_bundle_rename.js but for the CSS file. Without this, the
// server sets `Cache-Control: max-age=31536000` on /main_*.css and the browser
// (and Cloudflare) keep serving the same cached file forever — so frontend
// patches that touch the CSS (e.g. background_colors) don't reach the user
// even after a rebuild. Renaming with a content hash forces a fresh URL.
//
// Must run AFTER any patch that modifies the CSS contents (background_colors).

const pubDir = '/app/public';
const idxPath = path.join(pubDir, 'index.html');
const cssPath = child.execSync("ls /app/public/main_*.css | grep -v '\\.gz\\|\\.br'").toString().trim();
const oldName = path.basename(cssPath);

if (/_[a-f0-9]{12}\.css$/.test(oldName)) {
  console.log('css rename: already content-hashed (' + oldName + ')');
  process.exit(0);
}

const content = fs.readFileSync(cssPath);
const hash = crypto.createHash('sha1').update(content).digest('hex').slice(0, 12);
const newName = oldName.replace(/\.css$/, '_' + hash + '.css');
const newPath = path.join(pubDir, newName);

fs.renameSync(cssPath, newPath);
console.log('css rename: ' + oldName + ' → ' + newName);

// Move sibling .gz / .br variants emitted by patch_background_colors.js.
['.gz', '.br'].forEach(ext => {
  const oldSib = cssPath + ext;
  if (fs.existsSync(oldSib)) {
    fs.renameSync(oldSib, newPath + ext);
    console.log('css rename: ' + oldName + ext + ' → ' + newName + ext);
  }
});

// Rewrite all references in index.html.
let idx = fs.readFileSync(idxPath, 'utf8');
const refCount = idx.split(oldName).length - 1;
if (refCount > 0) {
  idx = idx.split(oldName).join(newName);
  fs.writeFileSync(idxPath, idx);
  console.log('css rename: updated ' + refCount + ' refs in index.html');
} else {
  console.log('css rename: no refs to ' + oldName + ' in index.html');
}
