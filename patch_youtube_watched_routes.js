const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/youtube/watched-stats'")) {
  console.log('youtube watched routes: already patched');
  process.exit(0);
}

const anchor = "router.get('/api/youtube/feed'";
if (!c.includes(anchor)) { console.error('youtube watched routes: anchor not found'); process.exit(1); }

const route =
  "router.post('/api/youtube/watched', validatorHandler({}), _MediaItemController.youtubeMarkWatched);\n" +
  "router.delete('/api/youtube/watched/:videoId', validatorHandler({}), _MediaItemController.youtubeUnmarkWatched);\n" +
  "router.get('/api/youtube/watched-stats', validatorHandler({}), _MediaItemController.youtubeWatchedStats);\n";

c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('youtube watched routes: added 3 endpoints');
