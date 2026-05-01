const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('setEpisodeProgress')) { console.log('episode-progress controller: already patched'); process.exit(0); }

const method = `  setEpisodeProgress = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const { episodeId } = req.query;
    const progress = req.query.progress !== undefined ? req.query.progress : (req.body && req.body.progress);
    const ep = await _dbconfig.Database.knex('episode').select('id').where('id', episodeId).first();
    if (!ep) { res.status(404).send(); return; }
    const p = (progress === null || progress === undefined) ? null : Math.max(0, Math.min(1, Number(progress)));
    await _dbconfig.Database.knex('episode').update({ progress: p }).where('id', episodeId);
    res.json({ ok: true, progress: p });
  });
`;
const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('episode-progress controller: close anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('episode-progress controller: added setEpisodeProgress method');
