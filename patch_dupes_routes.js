const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/dupes'") && c.includes("/api/dupes/merge'")) { console.log('dupes routes: already patched'); process.exit(0); }

const anchor = "router.get('/api/import-trakttv/state'";
if (!c.includes(anchor)) { console.error('dupes routes: anchor not found'); process.exit(1); }

const route =
"router.get('/api/dupes', validatorHandler({}), _MediaItemController.findDupes);\n" +
"router.post('/api/dupes/merge', validatorHandler({}), _MediaItemController.mergeDupes);\n";

c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('dupes routes: GET /api/dupes + POST /api/dupes/merge added');
