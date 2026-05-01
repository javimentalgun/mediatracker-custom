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
      // Annotate with usage so the UI can suggest the "winner"
      for (const it of items) {
        const counts = await knex.raw(\`
          SELECT
            (SELECT COUNT(*) FROM seen WHERE mediaItemId = ?) as seen,
            (SELECT COUNT(*) FROM userRating WHERE mediaItemId = ?) as rating,
            (SELECT COUNT(*) FROM progress WHERE mediaItemId = ?) as progress,
            (SELECT COUNT(*) FROM listItem WHERE mediaItemId = ?) as list
        \`, [it.id, it.id, it.id, it.id]);
        const c0 = counts[0] || counts;
        it.usage = (c0.seen || 0) + (c0.rating || 0) + (c0.progress || 0) + (c0.list || 0);
      }
      items.sort((a, b) => b.usage - a.usage);
      dupes.push({ key, items });
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
    await knex.transaction(async trx => {
      // Move seen rows. Skip rows that would conflict on (userId, mediaItemId, episodeId, date).
      const seenRows = await trx('seen').where('mediaItemId', loserId);
      for (const s of seenRows) {
        const exists = await trx('seen').where({ userId: s.userId, mediaItemId: winnerId, episodeId: s.episodeId, date: s.date }).first();
        if (exists) { await trx('seen').where('id', s.id).delete(); continue; }
        await trx('seen').where('id', s.id).update({ mediaItemId: winnerId });
        stats.seen++;
      }
      // userRating: dedup by (userId, mediaItemId, seasonId, episodeId)
      const ratings = await trx('userRating').where('mediaItemId', loserId);
      for (const r of ratings) {
        const exists = await trx('userRating').where({ userId: r.userId, mediaItemId: winnerId, seasonId: r.seasonId, episodeId: r.episodeId }).first();
        if (exists) { await trx('userRating').where('id', r.id).delete(); continue; }
        await trx('userRating').where('id', r.id).update({ mediaItemId: winnerId });
        stats.ratings++;
      }
      // progress: dedup by (userId, mediaItemId, episodeId)
      const progs = await trx('progress').where('mediaItemId', loserId);
      for (const p of progs) {
        const exists = await trx('progress').where({ userId: p.userId, mediaItemId: winnerId, episodeId: p.episodeId }).first();
        if (exists) { await trx('progress').where('id', p.id).delete(); continue; }
        await trx('progress').where('id', p.id).update({ mediaItemId: winnerId });
        stats.progress++;
      }
      // listItem: dedup by (listId, mediaItemId, seasonId, episodeId)
      const lis = await trx('listItem').where('mediaItemId', loserId);
      for (const li of lis) {
        const exists = await trx('listItem').where({ listId: li.listId, mediaItemId: winnerId, seasonId: li.seasonId, episodeId: li.episodeId }).first();
        if (exists) { await trx('listItem').where('id', li.id).delete(); continue; }
        await trx('listItem').where('id', li.id).update({ mediaItemId: winnerId });
        stats.listItems++;
      }
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
