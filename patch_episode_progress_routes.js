const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/episode-progress'")) { console.log('episode-progress routes: already patched'); process.exit(0); }

const anchor = "router.put('/api/audio-progress'";
if (!c.includes(anchor)) { console.error('episode-progress routes: anchor not found'); process.exit(1); }

const route = `router.put('/api/episode-progress', validatorHandler({
  requestQuerySchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { episodeId: { type: 'number' }, progress: { type: 'number' } },
    required: ['episodeId']
  }
}), _MediaItemController.setEpisodeProgress);
`;
c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('episode-progress routes: added PUT /api/episode-progress');
