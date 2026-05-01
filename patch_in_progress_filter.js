// Extend the "En progreso" (onlyWithProgress) filter to also match TV shows where
// the firstUnwatchedEpisode has progress > 0 (partial episode watching).
const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

const old = "query.where(qb => qb.where(qb => qb.whereNot('mediaItem.mediaType', 'tv').whereNotNull('progress.mediaItemId')).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').where('seenEpisodesCount', '>', 0).andWhere('unseenEpisodesCount', '>', 0)));";

const fresh = "query.where(qb => qb.where(qb => qb.whereNot('mediaItem.mediaType', 'tv').whereNotNull('progress.mediaItemId')).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').where('seenEpisodesCount', '>', 0).andWhere('unseenEpisodesCount', '>', 0)).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').andWhere('firstUnwatchedEpisode.progress', '>', 0)));";

if (c.includes(fresh)) {
  console.log('in-progress filter: already patched');
} else if (!c.includes(old)) {
  console.error('in-progress filter: anchor not found'); process.exit(1);
} else {
  c = c.replace(old, fresh);
  fs.writeFileSync(path, c);
  console.log('in-progress filter: now matches TV shows with firstUnwatchedEpisode.progress > 0');
}
