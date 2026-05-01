const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('setAudioProgress')) { console.log('audio-progress controller: already patched'); process.exit(0); }

const method = `  setAudioProgress = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const { mediaItemId } = req.query;
    const progress = req.query.progress !== undefined ? req.query.progress : (req.body && req.body.progress);
    const item = await _dbconfig.Database.knex('mediaItem').select('id').where('id', mediaItemId).first();
    if (!item) { res.status(404).send(); return; }
    const p = (progress === null || progress === undefined) ? null : Math.max(0, Math.min(1, Number(progress)));
    await _dbconfig.Database.knex('mediaItem').update({ audioProgress: p }).where('id', mediaItemId);
    res.json({ ok: true, audioProgress: p });
  });
`;

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('audio-progress controller: close anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('audio-progress controller: added setAudioProgress method');
