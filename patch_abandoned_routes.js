const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/abandoned'")) {
  console.log('abandoned routes: already patched');
  process.exit(0);
}

// Anchor on a stable upstream route that exists from the start (independent
// of patch ordering relative to the rest of the custom routes).
const anchor = "router.post('/api/catalog/cleanup'";
if (!c.includes(anchor)) { console.error('abandoned routes: anchor not found'); process.exit(1); }

const route =
  "router.put('/api/abandoned/:mediaItemId', validatorHandler({}), _MediaItemController.abandonedAdd);\n" +
  "router.delete('/api/abandoned/:mediaItemId', validatorHandler({}), _MediaItemController.abandonedRemove);\n" +
  "router.get('/api/abandoned', validatorHandler({}), _MediaItemController.abandonedList);\n";

c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('abandoned routes: registered 3 endpoints');
