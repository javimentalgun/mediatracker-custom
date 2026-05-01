const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/youtube/feed'") && c.includes("/api/youtube/channels'")) { console.log('youtube routes: already patched'); process.exit(0); }

const anchor = "router.get('/api/import-trakttv/state'";
if (!c.includes(anchor)) { console.error('youtube routes: anchor not found'); process.exit(1); }

const route =
"router.get('/api/youtube/channels', validatorHandler({}), _MediaItemController.youtubeChannels);\n" +
"router.post('/api/youtube/channels', validatorHandler({}), _MediaItemController.youtubeAddChannel);\n" +
"router.delete('/api/youtube/channels/:id', validatorHandler({}), _MediaItemController.youtubeDeleteChannel);\n" +
"router.get('/api/youtube/feed', validatorHandler({}), _MediaItemController.youtubeFeed);\n";

c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('youtube routes: 4 endpoints registered');
