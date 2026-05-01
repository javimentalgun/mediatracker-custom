const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('cleanupCatalog')) { console.log('cleanup controller: already patched'); process.exit(0); }

const method = `  cleanupCatalog = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const knex = _dbconfig.Database.knex;
    const orphans = await knex('mediaItem')
      .select('id','title','mediaType')
      .whereNotIn('id', knex.select('mediaItemId').from('listItem').whereNotNull('mediaItemId'))
      .whereNotIn('id', knex.select('mediaItemId').from('seen').whereNotNull('mediaItemId'))
      .whereNotIn('id', knex.select('mediaItemId').from('userRating').whereNotNull('mediaItemId'))
      .whereNotIn('id', knex.select('mediaItemId').from('progress').whereNotNull('mediaItemId'));
    const ids = orphans.map(r => r.id);
    if (ids.length === 0) { res.json({ ok: true, deleted: 0, items: [] }); return; }
    // Cascade: episode + season for any TV shows being purged
    await knex('episode').whereIn('tvShowId', ids).delete();
    await knex('season').whereIn('tvShowId', ids).delete();
    await knex('mediaItem').whereIn('id', ids).delete();
    res.json({ ok: true, deleted: ids.length, items: orphans });
  });
`;
const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('cleanup controller: anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('cleanup controller: added cleanupCatalog method');
