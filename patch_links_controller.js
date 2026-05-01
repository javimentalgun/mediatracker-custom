const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('updateLinks')) { console.log('links controller: already patched'); process.exit(0); }

const old = 'exports.MediaItemController = MediaItemController;';
const method = `  updateLinks = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const { mediaItemId } = req.query;
    const { links } = req.body;
    if (!Array.isArray(links)) { res.status(400).send(); return; }
    const safe = links.map(l => ({ label: String(l.label || l.url || ''), url: String(l.url || '') })).filter(l => l.url);
    await _dbconfig.Database.knex('mediaItem').update({ links: JSON.stringify(safe) }).where('id', mediaItemId);
    res.sendStatus(200);
  });
`;

if (!c.includes('}\nexports.MediaItemController')) { console.error('links controller: close anchor not found'); process.exit(1); }
c = c.replace('}\nexports.MediaItemController = MediaItemController;', method + '}\nexports.MediaItemController = MediaItemController;');

fs.writeFileSync(path, c);
console.log('links controller: added updateLinks method');
