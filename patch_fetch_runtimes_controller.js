const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('fetchEpisodeRuntimes')) { console.log('fetch-runtimes controller: already patched'); process.exit(0); }

const method = `  fetchEpisodeRuntimes = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const { mediaItemId } = req.query;
    const item = await _dbconfig.Database.knex('mediaItem').select('id','tmdbId','mediaType').where('id', mediaItemId).first();
    if (!item || item.mediaType !== 'tv' || !item.tmdbId) { res.status(400).json({error:'Item must be a TV show with tmdbId'}); return; }
    // Resolve TMDB key: env var first, then user-stored UI key in /storage/tmdb-key.json.
    let TMDB_KEY = process.env.TMDB_API_KEY;
    if (!TMDB_KEY) {
      try { TMDB_KEY = (JSON.parse(require('fs').readFileSync('/storage/tmdb-key.json','utf8')).apiKey || '').trim() || null; } catch(_) { TMDB_KEY = null; }
    }
    if (!TMDB_KEY) {
      res.status(503).json({ error: 'TMDB API key no configurada. Pégala en Tokens de aplicación (Tokens TMDB) o define TMDB_API_KEY en docker-compose.yml.' });
      return;
    }
    const https = require('https');
    const fetchSeason = (sn) => new Promise((ok, fail) => {
      const url = \`https://api.themoviedb.org/3/tv/\${item.tmdbId}/season/\${sn}?api_key=\${TMDB_KEY}\`;
      let data = '';
      https.get(url, r => {
        r.on('data', d => data += d);
        r.on('end', () => { try { ok(JSON.parse(data)); } catch(e) { ok(null); } });
      }).on('error', () => ok(null));
    });
    const seasonNumbers = (await _dbconfig.Database.knex('episode').distinct('seasonNumber').where('tvShowId', item.id)).map(r => r.seasonNumber);
    let updated = 0, totalSeasons = 0;
    for (const sn of seasonNumbers) {
      const data = await fetchSeason(sn);
      if (!data || !Array.isArray(data.episodes)) continue;
      totalSeasons++;
      for (const ep of data.episodes) {
        if (typeof ep.runtime !== 'number') continue;
        const result = await _dbconfig.Database.knex('episode')
          .update({ runtime: ep.runtime })
          .where('tvShowId', item.id)
          .where('seasonNumber', sn)
          .where('episodeNumber', ep.episode_number);
        if (result > 0) updated++;
      }
    }
    res.json({ ok: true, updated, totalSeasons });
  });
`;
const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('fetch-runtimes controller: close anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('fetch-runtimes controller: added fetchEpisodeRuntimes method');
