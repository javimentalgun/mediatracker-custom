const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('/api/downloaded')) { console.log('routes: already patched'); process.exit(0); }

const anchor = "router.get('/api/details/update-metadata/:mediaItemId'";
if (!c.includes(anchor)) { console.error('routes: anchor not found'); process.exit(1); }

const newRoute = `router.patch('/api/downloaded', validatorHandler({
  requestQuerySchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { mediaItemId: { type: 'number' } },
    required: ['mediaItemId']
  }
}), _MediaItemController.toggleDownloaded);
`;

c = c.replace(anchor, newRoute + anchor);
fs.writeFileSync(path, c);
console.log('routes: added PATCH /api/downloaded');
