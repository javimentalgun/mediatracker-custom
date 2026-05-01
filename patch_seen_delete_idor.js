const fs = require('fs');
const path = '/app/build/controllers/seen.js';
let c = fs.readFileSync(path, 'utf8');

// IDOR: DELETE /api/seen/:seenId deleted by primary key with no ownership check,
// letting any logged-in user wipe another user's seen rows. Add a check that the
// seen row's userId matches req.user before deleting (or that req.user is admin).

if (c.includes('// seenDeleteIdorGate')) { console.log('seen delete idor: already patched'); process.exit(0); }

const old = "  deleteById = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n    const {\n      seenId\n    } = req.params;\n    await _seen.seenRepository.delete({\n      id: seenId\n    });\n    res.send();\n  });";
const fresh = "  deleteById = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n    const {\n      seenId\n    } = req.params;\n    // seenDeleteIdorGate: only the row's owner (or an admin) can delete it.\n    const _knex = require('../dbconfig').Database.knex;\n    const _row = await _knex('seen').where('id', seenId).first();\n    if (!_row) { res.sendStatus(404); return; }\n    const _reqUserId = Number(req.user);\n    const _me = await _knex('user').where('id', _reqUserId).first();\n    if (_row.userId !== _reqUserId && !(_me && _me.admin)) { res.sendStatus(403); return; }\n    await _seen.seenRepository.delete({\n      id: seenId\n    });\n    res.send();\n  });";

if (!c.includes(old)) { console.error('seen delete idor: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('seen delete idor: DELETE /api/seen/:seenId now requires ownership or admin');
