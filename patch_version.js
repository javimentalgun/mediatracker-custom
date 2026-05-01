const fs = require('fs');
const path = '/app/build/config.js';
let c = fs.readFileSync(path, 'utf8');

// Replace upstream's version with a fork-specific one. Visible in:
//   - server logs at startup ("MediaTracker v0.0.1 escuchando en …")
//   - the About page (Settings → About → version field)
// Bump this when you cut a new "release" of your fork.
const FORK_VERSION = 'v0.1.7';

const old = 'static version = _package.version;';
const fresh = "static version = '" + FORK_VERSION + "';";

if (c.includes("static version = 'v")) { console.log('version: already overridden'); process.exit(0); }
if (!c.includes(old)) {
  // Already patched with the previous suffix-based approach — strip it and re-apply
  c = c.replace(/static version = _package\.version \+ '[^']+';/, fresh);
  if (!c.includes(fresh)) { console.error('version: neither anchor matched'); process.exit(1); }
} else {
  c = c.replace(old, fresh);
}
fs.writeFileSync(path, c);
console.log('version: set to ' + FORK_VERSION);
