const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('// seenEpisodes-short-circuited')) { console.log('items short-circuit seenEpisodes: already patched'); process.exit(0); }

// Short-circuit the seenEpisodes inner subquery for non-tv mediaTypes. The subquery
// scans all 31k seen rows + episode joins + groups twice. For movies/books/games
// it produces zero useful rows but still pays the materialization cost (~1.5s).
const old = "qb => qb.select('mediaItemId').from('seen').where('userId', userId).whereNotNull('episodeId').groupBy('mediaItemId', 'episodeId').leftJoin('episode', 'episode.id', 'seen.episodeId').whereNot('episode.isSpecialEpisode', true).as('seen')";
const fresh = "qb => qb.select('mediaItemId').from('seen').modify(function(qq){if(typeof mediaType!=='undefined'&&mediaType&&mediaType!=='tv')qq.whereRaw('1=0')}).where('userId', userId).whereNotNull('episodeId').groupBy('mediaItemId', 'episodeId').leftJoin('episode', 'episode.id', 'seen.episodeId').whereNot('episode.isSpecialEpisode', true).as('seen') /* seenEpisodes-short-circuited */";

if (!c.includes(old)) { console.error('items short-circuit seenEpisodes: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('items short-circuit seenEpisodes: skip 31k-row materialization for non-tv mediaTypes');
