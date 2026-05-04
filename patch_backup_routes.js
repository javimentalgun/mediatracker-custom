const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/backup'") && c.includes("/api/backup/restore'") && c.includes("/api/backup/export-json'") && c.includes("/api/backup/import'")) { console.log('backup routes: already patched'); process.exit(0); }
// Strip prior version so we can re-apply with the new import route
c = c.replace(/router\.get\('\/api\/backup'[\s\S]*?router\.post\('\/api\/backup\/restore', _MediaItemController\.restoreBackup\);\n/, '');

const anchor = "router.get('/api/import-trakttv/state'";
if (!c.includes(anchor)) { console.error('backup routes: anchor not found'); process.exit(1); }

const route = `router.get('/api/backup', validatorHandler({}), _MediaItemController.downloadBackup);
router.get('/api/backup/export-json', validatorHandler({}), _MediaItemController.exportJson);
router.post('/api/backup/import', validatorHandler({}), _MediaItemController.importJson);
router.get('/api/backup/letterboxd', validatorHandler({}), _MediaItemController.exportLetterboxd);
router.post('/api/backup/restore', validatorHandler({}), _MediaItemController.restoreBackup);
`;

c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('backup routes: added GET /api/backup');
