// Bugfix: server.js does `req.header('Accept-Encoding').includes('br')` to
// decide whether to swap a .js/.css URL to its .br/.gz variant. If the
// request omits the Accept-Encoding header (curl, some bots, dev tools that
// disable cache), `req.header(...)` returns undefined and `.includes` throws,
// returning a 500 for every js/css fetch — so the SPA bundle can't load.
//
// Wrap each access in `(req.header('Accept-Encoding') || '')` so absence
// degrades cleanly to "no compression accepted".

const fs = require('fs');
const path = '/app/build/server.js';
let c = fs.readFileSync(path, 'utf8');

const marker = '// mt-fork: accept-encoding-safe';
if (c.includes(marker)) {
  console.log('accept-encoding safe: already patched');
  process.exit(0);
}

let changed = 0;
const old1 = "req.header('Accept-Encoding').includes('br')";
const new1 = "(req.header('Accept-Encoding') || '').includes('br')";
if (c.includes(old1)) {
  c = c.split(old1).join(new1);
  changed++;
}
const old2 = "req.header('Accept-Encoding').includes('gz')";
const new2 = "(req.header('Accept-Encoding') || '').includes('gz')";
if (c.includes(old2)) {
  c = c.split(old2).join(new2);
  changed++;
}

if (changed === 0) {
  console.error('accept-encoding safe: no anchors matched (server.js layout changed?)');
  process.exit(1);
}

c = '// ' + marker.replace('// ', '') + '\n' + c;
fs.writeFileSync(path, c);
console.log('accept-encoding safe: hardened ' + changed + ' brotli/gzip checks');

try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('accept-encoding safe: syntax OK');
} catch (e) {
  console.error('accept-encoding safe: SYNTAX ERROR -> ' + e.message.slice(0, 300));
  process.exit(1);
}
