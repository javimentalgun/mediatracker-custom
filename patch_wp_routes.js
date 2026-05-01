const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('/api/watch-providers')) { console.log('wp routes: already patched'); process.exit(0); }

const anchor = "router.patch('/api/downloaded'";
if (!c.includes(anchor)) { console.error('wp routes: anchor not found'); process.exit(1); }

const route = `router.get('/api/watch-providers', validatorHandler({
  requestQuerySchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { mediaItemId: { type: 'number' } },
    required: ['mediaItemId']
  }
}), _MediaItemController.watchProviders);
`;

c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('wp routes: added GET /api/watch-providers');
