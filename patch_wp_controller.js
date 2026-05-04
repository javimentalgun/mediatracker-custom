const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('watchProviders')) {
  // Strip prior version (had a broken `await import("node-fetch")` that always failed)
  c = c.replace(/  watchProviders = \(0, _typescriptRoutesToOpenapiServer\.createExpressRoute\)\(async \(req, res\) => \{[\s\S]*?\}\);\n/, '');
}

const old = 'exports.MediaItemController = MediaItemController;';
const method = `  watchProviders = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const { mediaItemId } = req.query;
    const item = await _dbconfig.Database.knex('mediaItem').select('tmdbId','igdbId','openlibraryId','audibleId','mediaType','title').where('id', mediaItemId).first();
    if (!item) { res.status(404).send(); return; }
    // Resolve TMDB key: env var first, then user-stored UI key in /storage/tmdb-key.json.
    let TMDB_KEY = process.env.TMDB_API_KEY;
    if (!TMDB_KEY) {
      try { TMDB_KEY = (JSON.parse(require('fs').readFileSync('/storage/tmdb-key.json','utf8')).apiKey || '').trim() || null; } catch(_) { TMDB_KEY = null; }
    }
    if (!TMDB_KEY) {
      res.status(503).json({ error: 'TMDB API key no configurada. Pégala en Tokens de aplicación (Tokens TMDB) o define TMDB_API_KEY en docker-compose.yml.' });
      return;
    }
    const results = [];
    try {
      if ((item.mediaType === 'movie' || item.mediaType === 'tv') && item.tmdbId) {
        const type = item.mediaType === 'tv' ? 'tv' : 'movie';
        const url = \`https://api.themoviedb.org/3/\${type}/\${item.tmdbId}/watch/providers?api_key=\${TMDB_KEY}\`;
        const r = await fetch(url);
        if (r.ok) {
          const data = await r.json();
          const region = (data && data.results && (data.results.ES || data.results.US)) || (data && data.results && Object.values(data.results)[0]);
          if (region) {
            const link = region.link || \`https://www.justwatch.com/es/buscar?q=\${encodeURIComponent(item.title)}\`;
            const seen = new Set();
            const pushAll = (list, kind) => (list || []).forEach(p => {
              if (seen.has(p.provider_id)) return;
              seen.add(p.provider_id);
              results.push({ name: p.provider_name, logo: \`https://image.tmdb.org/t/p/original\${p.logo_path}\`, url: link, kind });
            });
            pushAll(region.flatrate, 'streaming');
            pushAll(region.free, 'gratis');
            pushAll(region.ads, 'gratis-con-anuncios');
            pushAll(region.rent, 'alquiler');
            pushAll(region.buy, 'compra');
          }
        }
      }
      if (item.mediaType === 'video_game') {
        results.push({ name: 'Steam', logo: null, url: \`https://store.steampowered.com/search/?term=\${encodeURIComponent(item.title)}\` });
        results.push({ name: 'GOG', logo: null, url: \`https://www.gog.com/games?search=\${encodeURIComponent(item.title)}\` });
      }
      if (item.mediaType === 'book' && item.openlibraryId) {
        results.push({ name: 'OpenLibrary', logo: null, url: \`https://openlibrary.org/works/\${item.openlibraryId}\` });
        results.push({ name: 'Google Books', logo: null, url: \`https://books.google.es/books?q=\${encodeURIComponent(item.title)}\` });
      }
      if (item.mediaType === 'audiobook') {
        results.push({ name: 'Audible', logo: null, url: \`https://www.audible.es/search?keywords=\${encodeURIComponent(item.title)}\` });
        results.push({ name: 'Storytel', logo: null, url: \`https://www.storytel.com/es/es/search#q=\${encodeURIComponent(item.title)}\` });
      }
    } catch(e) {}
    res.json(results);
  });
`;

if (!c.includes('}\nexports.MediaItemController')) { console.error('wp controller: close anchor not found'); process.exit(1); }
c = c.replace('}\nexports.MediaItemController = MediaItemController;', method + '}\nexports.MediaItemController = MediaItemController;');
fs.writeFileSync(path, c);
console.log('wp controller: added watchProviders method');
