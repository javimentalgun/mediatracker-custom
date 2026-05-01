const fs = require('fs');
const path = '/app/build/server.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('// sw-no-cache')) { console.log('sw no-cache: already patched'); process.exit(0); }

// Force Cache-Control: no-store for /sw.js so Cloudflare and browsers always
// fetch the latest. Without this, /sw.js inherits the .js max-age=31536000 rule
// and CF caches it for a year, defeating the SW's content-hash invalidation.
const old = "this.#app.get(/\\.(?:js|css|woff2)$/, (req, res, next) => {\n      res.set('Cache-Control', 'max-age=31536000');\n      next();\n    });";
const fresh = "this.#app.get(/\\.(?:js|css|woff2)$/, (req, res, next) => { // sw-no-cache\n      if (req.path === '/sw.js') { res.set('Cache-Control', 'no-store, no-cache, must-revalidate'); next(); return; }\n      res.set('Cache-Control', 'max-age=31536000');\n      next();\n    });";

if (!c.includes(old)) { console.error('sw no-cache: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('sw no-cache: /sw.js now served with no-store (CF and browsers always refetch)');
