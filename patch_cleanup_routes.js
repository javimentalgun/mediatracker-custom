const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/catalog/cleanup'")) { console.log('cleanup routes: already patched'); process.exit(0); }

const anchor = "router.get('/api/hltb'";
if (!c.includes(anchor)) { console.error('cleanup routes: anchor not found'); process.exit(1); }

const route = `router.post('/api/catalog/cleanup', validatorHandler({}), _MediaItemController.cleanupCatalog);
`;
c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('cleanup routes: added POST /api/catalog/cleanup');
