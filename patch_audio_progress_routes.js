const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/audio-progress'")) { console.log('audio-progress routes: already patched'); process.exit(0); }

const anchor = "router.patch('/api/downloaded'";
if (!c.includes(anchor)) { console.error('audio-progress routes: anchor not found'); process.exit(1); }

const route = `router.put('/api/audio-progress', validatorHandler({
  requestQuerySchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { mediaItemId: { type: 'number' }, progress: { type: 'number' } },
    required: ['mediaItemId']
  }
}), _MediaItemController.setAudioProgress);
`;
c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('audio-progress routes: added PUT /api/audio-progress');
