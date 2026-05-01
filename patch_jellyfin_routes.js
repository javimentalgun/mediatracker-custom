const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/jellyfin/sync'") && c.includes("/api/jellyfin/lookup'") && c.includes("/api/jellyfin/status'") && c.includes("/api/jellyfin/library-ids'") && c.includes("/api/jellyfin/sync-downloaded'")) {
  console.log('jellyfin routes: already patched'); process.exit(0);
}

const anchor = "router.get('/api/import-trakttv/state'";
if (!c.includes(anchor)) { console.error('jellyfin routes: anchor not found'); process.exit(1); }

const route =
"router.get('/api/jellyfin/status', validatorHandler({}), _MediaItemController.jellyfinStatus);\n" +
"router.post('/api/jellyfin/sync', validatorHandler({}), _MediaItemController.jellyfinSync);\n" +
"router.get('/api/jellyfin/lookup', validatorHandler({}), _MediaItemController.jellyfinLookup);\n" +
"router.get('/api/jellyfin/library-ids', validatorHandler({}), _MediaItemController.jellyfinLibraryIds);\n" +
"router.post('/api/jellyfin/sync-downloaded', validatorHandler({}), _MediaItemController.jellyfinSyncDownloaded);\n";

c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('jellyfin routes: added 3 endpoints (status, sync, lookup)');
