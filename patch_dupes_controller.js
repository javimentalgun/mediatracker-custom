const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

// Strip prior version (idempotent)
c = c.replace(/  findDupes = \(0, _typescriptRoutesToOpenapiServer\.createExpressRoute\)[\s\S]*?\}\);\n/, '');
c = c.replace(/  mergeDupes = \(0, _typescriptRoutesToOpenapiServer\.createExpressRoute\)[\s\S]*?\}\);\n/, '');

const method = `  findDupes = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const knex = _dbconfig.Database.knex;
    // Group items by (lowercased title, releaseYear, mediaType). Pairs with >1 row are candidates.
    const rows = await knex('mediaItem')
      .select('id','title','mediaType','releaseDate','tmdbId','imdbId','tvdbId','igdbId','goodreadsId','openlibraryId','audibleId')
      .whereNotNull('title');
    const groups = new Map();
    for (const r of rows) {
      const key = (r.title || '').toLowerCase().trim() + '|' + (r.releaseDate ? String(r.releaseDate).slice(0,4) : '') + '|' + r.mediaType;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    const dupes = [];
    for (const [key, items] of groups.entries()) {
      if (items.length < 2) continue;
      // Skip if all items share the same tmdbId (just a query oddity)
      const distinctTmdb = new Set(items.map(i => i.tmdbId).filter(Boolean));
      const distinctImdb = new Set(items.map(i => i.imdbId).filter(Boolean));
      // True dupes have at least one distinct external ID
      if (distinctTmdb.size <= 1 && distinctImdb.size <= 1 && items.every(i => !i.tmdbId && !i.imdbId)) continue;
      dupes.push({ key, items });
    }
    // Bulk-load usage counts for ALL dupe items in 4 grouped queries (was 4×N).
    const allIds = dupes.flatMap(d => d.items.map(i => i.id));
    const usage = new Map();
    if (allIds.length > 0) {
      const fetchCounts = async (table) => knex(table).whereIn('mediaItemId', allIds).groupBy('mediaItemId').select('mediaItemId').count('* as c');
      const [s, r, p, l] = await Promise.all([fetchCounts('seen'), fetchCounts('userRating'), fetchCounts('progress'), fetchCounts('listItem')]);
      const add = (rows) => { for (const r of rows) usage.set(r.mediaItemId, (usage.get(r.mediaItemId) || 0) + Number(r.c || 0)); };
      add(s); add(r); add(p); add(l);
    }
    for (const d of dupes) {
      for (const it of d.items) it.usage = usage.get(it.id) || 0;
      d.items.sort((a, b) => b.usage - a.usage);
    }
    res.json({ count: dupes.length, dupes });
  });
  mergeDupes = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const knex = _dbconfig.Database.knex;
    const { winnerId, loserId } = req.body || {};
    if (!winnerId || !loserId || winnerId === loserId) { res.status(400).json({ error: 'winnerId y loserId requeridos y distintos' }); return; }
    const w = await knex('mediaItem').where('id', winnerId).first();
    const l = await knex('mediaItem').where('id', loserId).first();
    if (!w || !l) { res.status(404).json({ error: 'mediaItem no encontrado' }); return; }
    if (w.mediaType !== l.mediaType) { res.status(400).json({ error: 'mediaTypes distintos — no se puede fusionar' }); return; }
    const stats = { seen: 0, ratings: 0, progress: 0, listItems: 0 };
    // Helper: bulk-merge a child table — load loser/winner rows once, classify
    // each loser row as conflict (delete) or unique (re-assign), then batch
    // delete + batch update. 2 reads + 2 writes per table instead of N reads + N writes.
    const _bulkMerge = async (trx, table, keyFn) => {
      const loserRows = await trx(table).where('mediaItemId', loserId);
      if (loserRows.length === 0) return 0;
      const winnerRows = await trx(table).where('mediaItemId', winnerId);
      const winnerKeys = new Set(winnerRows.map(keyFn));
      const toDelete = [], toReassign = [];
      for (const r of loserRows) {
        if (winnerKeys.has(keyFn(r))) toDelete.push(r.id);
        else toReassign.push(r.id);
      }
      if (toDelete.length) await trx(table).whereIn('id', toDelete).delete();
      if (toReassign.length) await trx(table).whereIn('id', toReassign).update({ mediaItemId: winnerId });
      return toReassign.length;
    };
    await knex.transaction(async trx => {
      stats.seen      = await _bulkMerge(trx, 'seen',       r => r.userId + '|' + (r.episodeId || '') + '|' + r.date);
      stats.ratings   = await _bulkMerge(trx, 'userRating', r => r.userId + '|' + (r.seasonId || '') + '|' + (r.episodeId || ''));
      stats.progress  = await _bulkMerge(trx, 'progress',   r => r.userId + '|' + (r.episodeId || ''));
      stats.listItems = await _bulkMerge(trx, 'listItem',   r => r.listId + '|' + (r.seasonId || '') + '|' + (r.episodeId || ''));
      // Drop loser's children (episodes/seasons) and the loser itself
      await trx('episode').where('tvShowId', loserId).delete();
      await trx('season').where('tvShowId', loserId).delete();
      await trx('mediaItem').where('id', loserId).delete();
    });
    res.json({ ok: true, winnerId, loserId, ...stats });
  });
`;

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('dupes controller: anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('dupes controller: findDupes + mergeDupes installed');
