// Make /import and /backup live INSIDE the Settings layout so the sidebar
// stays visible while the user is on those pages.
//
// Upstream (and the fork's menu config in `Dy`) listed Import and Backup with
// ABSOLUTE paths "/import" and "/backup" — clicking them navigates OUT of
// /settings/* and the page renders the bare component, no sidebar. The fix:
// register them as RELATIVE child-routes of `Ny` (the Settings router) and
// switch the menu entries to relative paths so navigation stays in /settings.
//
// The top-level /import and /backup routes are kept untouched so any external
// links/bookmarks keep working.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: settings-import-backup-inside */';
if (c.includes(marker)) { console.log('settings import/backup inside: already patched'); process.exit(0); }

// 1) Menu items: relative paths so the sidebar links stay in /settings/*.
const menuOld = '[{path:"/import",name:"Importar"},{path:"/backup",name:"Backup"}]';
const menuNew = '[{path:"import",name:"Importar"},{path:"backup",name:"Backup"}]';
if (!c.includes(menuOld)) {
  console.error('settings import/backup inside: menu anchor not found');
  process.exit(1);
}
c = c.replace(menuOld, menuNew);

// 2) Settings router (Ny): inject import + backup child-routes after preferences.
const routeAnchor = 'r.createElement(Q,{path:"preferences",element:r.createElement(vy,null)}),';
if (!c.includes(routeAnchor)) {
  console.error('settings import/backup inside: settings-router anchor not found');
  process.exit(1);
}
const newRoutes =
  'r.createElement(Q,{path:"import",element:r.createElement(JP,{key:"settings/import"})}),' +
  'r.createElement(Q,{path:"backup",element:r.createElement(_BK,{key:"settings/backup"})}),';
c = c.replace(routeAnchor, routeAnchor + newRoutes);

c = marker + c;
fs.writeFileSync(bundlePath, c);

// Invalidate compressed variants.
const path = require('path');
for (const ext of ['.br', '.gz']) {
  const p = bundlePath + ext;
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
    catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
  }
}

console.log('settings import/backup inside: applied');
