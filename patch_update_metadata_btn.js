// Two fixes for the "Actualizar metadatos" button on the detail panel:
//
// 1) The render gate filters mediaItem.source against an allowlist
//    ['igdb','tmdb','openlibrary','audible']. Theater items use
//    source='wikidata', so the button never showed for them. Add 'wikidata'.
//
// 2) The button itself is rendered with className 'text-sm btn' — a generic
//    plain-text button — while every other action in the panel uses
//    'text-sm btn-blue' / 'btn-red' / etc. and looks like a proper big button.
//    This made it look like an unfinished placeholder. Promote it to btn-blue
//    so it visually matches the rest of the action row.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: update-metadata-btn */';
if (c.includes(marker)) {
  console.log('update-metadata-btn: already patched (' + bundlePath + ')');
  process.exit(0);
}

let changed = 0;

// 1) Allow wikidata in the source allowlist.
const oldList = '["igdb","tmdb","openlibrary","audible"]';
const newList = '["igdb","tmdb","openlibrary","audible","wikidata"]';
if (c.includes(oldList)) {
  c = c.split(oldList).join(newList);
  changed++;
  console.log('update-metadata-btn: added "wikidata" to source allowlist');
} else {
  console.error('update-metadata-btn: source allowlist anchor not found');
  process.exit(1);
}

// 2) Promote the button styling. The sg= component renders:
//    <button className="text-sm btn" ...><Update metadata/></button>
// Match the exact substring inside sg= so we only touch this one button.
// Match the styling of the other action-row children (text-sm + btn-blue, no
// extra margin or width override — the grid handles sizing) so the button
// renders the same height as its row peers (Marcar como abandonada / etc.).
const oldBtn = 'r.createElement("button",{className:"text-sm btn",onClick:function(){return o()},disabled:s},r.createElement(Xe,{id:"Update metadata"}))';
const newBtn = 'r.createElement("button",{className:"text-sm btn-blue",onClick:function(){return o()},disabled:s},r.createElement(Xe,{id:s?"Updating metadata":"Update metadata"}))';
if (c.includes(oldBtn)) {
  c = c.replace(oldBtn, newBtn);
  changed++;
  console.log('update-metadata-btn: promoted button to btn-blue full-width');
} else {
  console.error('update-metadata-btn: sg= button anchor not found');
  process.exit(1);
}

c = marker + c;
fs.writeFileSync(bundlePath, c);

// Invalidate compressed variants so the server stops serving the old gzip/br.
const path = require('path');
for (const ext of ['.br', '.gz']) {
  const p = bundlePath + ext;
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
    catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
  }
}

console.log('update-metadata-btn: done (' + changed + ' edits)');
