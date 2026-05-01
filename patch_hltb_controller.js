const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('hltb =')) { console.log('hltb controller: already patched'); process.exit(0); }

const method = `  hltb = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const { mediaItemId } = req.query;
    const item = await _dbconfig.Database.knex('mediaItem').select('igdbId','title').where('id', mediaItemId).first();
    if (!item || !item.igdbId) { res.json({hastily:null,normally:null,completely:null,count:0}); return; }
    try {
      const { IGDB } = require('../metadata/provider/igdb');
      const igdb = new IGDB();
      const data = await igdb.get('game_time_to_beats', \`fields hastily,normally,completely,count; where game_id = \${item.igdbId};\`);
      if (data && data.length > 0) {
        const t = data[0];
        res.json({
          hastily: t.hastily ? Math.round(t.hastily/60) : null,
          normally: t.normally ? Math.round(t.normally/60) : null,
          completely: t.completely ? Math.round(t.completely/60) : null,
          count: t.count || 0
        });
      } else {
        res.json({hastily:null,normally:null,completely:null,count:0});
      }
    } catch (e) {
      res.status(500).json({error: e.message});
    }
  });
`;
const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('hltb controller: close anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('hltb controller: added hltb method (IGDB time_to_beat lookup)');
