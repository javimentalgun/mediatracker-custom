const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pubDir = '/app/public';
const idxPath = path.join(pubDir, 'index.html');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
const oldName = path.basename(bundlePath);

// If filename already includes a content hash suffix (`_xxxxxxxxxxxx.js`), skip.
if (/_[a-f0-9]{12}\.js$/.test(oldName)) {
  console.log('bundle rename: already content-hashed (' + oldName + ')');
  process.exit(0);
}

const content = fs.readFileSync(bundlePath);
const hash = crypto.createHash('sha1').update(content).digest('hex').slice(0, 12);
const newName = oldName.replace(/\.js$/, '_' + hash + '.js');
const newPath = path.join(pubDir, newName);

fs.renameSync(bundlePath, newPath);
console.log('bundle rename: ' + oldName + ' → ' + newName);

// Move sibling artifacts (.LICENSE.txt is the only one that exists at this point;
// .gz/.br are regenerated downstream, .map doesn't exist in the runtime image).
['.LICENSE.txt'].forEach(ext => {
  const oldSib = bundlePath + ext;
  if (fs.existsSync(oldSib)) {
    fs.renameSync(oldSib, newPath + ext);
    console.log('bundle rename: ' + oldName + ext + ' → ' + newName + ext);
  }
});

// Rewrite all references to the old basename in index.html
let idx = fs.readFileSync(idxPath, 'utf8');
const refCount = idx.split(oldName).length - 1;
if (refCount > 0) {
  idx = idx.split(oldName).join(newName);
  fs.writeFileSync(idxPath, idx);
  console.log('bundle rename: updated ' + refCount + ' refs in index.html');
}
