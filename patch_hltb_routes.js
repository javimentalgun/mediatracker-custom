const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/hltb'")) { console.log('hltb routes: already patched'); process.exit(0); }

const anchor = "router.get('/api/watch-providers'";
if (!c.includes(anchor)) { console.error('hltb routes: anchor not found'); process.exit(1); }

const route = `router.get('/api/hltb', validatorHandler({
  requestQuerySchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { mediaItemId: { type: 'number' } },
    required: ['mediaItemId']
  }
}), _MediaItemController.hltb);
`;
c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('hltb routes: added GET /api/hltb');
