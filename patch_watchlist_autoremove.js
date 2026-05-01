const fs = require('fs');
const path = '/app/build/controllers/seen.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('_removeFromWatchlistIfComplete')) { console.log('watchlist auto-remove: already patched'); process.exit(0); }

// Helper at module top: delete from watchlist when an item is "complete".
// - Non-tv: complete after any seen entry
// - TV: complete only when no unwatched non-special aired episodes remain
const helper = "\n" +
"async function _removeFromWatchlistIfComplete(userId, mediaItem) {\n" +
"  try {\n" +
"    const knex = _dbconfig.Database.knex;\n" +
"    let isComplete = false;\n" +
"    if (mediaItem.mediaType !== 'tv') {\n" +
"      isComplete = true;\n" +
"    } else {\n" +
"      const today = new Date().toISOString().slice(0, 10);\n" +
"      const unwatched = await knex('episode')\n" +
"        .where('episode.tvShowId', mediaItem.id)\n" +
"        .where('episode.isSpecialEpisode', false)\n" +
"        .whereNotNull('episode.releaseDate')\n" +
"        .where('episode.releaseDate', '<=', today)\n" +
"        .whereNotExists(function() { this.from('seen').whereRaw('seen.episodeId = episode.id').where('seen.userId', userId); })\n" +
"        .count('* as c').first();\n" +
"      isComplete = (Number(unwatched && unwatched.c) || 0) === 0;\n" +
"    }\n" +
"    if (!isComplete) return;\n" +
"    await knex('listItem')\n" +
"      .whereIn('listId', knex('list').select('id').where({ userId, isWatchlist: true }))\n" +
"      .where('mediaItemId', mediaItem.id)\n" +
"      .whereNull('seasonId')\n" +
"      .whereNull('episodeId')\n" +
"      .delete();\n" +
"  } catch (_) { /* fire-and-forget */ }\n" +
"}\n";

const headerAnchor = 'exports.SeenController = void 0;';
if (!c.includes(headerAnchor)) { console.error('watchlist auto-remove: header anchor not found'); process.exit(1); }
c = c.replace(headerAnchor, headerAnchor + helper);

// Hook into addSingleSeen — after the seen insert, fire the watchlist cleanup
const txAnchor = '    });\n    _jfPushPlayed(mediaItem, episode, userId);\n    res.status(200);';
const txPatched = '    });\n    _jfPushPlayed(mediaItem, episode, userId);\n    _removeFromWatchlistIfComplete(userId, mediaItem);\n    res.status(200);';
if (!c.includes(txAnchor)) { console.error('watchlist auto-remove: tx anchor not found'); process.exit(1); }
c = c.replace(txAnchor, txPatched);

fs.writeFileSync(path, c);
console.log('watchlist auto-remove: hooked into addSingleSeen');
