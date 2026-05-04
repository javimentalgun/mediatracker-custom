const fs = require('fs');
const path = '/app/build/controllers/seen.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('_jfPushPlayed')) { console.log('jellyfin reverse: already patched'); process.exit(0); }

// Helper inserted at the top of the file (after the export). Reads env vars and
// fire-and-forgets a Jellyfin /PlayedItems POST when an MT seen entry is added.
const helper = "\n" +
"// --- Jellyfin reverse-sync helper (MT seen → Jellyfin played) ---\n" +
"async function _jfPushPlayed(mediaItem, episode) {\n" +
"  if (process.env.JELLYFIN_REVERSE_SYNC !== 'true') return;\n" +
"  const url = process.env.JELLYFIN_URL;\n" +
"  const token = process.env.JELLYFIN_API_KEY;\n" +
"  if (!url || !token) return;\n" +
"  try {\n" +
"    const base = url.replace(/\\/+$/, '');\n" +
"    const headers = { 'X-Emby-Token': token, 'Accept': 'application/json' };\n" +
"    let userId = process.env.JELLYFIN_USER_ID;\n" +
"    if (!userId) {\n" +
"      const ru = await fetch(base + '/Users', { headers });\n" +
"      if (!ru.ok) return;\n" +
"      const users = await ru.json();\n" +
"      userId = users && users[0] && users[0].Id;\n" +
"      if (!userId) return;\n" +
"    }\n" +
"    // Jellyfin's AnyProviderIdEquals is broken on 10.10.x — list all items of the\n" +
"    // right type and filter client-side (cached in memory for 5 min).\n" +
"    if (!global._jfReverseCache) global._jfReverseCache = new Map();\n" +
"    const cacheKey = userId + ':' + (episode ? 'Series' : 'Movie');\n" +
"    let entry = global._jfReverseCache.get(cacheKey);\n" +
"    if (!entry || (Date.now() - entry.at) > 5 * 60 * 1000) {\n" +
"      const types = episode ? 'Series' : 'Movie';\n" +
"      const lr = await fetch(base + '/Users/' + userId + '/Items?Recursive=true&IncludeItemTypes=' + types + '&Fields=ProviderIds&Limit=10000', { headers });\n" +
"      if (!lr.ok) return;\n" +
"      const lj = await lr.json();\n" +
"      entry = { at: Date.now(), items: lj.Items || [] };\n" +
"      global._jfReverseCache.set(cacheKey, entry); if (global._jfReverseCache.size > 1000) global._jfReverseCache.delete(global._jfReverseCache.keys().next().value);\n" +
"    }\n" +
"    let target = null;\n" +
"    const matched = entry.items.find(it => {\n" +
"      const p = it.ProviderIds || {};\n" +
"      if (mediaItem.tmdbId && p.Tmdb && String(p.Tmdb) === String(mediaItem.tmdbId)) return true;\n" +
"      if (mediaItem.imdbId && p.Imdb && String(p.Imdb) === String(mediaItem.imdbId)) return true;\n" +
"      if (episode && mediaItem.tvdbId && p.Tvdb && String(p.Tvdb) === String(mediaItem.tvdbId)) return true;\n" +
"      return false;\n" +
"    });\n" +
"    if (!matched) return;\n" +
"    if (episode) {\n" +
"      const eq = '/Users/' + userId + '/Items?Recursive=true&IncludeItemTypes=Episode&ParentId=' + matched.Id + '&ParentIndexNumber=' + episode.seasonNumber + '&IndexNumber=' + episode.episodeNumber + '&Limit=1';\n" +
"      const er = await fetch(base + eq, { headers });\n" +
"      if (!er.ok) return;\n" +
"      const ej = await er.json();\n" +
"      target = ej.Items && ej.Items[0];\n" +
"    } else {\n" +
"      target = matched;\n" +
"    }\n" +
"    if (!target) return;\n" +
"    await fetch(base + '/Users/' + userId + '/PlayedItems/' + target.Id, { method: 'POST', headers });\n" +
"  } catch (_) {}\n" +
"}\n";

const headerAnchor = 'exports.SeenController = void 0;';
if (!c.includes(headerAnchor)) { console.error('jellyfin reverse: header anchor not found'); process.exit(1); }
c = c.replace(headerAnchor, headerAnchor + helper);

// Hook in the addSingleSeen handler — fire-and-forget after the transaction
const txAnchor = '    });\n    res.status(200);';
const occurrences = c.split(txAnchor).length - 1;
if (occurrences !== 1) { console.error('jellyfin reverse: tx anchor count = ' + occurrences + ' (expected 1)'); process.exit(1); }
const txPatched = '    });\n    _jfPushPlayed(mediaItem, episode);\n    res.status(200);';
c = c.replace(txAnchor, txPatched);

fs.writeFileSync(path, c);
console.log('jellyfin reverse: helper installed + addSingleSeen hooked (env JELLYFIN_REVERSE_SYNC=true to enable)');
