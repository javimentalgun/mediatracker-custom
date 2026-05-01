const fs = require('fs');
const path = '/app/build/server.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('// startup-metadata-deferred')) { console.log('skip startup metadata: already patched'); process.exit(0); }

// Defer the initial metadata refresh by 5 minutes after boot so the server is
// responsive immediately. The setInterval continues to fire hourly as before.
// Without this, on a 38k-item DB with the 100-item throttle, startup is
// unresponsive for ~5-10 minutes while TMDB calls + SQLite writes serialize.
const old = "if (this.#config.production) {\n            await (0, _utils.catchAndLogError)(_updateMetadata.updateMetadata);\n            setInterval(async () => {";
const fresh = "if (this.#config.production) {\n            // startup-metadata-deferred: don't block startup, run first refresh in 5 min\n            setTimeout(() => (0, _utils.catchAndLogError)(_updateMetadata.updateMetadata), 5 * 60 * 1000);\n            setInterval(async () => {";

if (!c.includes(old)) { console.error('skip startup metadata: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('skip startup metadata: deferred initial refresh by 5 min');
