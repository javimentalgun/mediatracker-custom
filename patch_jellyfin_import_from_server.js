// /api/jellyfin/import-from-server: scan all of Jellyfin (Movies + Series)
// and, for each item:
//   - if MT already has it: mark `downloaded = 1` (option A)
//   - if MT doesn't have it: insert a stub mediaItem with provider IDs and
//     needsDetails=1 so the next metadata-refresh cycle pulls full details
//     from TMDB (option B)
//
// Also clears the in-memory `_jfLibCache` and `_jfLookupCache` so the
// "Available on Jellyfin" badge and "Play in Jellyfin" deeplink reflect the
// new contents on the next request.

const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('jellyfinImportFromServer =')) {
  console.log('jellyfin import-from-server: already patched');
} else {
  const method =
"  jellyfinImportFromServer = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
"    if (!process.env.JELLYFIN_URL || !process.env.JELLYFIN_API_KEY) { res.json({ ok: false, configured: false }); return; }\n" +
"    const knex = _dbconfig.Database.knex;\n" +
"    try {\n" +
"      const userId = await this.jellyfinUserId();\n" +
"      const list = await this.jellyfinFetch('/Users/' + userId + '/Items?Recursive=true&IncludeItemTypes=Movie,Series&Fields=ProviderIds&Limit=20000');\n" +
"      const items = list.Items || [];\n" +
"      let marked = 0, alreadyMarked = 0, created = 0, skippedNoIds = 0;\n" +
"      for (const it of items) {\n" +
"        const p = it.ProviderIds || {};\n" +
"        const mt = it.Type === 'Movie' ? 'movie' : it.Type === 'Series' ? 'tv' : null;\n" +
"        if (!mt) continue;\n" +
"        if (!p.Tmdb && !p.Imdb && !p.Tvdb) { skippedNoIds++; continue; }\n" +
"        let media = null;\n" +
"        if (p.Tmdb) media = await knex('mediaItem').where({ mediaType: mt, tmdbId: Number(p.Tmdb) }).first();\n" +
"        if (!media && p.Imdb) media = await knex('mediaItem').where({ mediaType: mt, imdbId: p.Imdb }).first();\n" +
"        if (!media && p.Tvdb && mt === 'tv') media = await knex('mediaItem').where({ mediaType: mt, tvdbId: Number(p.Tvdb) }).first();\n" +
"        if (media) {\n" +
"          if (media.downloaded) { alreadyMarked++; continue; }\n" +
"          await knex('mediaItem').where('id', media.id).update('downloaded', true);\n" +
"          marked++;\n" +
"        } else {\n" +
"          try {\n" +
"            await knex('mediaItem').insert({\n" +
"              title: it.Name || '(unknown)',\n" +
"              mediaType: mt,\n" +
"              tmdbId: p.Tmdb ? Number(p.Tmdb) : null,\n" +
"              imdbId: p.Imdb || null,\n" +
"              tvdbId: p.Tvdb && mt === 'tv' ? Number(p.Tvdb) : null,\n" +
"              source: 'tmdb',\n" +
"              needsDetails: 1,\n" +
"              lastTimeUpdated: 0,\n" +
"              downloaded: 1\n" +
"            });\n" +
"            created++;\n" +
"          } catch (e) { skippedNoIds++; }\n" +
"        }\n" +
"      }\n" +
"      if (global._jfLibCache) global._jfLibCache.clear();\n" +
"      if (global._jfLookupCache) global._jfLookupCache.clear();\n" +
"      res.json({ ok: true, jellyfinItems: items.length, newlyMarked: marked, alreadyMarked, created, skippedNoIds });\n" +
"    } catch (e) {\n" +
"      res.status(500).json({ error: e.message });\n" +
"    }\n" +
"  });\n";

  const anchor = '}\nexports.MediaItemController = MediaItemController;';
  if (!c.includes(anchor)) { console.error('jellyfin import-from-server: anchor not found'); process.exit(1); }
  c = c.replace(anchor, method + anchor);
  fs.writeFileSync(path, c);
  console.log('jellyfin import-from-server: added jellyfinImportFromServer method');
}

// Register route
const routesPath = '/app/build/generated/routes/routes.js';
let r = fs.readFileSync(routesPath, 'utf8');
if (r.includes("/api/jellyfin/import-from-server'")) {
  console.log('jellyfin import-from-server: route already registered');
} else {
  const routeAnchor = "router.post('/api/jellyfin/sync-downloaded'";
  if (!r.includes(routeAnchor)) { console.error('jellyfin import-from-server: route anchor not found'); process.exit(1); }
  const routeLine = "router.post('/api/jellyfin/import-from-server', validatorHandler({}), _MediaItemController.jellyfinImportFromServer);\n";
  r = r.replace(routeAnchor, routeLine + routeAnchor);
  fs.writeFileSync(routesPath, r);
  console.log('jellyfin import-from-server: route registered');
}
