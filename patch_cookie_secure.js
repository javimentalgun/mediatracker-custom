const fs = require('fs');
const path = '/app/build/server.js';
let c = fs.readFileSync(path, 'utf8');

// Hardening:
// 1. trust proxy → so Express reads X-Forwarded-Proto from Cloudflare and knows
//    when the user is on HTTPS (otherwise it always sees HTTP and won't issue
//    secure cookies).
// 2. cookie.secure: 'auto' → emits Secure flag when req.secure is true (i.e. the
//    user reached us via HTTPS). On direct localhost HTTP access we still emit
//    a non-secure cookie so login works.

if (c.includes('// cookieSecureHardening')) { console.log('cookie secure: already patched'); process.exit(0); }

// Insert `trust proxy` right before the express-session use() call.
const oldSession = "    this.#app.use((0, _expressSession.default)({\n      secret: this.#config.sessionKey,\n      resave: false,\n      saveUninitialized: false,\n      cookie: {\n        httpOnly: true,\n        sameSite: 'lax',\n        maxAge: 1000 * 60 * 60 * 24 * 365\n      },";
const freshSession = "    // cookieSecureHardening: trust X-Forwarded-Proto from Cloudflare so secure cookies\n    // can be issued when the user arrived over HTTPS (still permits HTTP on localhost direct).\n    this.#app.set('trust proxy', true);\n    this.#app.use((0, _expressSession.default)({\n      secret: this.#config.sessionKey,\n      resave: false,\n      saveUninitialized: false,\n      cookie: {\n        httpOnly: true,\n        sameSite: 'lax',\n        secure: 'auto',\n        maxAge: 1000 * 60 * 60 * 24 * 365\n      },";

if (!c.includes(oldSession)) { console.error('cookie secure: anchor not found'); process.exit(1); }
c = c.replace(oldSession, freshSession);
fs.writeFileSync(path, c);
console.log('cookie secure: trust proxy enabled + cookie.secure=auto');
