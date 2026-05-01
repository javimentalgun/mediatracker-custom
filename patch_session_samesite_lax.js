const fs = require('fs');
const path = '/app/build/server.js';
let c = fs.readFileSync(path, 'utf8');

// Default `sameSite: true` translates to "Strict" — the session cookie is NOT
// sent on cross-site navigations, including OAuth callbacks coming back from
// accounts.google.com. We need 'lax' so the cookie rides along on top-level
// navigations (still blocks CSRF on subresource requests / non-GET cross-site).
const old = "        sameSite: true,";
const fresh = "        sameSite: 'lax',";

if (c.includes(fresh)) { console.log('session samesite: already lax'); process.exit(0); }
if (!c.includes(old)) { console.error('session samesite: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('session samesite: set to lax (allows OAuth callback from cross-site)');
