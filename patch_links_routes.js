const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('/api/links')) { console.log('links routes: already patched'); process.exit(0); }

const anchor = "router.patch('/api/downloaded'";
if (!c.includes(anchor)) { console.error('links routes: anchor not found'); process.exit(1); }

const route = `router.put('/api/links', validatorHandler({
  requestQuerySchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { mediaItemId: { type: 'number' } },
    required: ['mediaItemId']
  },
  requestBodySchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { links: { type: 'array' } },
    required: ['links']
  }
}), _MediaItemController.updateLinks);
`;

c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('links routes: added PUT /api/links');
