// "En proceso" (onlyWithProgress) filter:
//
//   * Auto-include if any of these is true (the four "default" cláusulas):
//     1. Non-TV with progress entry (started but not finished)
//     2. TV with at least 1 episode seen and 1 unseen
//     3. TV with the first-unwatched episode partially watched (progress > 0)
//     4. Item on the watchlist whose release has already happened
//          - non-TV: mediaItem.releaseDate <= today AND no seen entry at all.
//          - TV: at least one already-aired unwatched episode.
//   * Hard-include override: user clicked "Marcar como en proceso" (row in
//     activelyInProgress with excluded=0) → always show.
//   * Hard-exclude override: user clicked "Quitar de en proceso" (row in
//     activelyInProgress with excluded=1) → never show, even if cláusulas 1-4
//     would have matched.
//
// SQL shape:
//   WHERE (
//     NOT EXISTS (activelyInProgress where excluded=1)
//     AND (clause1 OR clause2 OR clause3 OR clause4)
//   ) OR EXISTS (activelyInProgress where excluded=0)
const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

const upstream = "query.where(qb => qb.where(qb => qb.whereNot('mediaItem.mediaType', 'tv').whereNotNull('progress.mediaItemId')).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').where('seenEpisodesCount', '>', 0).andWhere('unseenEpisodesCount', '>', 0)));";

const fresh = "query.where(qb => qb.where(sub => sub.whereNotExists(function() { this.from('activelyInProgress').whereRaw('activelyInProgress.mediaItemId = mediaItem.id').where('activelyInProgress.userId', userId).where('activelyInProgress.excluded', true); }).andWhere(inner => inner.where(qb => qb.whereNot('mediaItem.mediaType', 'tv').whereNotNull('progress.mediaItemId')).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').where('seenEpisodesCount', '>', 0).andWhere('unseenEpisodesCount', '>', 0)).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').andWhere('firstUnwatchedEpisode.progress', '>', 0)).orWhere(qb => qb.whereNotNull('listItem.mediaItemId').andWhere(s2 => s2.where(qb => qb.whereNot('mediaItem.mediaType', 'tv').whereNotNull('mediaItem.releaseDate').whereNot('mediaItem.releaseDate', '').where('mediaItem.releaseDate', '<=', currentDateString).whereNull('lastSeen.mediaItemId')).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').whereNotNull('firstUnwatchedEpisode.tvShowId')))))).orWhere(qb => qb.whereExists(function() { this.from('activelyInProgress').whereRaw('activelyInProgress.mediaItemId = mediaItem.id').where('activelyInProgress.userId', userId).where('activelyInProgress.excluded', false); })));";

if (c.includes(fresh)) {
  console.log('in-progress filter: already at v4 (excluded override)');
} else if (!c.includes(upstream)) {
  console.error('in-progress filter: upstream anchor not found'); process.exit(1);
} else {
  c = c.replace(upstream, fresh);
  fs.writeFileSync(path, c);
  console.log('in-progress filter: now honors activelyInProgress.excluded as override');
}
