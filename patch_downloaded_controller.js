const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('toggleDownloaded')) { console.log('controller: already patched'); process.exit(0); }

// Add Database import after existing imports
const oldImport = 'var _updateMetadata = require("../updateMetadata");';
const newImport = 'var _updateMetadata = require("../updateMetadata");\nvar _dbconfig = require("../dbconfig");';
if (!c.includes(oldImport)) { console.error('controller: import anchor not found'); process.exit(1); }
c = c.replace(oldImport, newImport);

// Add toggleDownloaded method before closing brace of class
const oldClose = "}\nexports.MediaItemController = MediaItemController;";
const newClose = `  toggleDownloaded = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const { mediaItemId } = req.query;
    const item = await _dbconfig.Database.knex('mediaItem').select('downloaded').where('id', mediaItemId).first();
    if (!item) { res.status(404).send(); return; }
    await _dbconfig.Database.knex('mediaItem').update({ downloaded: item.downloaded ? 0 : 1 }).where('id', mediaItemId);
    res.sendStatus(200);
  });
}
exports.MediaItemController = MediaItemController;`;

if (!c.includes(oldClose)) { console.error('controller: class close anchor not found'); process.exit(1); }
c = c.replace(oldClose, newClose);

fs.writeFileSync(path, c);
console.log('controller: added toggleDownloaded method');
