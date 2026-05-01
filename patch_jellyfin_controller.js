const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('jellyfinSync') && c.includes('jellyfinLookup') && c.includes('jellyfinStatus')) {
  console.log('jellyfin controller: already patched'); process.exit(0);
}

// All four methods. Use string concatenation throughout to avoid template-literal nesting headaches.
// `this` works because class field arrow functions bind to the instance.
const method =
"  jellyfinFetch = async (subpath) => {\n" +
"    const fs = require('fs');\n" +
"    const url = process.env.JELLYFIN_URL;\n" +
"    const token = process.env.JELLYFIN_API_KEY;\n" +
"    if (!url || !token) throw new Error('Jellyfin not configured (set JELLYFIN_URL and JELLYFIN_API_KEY in docker-compose.yml)');\n" +
"    const base = url.replace(/\\/+$/, '');\n" +
"    const r = await fetch(base + subpath, { headers: { 'X-Emby-Token': token, 'Accept': 'application/json' } });\n" +
"    if (!r.ok) throw new Error('Jellyfin HTTP ' + r.status + ' on ' + subpath);\n" +
"    return r.json();\n" +
"  };\n" +
"  jellyfinUserId = async () => {\n" +
"    if (process.env.JELLYFIN_USER_ID) return process.env.JELLYFIN_USER_ID;\n" +
"    const users = await this.jellyfinFetch('/Users');\n" +
"    if (!users || !users[0]) throw new Error('No users on Jellyfin server');\n" +
"    return users[0].Id;\n" +
"  };\n" +
"  jellyfinStatus = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
"    const fs = require('fs');\n" +
"    const url = process.env.JELLYFIN_URL;\n" +
"    const token = process.env.JELLYFIN_API_KEY;\n" +
"    if (!url || !token) { res.json({ configured: false }); return; }\n" +
"    let state = {};\n" +
"    try { state = JSON.parse(fs.readFileSync('/storage/jellyfin-state.json', 'utf8')); } catch (_) {}\n" +
"    try {\n" +
"      const info = await this.jellyfinFetch('/System/Info');\n" +
"      const userId = await this.jellyfinUserId();\n" +
"      res.json(Object.assign({ configured: true, connected: true, serverName: info.ServerName, version: info.Version, userId }, state));\n" +
"    } catch (e) {\n" +
"      res.json(Object.assign({ configured: true, connected: false, error: e.message }, state));\n" +
"    }\n" +
"  });\n" +
"  jellyfinSync = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
"    const fs = require('fs');\n" +
"    const userId = Number(req.user);\n" +
"    const knex = _dbconfig.Database.knex;\n" +
"    try {\n" +
"      const jfUserId = await this.jellyfinUserId();\n" +
"      const playedRes = await this.jellyfinFetch('/Users/' + jfUserId + '/Items?Filters=IsPlayed&Recursive=true&IncludeItemTypes=Movie,Episode&Fields=ProviderIds,UserData&Limit=10000');\n" +
"      const items = (playedRes && playedRes.Items) || [];\n" +
"      const seriesCache = new Map();\n" +
"      let imported = 0, skipped = 0, unmatched = 0;\n" +
"      for (const it of items) {\n" +
"        const ud = it.UserData || {};\n" +
"        const date = ud.LastPlayedDate ? new Date(ud.LastPlayedDate).getTime() : Date.now();\n" +
"        if (it.Type === 'Movie') {\n" +
"          const pids = it.ProviderIds || {};\n" +
"          const tmdb = pids.Tmdb ? Number(pids.Tmdb) : null;\n" +
"          const imdb = pids.Imdb || null;\n" +
"          let media = null;\n" +
"          if (tmdb) media = await knex('mediaItem').where({ mediaType: 'movie', tmdbId: tmdb }).first();\n" +
"          if (!media && imdb) media = await knex('mediaItem').where({ mediaType: 'movie', imdbId: imdb }).first();\n" +
"          if (!media) { unmatched++; continue; }\n" +
"          const exists = await knex('seen').where({ userId, mediaItemId: media.id, date }).first();\n" +
"          if (exists) { skipped++; continue; }\n" +
"          await knex('seen').insert({ userId, mediaItemId: media.id, episodeId: null, date });\n" +
"          imported++;\n" +
"        } else if (it.Type === 'Episode' && it.SeriesId && it.ParentIndexNumber != null && it.IndexNumber != null) {\n" +
"          let series = seriesCache.get(it.SeriesId);\n" +
"          if (series === undefined) {\n" +
"            try { const s = await this.jellyfinFetch('/Users/' + jfUserId + '/Items/' + it.SeriesId + '?Fields=ProviderIds'); series = (s && s.ProviderIds) || {}; }\n" +
"            catch (_) { series = {}; }\n" +
"            seriesCache.set(it.SeriesId, series);\n" +
"          }\n" +
"          const tvdb = series.Tvdb ? Number(series.Tvdb) : null;\n" +
"          const tmdb = series.Tmdb ? Number(series.Tmdb) : null;\n" +
"          const imdb = series.Imdb || null;\n" +
"          let show = null;\n" +
"          if (tvdb) show = await knex('mediaItem').where({ mediaType: 'tv', tvdbId: tvdb }).first();\n" +
"          if (!show && tmdb) show = await knex('mediaItem').where({ mediaType: 'tv', tmdbId: tmdb }).first();\n" +
"          if (!show && imdb) show = await knex('mediaItem').where({ mediaType: 'tv', imdbId: imdb }).first();\n" +
"          if (!show) { unmatched++; continue; }\n" +
"          const ep = await knex('episode').where({ tvShowId: show.id, seasonNumber: it.ParentIndexNumber, episodeNumber: it.IndexNumber }).first();\n" +
"          if (!ep) { unmatched++; continue; }\n" +
"          const exists = await knex('seen').where({ userId, mediaItemId: show.id, episodeId: ep.id, date }).first();\n" +
"          if (exists) { skipped++; continue; }\n" +
"          await knex('seen').insert({ userId, mediaItemId: show.id, episodeId: ep.id, date });\n" +
"          imported++;\n" +
"        } else { unmatched++; }\n" +
"      }\n" +
"      const state = { lastSync: new Date().toISOString(), lastImported: imported, lastSkipped: skipped, lastUnmatched: unmatched, lastTotal: items.length };\n" +
"      try { fs.writeFileSync('/storage/jellyfin-state.json', JSON.stringify(state)); } catch (_) {}\n" +
"      res.json(Object.assign({ ok: true }, state));\n" +
"    } catch (e) {\n" +
"      res.status(500).json({ error: e.message });\n" +
"    }\n" +
"  });\n" +
"  jellyfinSyncDownloaded = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
"    if (!process.env.JELLYFIN_URL || !process.env.JELLYFIN_API_KEY) { res.json({ ok: false, configured: false }); return; }\n" +
"    const knex = _dbconfig.Database.knex;\n" +
"    try {\n" +
"      const userId = await this.jellyfinUserId();\n" +
"      const list = await this.jellyfinFetch('/Users/' + userId + '/Items?Recursive=true&IncludeItemTypes=Movie,Series&Fields=ProviderIds&Limit=20000');\n" +
"      const items = list.Items || [];\n" +
"      let marked = 0, alreadyMarked = 0, unmatched = 0;\n" +
"      for (const it of items) {\n" +
"        const p = it.ProviderIds || {};\n" +
"        const mt = it.Type === 'Movie' ? 'movie' : it.Type === 'Series' ? 'tv' : null;\n" +
"        if (!mt) continue;\n" +
"        let media = null;\n" +
"        if (p.Tmdb) media = await knex('mediaItem').where({ mediaType: mt, tmdbId: Number(p.Tmdb) }).first();\n" +
"        if (!media && p.Imdb) media = await knex('mediaItem').where({ mediaType: mt, imdbId: p.Imdb }).first();\n" +
"        if (!media && p.Tvdb && mt === 'tv') media = await knex('mediaItem').where({ mediaType: mt, tvdbId: Number(p.Tvdb) }).first();\n" +
"        if (!media) { unmatched++; continue; }\n" +
"        if (media.downloaded) { alreadyMarked++; continue; }\n" +
"        await knex('mediaItem').where('id', media.id).update('downloaded', true);\n" +
"        marked++;\n" +
"      }\n" +
"      res.json({ ok: true, jellyfinItems: items.length, newlyMarked: marked, alreadyMarked, unmatched });\n" +
"    } catch (e) {\n" +
"      res.status(500).json({ error: e.message });\n" +
"    }\n" +
"  });\n" +
"  jellyfinLibraryIds = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
"    if (!process.env.JELLYFIN_URL || !process.env.JELLYFIN_API_KEY) { res.json({ tmdb: [], imdb: [], tvdb: [] }); return; }\n" +
"    try {\n" +
"      const userId = await this.jellyfinUserId();\n" +
"      const cacheKey = 'lib:' + userId;\n" +
"      const now = Date.now();\n" +
"      if (!global._jfLibCache) global._jfLibCache = new Map();\n" +
"      let entry = global._jfLibCache.get(cacheKey);\n" +
"      if (!entry || (now - entry.at) > 5 * 60 * 1000) {\n" +
"        const list = await this.jellyfinFetch('/Users/' + userId + '/Items?Recursive=true&IncludeItemTypes=Movie,Series&Fields=ProviderIds&Limit=20000');\n" +
"        const tmdb = [], imdb = [], tvdb = [];\n" +
"        (list.Items || []).forEach(it => {\n" +
"          const p = it.ProviderIds || {};\n" +
"          if (p.Tmdb) tmdb.push(String(p.Tmdb));\n" +
"          if (p.Imdb) imdb.push(String(p.Imdb));\n" +
"          if (p.Tvdb) tvdb.push(String(p.Tvdb));\n" +
"        });\n" +
"        entry = { at: now, ids: { tmdb, imdb, tvdb } };\n" +
"        global._jfLibCache.set(cacheKey, entry);\n" +
"      }\n" +
"      res.json(entry.ids);\n" +
"    } catch (e) {\n" +
"      res.json({ tmdb: [], imdb: [], tvdb: [], error: e.message });\n" +
"    }\n" +
"  });\n" +
"  jellyfinLookup = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
"    const url = process.env.JELLYFIN_URL;\n" +
"    if (!url || !process.env.JELLYFIN_API_KEY) { res.json({ found: false, configured: false }); return; }\n" +
"    try {\n" +
"      const userId = await this.jellyfinUserId();\n" +
"      const tmdbId = req.query.tmdbId ? String(req.query.tmdbId) : null;\n" +
"      const imdbId = req.query.imdbId ? String(req.query.imdbId) : null;\n" +
"      const tvdbId = req.query.tvdbId ? String(req.query.tvdbId) : null;\n" +
"      const mediaType = req.query.mediaType;\n" +
"      if (!tmdbId && !imdbId && !tvdbId) { res.status(400).json({ error: 'tmdbId, imdbId or tvdbId required' }); return; }\n" +
"      // Jellyfin's AnyProviderIdEquals filter is unreliable on 10.10.x — list all items\n" +
"      // of the right type once (cached in-memory for 5 min) and filter client-side.\n" +
"      const types = mediaType === 'movie' ? 'Movie' : mediaType === 'tv' ? 'Series' : 'Movie,Series';\n" +
"      const cacheKey = userId + ':' + types;\n" +
"      const now = Date.now();\n" +
"      if (!global._jfLookupCache) global._jfLookupCache = new Map();\n" +
"      let entry = global._jfLookupCache.get(cacheKey);\n" +
"      if (!entry || (now - entry.at) > 5 * 60 * 1000) {\n" +
"        const list = await this.jellyfinFetch('/Users/' + userId + '/Items?Recursive=true&IncludeItemTypes=' + types + '&Fields=ProviderIds&Limit=10000');\n" +
"        entry = { at: now, items: list.Items || [] };\n" +
"        global._jfLookupCache.set(cacheKey, entry);\n" +
"      }\n" +
"      const item = entry.items.find(it => {\n" +
"        const p = it.ProviderIds || {};\n" +
"        if (tmdbId && p.Tmdb && String(p.Tmdb) === tmdbId) return true;\n" +
"        if (imdbId && p.Imdb && String(p.Imdb) === imdbId) return true;\n" +
"        if (tvdbId && p.Tvdb && String(p.Tvdb) === tvdbId) return true;\n" +
"        return false;\n" +
"      });\n" +
"      if (!item) { res.json({ found: false }); return; }\n" +
"      const publicUrl = process.env.JELLYFIN_PUBLIC_URL || url;\n" +
"      const base = publicUrl.replace(/\\/+$/, '');\n" +
"      res.json({ found: true, itemId: item.Id, name: item.Name, type: item.Type, deeplink: base + '/web/#/details?id=' + item.Id + '&serverId=' + (item.ServerId || '') });\n" +
"    } catch (e) {\n" +
"      res.json({ found: false, error: e.message });\n" +
"    }\n" +
"  });\n";

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('jellyfin controller: anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('jellyfin controller: added 4 methods (status, sync, lookup, helpers)');
