// "En proceso" (onlyWithProgress) filter:
//
//   * Auto-include if any of these is true (the five "default" cláusulas):
//     1. Non-TV with progress entry (started but not finished)
//     2. TV with at least 1 episode seen and 1 unseen
//     3. TV with the first-unwatched episode partially watched (progress > 0)
//     4. Item on the watchlist whose release has already happened
//          - non-TV: mediaItem.releaseDate <= today AND no seen entry at all.
//          - TV: at least one already-aired unwatched episode.
//     5. Non-TV with audioProgress strictly between 0 and 1 (audiobook /
//        listening in progress, including "second re-listen" after finishing).
//   * Hard-include override: user clicked "Marcar como en proceso" (row in
//     activelyInProgress with excluded=0) → always show.
//   * Hard-exclude override: user clicked "Quitar de en proceso" (row in
//     activelyInProgress with excluded=1) → never show, even if cláusulas 1-5
//     would have matched.
//
// SQL shape:
//   WHERE (
//     NOT EXISTS (activelyInProgress where excluded=1)
//     AND (clause1 OR clause2 OR clause3 OR clause4 OR clause5)
//   ) OR EXISTS (activelyInProgress where excluded=0)
const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

const upstream = "query.where(qb => qb.where(qb => qb.whereNot('mediaItem.mediaType', 'tv').whereNotNull('progress.mediaItemId')).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').where('seenEpisodesCount', '>', 0).andWhere('unseenEpisodesCount', '>', 0)));";

// v4 — without audioProgress clause (kept as a recognized shape so re-applies
// over a v4-installed bundle bump cleanly to v5 without re-running build from
// scratch).
const v4 = "query.where(qb => qb.where(sub => sub.whereNotExists(function() { this.from('activelyInProgress').whereRaw('activelyInProgress.mediaItemId = mediaItem.id').where('activelyInProgress.userId', userId).where('activelyInProgress.excluded', true); }).andWhere(inner => inner.where(qb => qb.whereNot('mediaItem.mediaType', 'tv').whereNotNull('progress.mediaItemId')).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').where('seenEpisodesCount', '>', 0).andWhere('unseenEpisodesCount', '>', 0)).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').andWhere('firstUnwatchedEpisode.progress', '>', 0)).orWhere(qb => qb.whereNotNull('listItem.mediaItemId').andWhere(s2 => s2.where(qb => qb.whereNot('mediaItem.mediaType', 'tv').whereNotNull('mediaItem.releaseDate').whereNot('mediaItem.releaseDate', '').where('mediaItem.releaseDate', '<=', currentDateString).whereNull('lastSeen.mediaItemId')).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').whereNotNull('firstUnwatchedEpisode.tvShowId')))))).orWhere(qb => qb.whereExists(function() { this.from('activelyInProgress').whereRaw('activelyInProgress.mediaItemId = mediaItem.id').where('activelyInProgress.userId', userId).where('activelyInProgress.excluded', false); })));";

// v5 — adds clause 5 (audioProgress between 0 and 1, non-tv) so audiobooks /
// listening progress on books surface on /in-progress and re-appear on a
// second listen even if a 'watched' seen row already exists.
const fresh = "query.where(qb => qb.where(sub => sub.whereNotExists(function() { this.from('activelyInProgress').whereRaw('activelyInProgress.mediaItemId = mediaItem.id').where('activelyInProgress.userId', userId).where('activelyInProgress.excluded', true); }).andWhere(inner => inner.where(qb => qb.whereNot('mediaItem.mediaType', 'tv').whereNotNull('progress.mediaItemId')).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').where('seenEpisodesCount', '>', 0).andWhere('unseenEpisodesCount', '>', 0)).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').andWhere('firstUnwatchedEpisode.progress', '>', 0)).orWhere(qb => qb.whereNotNull('listItem.mediaItemId').andWhere(s2 => s2.where(qb => qb.whereNot('mediaItem.mediaType', 'tv').whereNotNull('mediaItem.releaseDate').whereNot('mediaItem.releaseDate', '').where('mediaItem.releaseDate', '<=', currentDateString).whereNull('lastSeen.mediaItemId')).orWhere(qb => qb.where('mediaItem.mediaType', 'tv').whereNotNull('firstUnwatchedEpisode.tvShowId')))).orWhere(qb => qb.whereNot('mediaItem.mediaType', 'tv').where('mediaItem.audioProgress', '>', 0).where('mediaItem.audioProgress', '<', 1)))).orWhere(qb => qb.whereExists(function() { this.from('activelyInProgress').whereRaw('activelyInProgress.mediaItemId = mediaItem.id').where('activelyInProgress.userId', userId).where('activelyInProgress.excluded', false); })));";

if (c.includes(fresh)) {
  console.log('in-progress filter: already at v5 (audioProgress clause)');
} else if (c.includes(v4)) {
  c = c.replace(v4, fresh);
  fs.writeFileSync(path, c);
  console.log('in-progress filter: bumped v4 → v5 (audioProgress clause)');
} else if (c.includes(upstream)) {
  c = c.replace(upstream, fresh);
  fs.writeFileSync(path, c);
  console.log('in-progress filter: applied v5 over upstream');
} else {
  console.error('in-progress filter: neither v4 nor upstream anchor found'); process.exit(1);
}
