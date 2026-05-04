const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

// Strip any prior version of our backup methods (idempotent — re-runs safely after edits)
c = c.replace(/  downloadBackup = \(0, _typescriptRoutesToOpenapiServer\.createExpressRoute\)\(async \(req, res\) => \{[\s\S]*?\}\);\n/, '');
c = c.replace(/  exportJson = \(0, _typescriptRoutesToOpenapiServer\.createExpressRoute\)\(async \(req, res\) => \{[\s\S]*?\}\);\n/, '');
c = c.replace(/  restoreBackup = \(0, _typescriptRoutesToOpenapiServer\.createExpressRoute\)\(async \(req, res\) => \{[\s\S]*?\}\);\n/, '');
c = c.replace(/  importJson = \(0, _typescriptRoutesToOpenapiServer\.createExpressRoute\)\(async \(req, res\) => \{[\s\S]*?\}\);\n/, '');
c = c.replace(/  exportLetterboxd = \(0, _typescriptRoutesToOpenapiServer\.createExpressRoute\)\(async \(req, res\) => \{[\s\S]*?\}\);\n/, '');

const method = `  downloadBackup = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const dbPath = '/storage/data.db';
    const date = new Date().toISOString().slice(0, 10);
    res.download(dbPath, \`mediatoc-backup-\${date}.db\`, (err) => {
      if (err && !res.headersSent) { res.status(500).send('backup failed'); }
    });
  });
  exportJson = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const userId = Number(req.user);
    const knex = _dbconfig.Database.knex;
    const [user, lists, listItems, seen, ratings, progress, items] = await Promise.all([
      knex('user').select('id','name','admin').where('id', userId).first(),
      knex('list').select('*').where('userId', userId),
      knex('listItem').select('listItem.*').leftJoin('list','list.id','listItem.listId').where('list.userId', userId),
      knex('seen').select('*').where('userId', userId),
      knex('userRating').select('*').where('userId', userId),
      knex('progress').select('*').where('userId', userId),
      knex('mediaItem').select('id','title','mediaType','releaseDate','tmdbId','imdbId','igdbId','tvdbId','traktId','openlibraryId','audibleId','goodreadsId','audioProgress','downloaded','links')
    ]);
    const referencedIds = new Set();
    listItems.forEach(li => li.mediaItemId && referencedIds.add(li.mediaItemId));
    seen.forEach(s => s.mediaItemId && referencedIds.add(s.mediaItemId));
    ratings.forEach(r => r.mediaItemId && referencedIds.add(r.mediaItemId));
    progress.forEach(p => p.mediaItemId && referencedIds.add(p.mediaItemId));
    const referencedItems = items.filter(it => referencedIds.has(it.id));
    const tvShowIds = referencedItems.filter(it => it.mediaType === 'tv').map(it => it.id);
    // Episodes for TV shows that have user activity (so the import can map old episodeIds → new ones)
    let episodes = [];
    if (tvShowIds.length > 0) {
      episodes = await knex('episode').select('id','tvShowId','seasonNumber','episodeNumber','title','isSpecialEpisode').whereIn('tvShowId', tvShowIds);
    }
    const out = {
      exportedAt: new Date().toISOString(),
      schemaVersion: 2,
      user, lists, listItems, seen, ratings, progress,
      mediaItems: referencedItems,
      episodes
    };
    const date = new Date().toISOString().slice(0,10);
    res.setHeader('Content-Disposition', 'attachment; filename="mediatoc-export-' + date + '.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(out, null, 2));
  });
  importJson = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const userId = Number(req.user);
    const knex = _dbconfig.Database.knex;
    // Read raw body (express.json default limit is too small for these exports)
    let body = '';
    try {
      await new Promise((resolve, reject) => {
        req.setEncoding('utf8');
        req.on('data', chunk => { body += chunk; if (body.length > 100 * 1024 * 1024) { reject(new Error('Archivo demasiado grande (>100MB)')); } });
        req.on('end', resolve);
        req.on('error', reject);
      });
    } catch (e) { res.status(400).json({ error: e.message }); return; }
    let data;
    try { data = JSON.parse(body); } catch (e) { res.status(400).json({ error: 'JSON inválido: ' + e.message }); return; }
    if (!data || !Array.isArray(data.mediaItems)) { res.status(400).json({ error: 'JSON sin campo mediaItems' }); return; }
    // createMissing: when an external ID isn't found in MT, insert a minimal row so
    // its seen/ratings/progress can attach. MT's metadata refresh fills in the rest later.
    // Default true; set { createMissing: false } in the request body to disable.
    const createMissing = data.createMissing !== false;

    const stats = { mediaItemsMatched: 0, mediaItemsCreated: 0, mediaItemsMissing: 0, episodesMatched: 0, listsCreated: 0, listsExisting: 0, listItemsImported: 0, listItemsSkipped: 0, seenImported: 0, seenSkipped: 0, seenMissing: 0, ratingsImported: 0, ratingsSkipped: 0, progressImported: 0, progressSkipped: 0 };

    // 1. Match mediaItems by external IDs (fall through TMDB → IMDB → TVDB → IGDB → audible → goodreads → openlibrary)
    const mediaItemMap = new Map();
    for (const mi of data.mediaItems) {
      const where = { mediaType: mi.mediaType };
      let match = null;
      const tryMatch = async (key, val) => {
        if (match || !val) return;
        match = await knex('mediaItem').where({ ...where, [key]: val }).first();
      };
      await tryMatch('tmdbId', mi.tmdbId);
      await tryMatch('imdbId', mi.imdbId);
      await tryMatch('tvdbId', mi.tvdbId);
      await tryMatch('igdbId', mi.igdbId);
      await tryMatch('audibleId', mi.audibleId);
      await tryMatch('goodreadsId', mi.goodreadsId);
      await tryMatch('openlibraryId', mi.openlibraryId);
      await tryMatch('traktId', mi.traktId);
      if (match) { mediaItemMap.set(mi.id, match.id); stats.mediaItemsMatched++; continue; }
      if (createMissing && (mi.tmdbId || mi.imdbId || mi.tvdbId || mi.igdbId || mi.audibleId || mi.goodreadsId || mi.openlibraryId)) {
        try {
          const inserted = await knex('mediaItem').insert({
            title: mi.title || '(unknown)',
            mediaType: mi.mediaType,
            tmdbId: mi.tmdbId || null,
            imdbId: mi.imdbId || null,
            tvdbId: mi.tvdbId || null,
            igdbId: mi.igdbId || null,
            audibleId: mi.audibleId || null,
            goodreadsId: mi.goodreadsId || null,
            openlibraryId: mi.openlibraryId || null,
            traktId: mi.traktId || null,
            releaseDate: mi.releaseDate || null,
            source: mi.tmdbId || mi.tvdbId ? 'tmdb' : (mi.igdbId ? 'igdb' : (mi.audibleId ? 'audible' : (mi.goodreadsId ? 'goodreads' : 'openlibrary'))),
            needsDetails: 1,
            lastTimeUpdated: 0
          }).returning('id');
          const newId = inserted[0] && (inserted[0].id !== undefined ? inserted[0].id : inserted[0]);
          mediaItemMap.set(mi.id, newId);
          stats.mediaItemsCreated++;
        } catch (e) {
          stats.mediaItemsMissing++;
        }
      } else {
        stats.mediaItemsMissing++;
      }
    }

    // 2. Match episodes via mapped tvShowId + seasonNumber + episodeNumber
    const episodeMap = new Map();
    for (const ep of (data.episodes || [])) {
      const newShowId = mediaItemMap.get(ep.tvShowId);
      if (!newShowId) continue;
      const existing = await knex('episode').where({ tvShowId: newShowId, seasonNumber: ep.seasonNumber, episodeNumber: ep.episodeNumber }).first();
      if (existing) { episodeMap.set(ep.id, existing.id); stats.episodesMatched++; }
    }

    // 3. Lists: match watchlist by isWatchlist, others by name. Create missing.
    const listMap = new Map();
    for (const list of (data.lists || [])) {
      let existing = list.isWatchlist
        ? await knex('list').where({ userId, isWatchlist: true }).first()
        : await knex('list').where({ userId, name: list.name }).first();
      if (existing) { listMap.set(list.id, existing.id); stats.listsExisting++; }
      else {
        const inserted = await knex('list').insert({
          userId, name: list.name, description: list.description || null,
          isWatchlist: list.isWatchlist ? 1 : 0,
          privacy: list.privacy || 'private',
          createdAt: list.createdAt || Date.now(),
          updatedAt: list.updatedAt || Date.now()
        }).returning('id');
        const newId = inserted[0] && (inserted[0].id || inserted[0]);
        listMap.set(list.id, newId);
        stats.listsCreated++;
      }
    }

    // Steps 4-7 refactored: bulk dedup-and-insert for listItem/seen/userRating/progress.
    // Was N×.first() + N inserts per table; now 1 bulk SELECT + 1 chunked INSERT
    // per table. SQLite param limit is 999 so we chunk inserts at 100 rows.
    const _bulkInsert = async (table, rows) => {
      const CHUNK = 100;
      for (let i = 0; i < rows.length; i += CHUNK) {
        await knex(table).insert(rows.slice(i, i + CHUNK));
      }
    };

    // 4. List items
    {
      const valid = [];
      let skipped = 0;
      for (const li of (data.listItems || [])) {
        const newMI = mediaItemMap.get(li.mediaItemId);
        const newList = listMap.get(li.listId);
        if (!newMI || !newList) { skipped++; continue; }
        valid.push({ li, newMI, newList });
      }
      if (valid.length > 0) {
        const listIds = [...new Set(valid.map(v => v.newList))];
        const miIds = [...new Set(valid.map(v => v.newMI))];
        const existing = await knex('listItem').whereIn('listId', listIds).whereIn('mediaItemId', miIds).select('listId','mediaItemId','seasonId','episodeId');
        const existingSet = new Set(existing.map(e => e.listId+'|'+e.mediaItemId+'|'+(e.seasonId||'')+'|'+(e.episodeId||'')));
        const toInsert = [];
        for (const v of valid) {
          const key = v.newList+'|'+v.newMI+'|'+(v.li.seasonId||'')+'|'+(v.li.episodeId||'');
          if (existingSet.has(key)) { skipped++; continue; }
          existingSet.add(key);
          toInsert.push({ listId: v.newList, mediaItemId: v.newMI, seasonId: v.li.seasonId || null, episodeId: v.li.episodeId || null, addedAt: v.li.addedAt || Date.now() });
        }
        if (toInsert.length) await _bulkInsert('listItem', toInsert);
        stats.listItemsImported = toInsert.length;
      }
      stats.listItemsSkipped = skipped;
    }

    // 5. Seen
    {
      const valid = [];
      let missing = 0;
      for (const s of (data.seen || [])) {
        const newMI = mediaItemMap.get(s.mediaItemId);
        if (!newMI) { missing++; continue; }
        let newEp = null;
        if (s.episodeId) {
          newEp = episodeMap.get(s.episodeId);
          if (!newEp) { missing++; continue; }
        }
        valid.push({ s, newMI, newEp });
      }
      let skipped = 0;
      if (valid.length > 0) {
        const miIds = [...new Set(valid.map(v => v.newMI))];
        const existing = await knex('seen').where('userId', userId).whereIn('mediaItemId', miIds).select('mediaItemId','episodeId','date');
        const existingSet = new Set(existing.map(e => e.mediaItemId+'|'+(e.episodeId||'')+'|'+e.date));
        const toInsert = [];
        for (const v of valid) {
          const key = v.newMI+'|'+(v.newEp||'')+'|'+v.s.date;
          if (existingSet.has(key)) { skipped++; continue; }
          existingSet.add(key);
          toInsert.push({ userId, mediaItemId: v.newMI, episodeId: v.newEp || null, date: v.s.date, duration: v.s.duration || null });
        }
        if (toInsert.length) await _bulkInsert('seen', toInsert);
        stats.seenImported = toInsert.length;
      }
      stats.seenSkipped = skipped;
      stats.seenMissing = missing;
    }

    // 6. Ratings
    {
      const valid = [];
      for (const r of (data.ratings || [])) {
        const newMI = mediaItemMap.get(r.mediaItemId);
        if (!newMI) continue;
        valid.push({ r, newMI });
      }
      let skipped = 0;
      if (valid.length > 0) {
        const miIds = [...new Set(valid.map(v => v.newMI))];
        const existing = await knex('userRating').where('userId', userId).whereIn('mediaItemId', miIds).select('mediaItemId','seasonId','episodeId');
        const existingSet = new Set(existing.map(e => e.mediaItemId+'|'+(e.seasonId||'')+'|'+(e.episodeId||'')));
        const toInsert = [];
        for (const v of valid) {
          const key = v.newMI+'|'+(v.r.seasonId||'')+'|'+(v.r.episodeId||'');
          if (existingSet.has(key)) { skipped++; continue; }
          existingSet.add(key);
          toInsert.push({ userId, mediaItemId: v.newMI, seasonId: v.r.seasonId || null, episodeId: v.r.episodeId || null, rating: v.r.rating, review: v.r.review || null, date: v.r.date || Date.now() });
        }
        if (toInsert.length) await _bulkInsert('userRating', toInsert);
        stats.ratingsImported = toInsert.length;
      }
      stats.ratingsSkipped = skipped;
    }

    // 7. Progress
    {
      const valid = [];
      for (const p of (data.progress || [])) {
        const newMI = mediaItemMap.get(p.mediaItemId);
        if (!newMI) continue;
        const newEp = p.episodeId ? episodeMap.get(p.episodeId) : null;
        if (p.episodeId && !newEp) continue;
        valid.push({ p, newMI, newEp });
      }
      let skipped = 0;
      if (valid.length > 0) {
        const miIds = [...new Set(valid.map(v => v.newMI))];
        const existing = await knex('progress').where('userId', userId).whereIn('mediaItemId', miIds).select('mediaItemId','episodeId');
        const existingSet = new Set(existing.map(e => e.mediaItemId+'|'+(e.episodeId||'')));
        const toInsert = [];
        for (const v of valid) {
          const key = v.newMI+'|'+(v.newEp||'');
          if (existingSet.has(key)) { skipped++; continue; }
          existingSet.add(key);
          toInsert.push({ userId, mediaItemId: v.newMI, episodeId: v.newEp || null, progress: v.p.progress, date: v.p.date || Date.now(), duration: v.p.duration || null, action: v.p.action || null });
        }
        if (toInsert.length) await _bulkInsert('progress', toInsert);
        stats.progressImported = toInsert.length;
      }
      stats.progressSkipped = skipped;
    }

    res.json({ ok: true, ...stats });
  });
  exportLetterboxd = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const userId = Number(req.user);
    const knex = _dbconfig.Database.knex;
    // Letterboxd diary-import format columns:
    //   Date,Name,Year,Rating,Rewatch,Watched Date,Tags
    // Letterboxd is movies-only — export only seen entries that map to mediaType=movie.
    // Aggregate into one row per (movie, watched date), with Rewatch flagged on duplicates per movie.
    const rows = await knex('seen')
      .join('mediaItem', 'mediaItem.id', 'seen.mediaItemId')
      .leftJoin('userRating', qb => qb.on('userRating.mediaItemId', 'mediaItem.id').andOnVal('userRating.userId', userId).andOnNull('userRating.seasonId').andOnNull('userRating.episodeId'))
      .where('seen.userId', userId)
      .where('mediaItem.mediaType', 'movie')
      .whereNotNull('seen.date')
      .select(knex.raw('mediaItem.title AS title'), knex.raw("substr(mediaItem.releaseDate, 1, 4) AS year"), 'seen.date AS watchedAt', 'userRating.rating AS rating')
      .orderBy('seen.date', 'asc');
    const csvEscape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\\n')) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const seenTitles = new Map(); // title|year -> count, to flag rewatches
    const lines = ['Date,Name,Year,Rating,Rewatch,WatchedDate'];
    for (const r of rows) {
      const watchDate = new Date(Number(r.watchedAt));
      const dateStr = watchDate.toISOString().slice(0, 10);
      const key = (r.title || '') + '|' + (r.year || '');
      const isRewatch = seenTitles.has(key);
      seenTitles.set(key, (seenTitles.get(key) || 0) + 1);
      // Letterboxd rating is 0.5–5; MT rating is typically 0–10 (scale by /2)
      const lbRating = r.rating ? (Math.round((r.rating / 2) * 2) / 2) : '';
      lines.push([
        dateStr,
        csvEscape(r.title),
        r.year || '',
        lbRating,
        isRewatch ? 'true' : '',
        dateStr
      ].join(','));
    }
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', 'attachment; filename="letterboxd-' + date + '.csv"');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(lines.join('\\n'));
  });
  restoreBackup = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs');
    const dest = '/storage/data.db.uploaded';
    try {
      await new Promise((resolve, reject) => {
        const w = fs.createWriteStream(dest);
        req.on('error', reject);
        w.on('error', reject);
        w.on('finish', resolve);
        req.pipe(w);
      });
      const stat = fs.statSync(dest);
      // Sanity check: SQLite files start with 'SQLite format 3\\u0000'
      const fd = fs.openSync(dest, 'r');
      const header = Buffer.alloc(16);
      fs.readSync(fd, header, 0, 16, 0);
      fs.closeSync(fd);
      if (header.toString('utf8', 0, 15) !== 'SQLite format 3') {
        fs.unlinkSync(dest);
        res.status(400).json({ error: 'El archivo subido no es una base SQLite válida' });
        return;
      }
      res.json({ ok: true, size: stat.size, message: 'Archivo subido. Reinicia el contenedor para aplicar.' });
    } catch (e) {
      try { fs.unlinkSync(dest); } catch(_) {}
      res.status(500).json({ error: e.message });
    }
  });
`;

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('backup controller: anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('backup controller: download + export(v2 with episodes) + import + restore methods installed');
