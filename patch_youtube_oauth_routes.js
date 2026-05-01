const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/youtube/oauth/start'")) { console.log('youtube oauth routes: already patched'); process.exit(0); }

const anchor = "router.get('/api/import-trakttv/state'";
if (!c.includes(anchor)) { console.error('youtube oauth routes: anchor not found'); process.exit(1); }

const route =
"router.get('/api/youtube/oauth/start', validatorHandler({}), _MediaItemController.youtubeOauthStart);\n" +
"router.get('/api/youtube/oauth/callback', validatorHandler({}), _MediaItemController.youtubeOauthCallback);\n" +
"router.get('/api/youtube/oauth/status', validatorHandler({}), _MediaItemController.youtubeOauthStatus);\n" +
"router.post('/api/youtube/oauth/sync', validatorHandler({}), _MediaItemController.youtubeOauthSync);\n" +
"router.delete('/api/youtube/oauth', validatorHandler({}), _MediaItemController.youtubeOauthDelete);\n";

c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('youtube oauth routes: 5 endpoints registered');
