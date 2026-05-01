const fs = require('fs');
const path = '/app/build/controllers/users.js';
let c = fs.readFileSync(path, 'utf8');

// /api/user/:userId leaks {id, name} of any user to any logged-in user — letting
// non-admins enumerate the user list. Tighten: only allow if the requested userId
// matches the current user, OR the current user is admin. Otherwise 403.

if (c.includes('// userByIdGate')) { console.log('user byid gate: already patched'); process.exit(0); }

const old = "  getById = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n    const {\n      userId\n    } = req.params;\n    const user = await _user2.userRepository.findOne({\n      id: userId\n    });";
const fresh = "  getById = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n    const {\n      userId\n    } = req.params;\n    // userByIdGate: prevent enumeration of other users' identities by non-admins.\n    const _reqUserId = Number(req.user);\n    const _me = await _user2.userRepository.findOne({ id: _reqUserId });\n    if (Number(userId) !== _reqUserId && !(_me && _me.admin)) {\n      res.sendStatus(403); return;\n    }\n    const user = await _user2.userRepository.findOne({\n      id: userId\n    });";

if (!c.includes(old)) { console.error('user byid gate: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('user byid gate: /api/user/:userId now gated to self-or-admin');
