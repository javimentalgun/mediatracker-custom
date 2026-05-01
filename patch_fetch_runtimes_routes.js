const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/episodes/fetch-runtimes'")) { console.log('fetch-runtimes routes: already patched'); process.exit(0); }

const anchor = "router.put('/api/episode-progress'";
if (!c.includes(anchor)) { console.error('fetch-runtimes routes: anchor not found'); process.exit(1); }

const route = `router.post('/api/episodes/fetch-runtimes', validatorHandler({
  requestQuerySchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { mediaItemId: { type: 'number' } },
    required: ['mediaItemId']
  }
}), _MediaItemController.fetchEpisodeRuntimes);
`;
c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('fetch-runtimes routes: added POST /api/episodes/fetch-runtimes');
