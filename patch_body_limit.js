const fs = require('fs');
const path = '/app/build/server.js';
let c = fs.readFileSync(path, 'utf8');

// express.json() defaults to 100KB. Our JSON imports (mediatracker-export-*.json)
// can easily reach 10-50MB on a populated library. Bump the limit so /api/backup/import
// stops returning PayloadTooLargeError.
const old = "this.#app.use(_express.default.json());";
const fresh = "this.#app.use(_express.default.json({ limit: '100mb' }));";

if (c.includes(fresh)) { console.log('body limit: already patched'); process.exit(0); }
if (!c.includes(old)) { console.error('body limit: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('body limit: express.json() now accepts up to 100MB');
