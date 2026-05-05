const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('// simple-count-fast-path')) { console.log('items simple count: already patched'); process.exit(0); }

// Replace the heavy COUNT query (which clones all joins → 5.4s on movies) with
// a fast-path simple count when there are no filters that depend on the joined
// tables. The total is still consistent for the common "browse the tab" case
// because none of those filters are active. Falls through to the heavy count
// only when a join-based filter is actually requested.
const old = "const sqlCountQuery = query.clone().clearOrder().clearSelect().count('*', {\n    as: 'count'\n  });";
const fresh = `const _knex = _dbconfig.Database.knex;
  const _applyMt = qb => { if (mediaType) qb.where('mediaType', mediaType); if (mediaItemIds) qb.whereIn('id', mediaItemIds); };
  let sqlCountQuery;
  if (filter) {
    sqlCountQuery = query.clone().clearOrder().clearSelect().count('*', { as: 'count' });
  } else if (onlyOnWatchlist) {
    sqlCountQuery = _knex('mediaItem').modify(_applyMt).whereIn('id',
      _knex('listItem').select('mediaItemId')
        .join('list', 'list.id', 'listItem.listId')
        .where('list.userId', userId).where('list.isWatchlist', true)
    ).count('* as count');
  } else if (onlyWithProgress) {
    // For TV: must have at least one seen episode AND at least one aired non-special
    // episode still unwatched. The orig fast-path was missing the "still unwatched"
    // condition, counting completed series as "in progress" (303 vs real 61).
    // For non-TV: also covers audiobooks/listening progress on books (audioProgress
    // strictly between 0 and 1, including a re-listen after the book was finished).
    sqlCountQuery = _knex('mediaItem').modify(_applyMt).where(qb => qb
      .whereExists(qbb => qbb.from('progress').whereRaw('progress.mediaItemId = mediaItem.id').where('progress.userId', userId).where('progress.progress', '<', 1))
      .orWhere(qb2 => qb2.where('mediaItem.mediaType', 'tv')
        .whereExists(qbb => qbb.from('seen').whereRaw('seen.mediaItemId = mediaItem.id').where('seen.userId', userId))
        .whereExists(qbe => qbe.from('episode').whereRaw('episode.tvShowId = mediaItem.id')
          .where('episode.isSpecialEpisode', false)
          .whereNotNull('episode.releaseDate')
          .where('episode.releaseDate', '<=', currentDateString)
          .whereNotExists(qbs => qbs.from('seen').whereRaw('seen.episodeId = episode.id').where('seen.userId', userId))
        ))
      .orWhere(qb3 => qb3.whereNot('mediaItem.mediaType', 'tv').where('mediaItem.audioProgress', '>', 0).where('mediaItem.audioProgress', '<', 1))
    ).count('* as count');
  } else if (onlyWithNextAiring) {
    sqlCountQuery = _knex('mediaItem').modify(_applyMt).where(qb => qb
      .where(qb1 => qb1.whereNot('mediaType', 'tv').where('releaseDate', '>', currentDateString))
      .orWhere(qb2 => qb2.where('mediaType', 'tv').whereExists(qbb => qbb.from('episode').whereRaw('episode.tvShowId = mediaItem.id').where('episode.isSpecialEpisode', false).where('episode.releaseDate', '>', currentDateString)))
    ).count('* as count');
  } else if (onlyWithNextEpisodesToWatch) {
    sqlCountQuery = _knex('mediaItem').where('mediaType', 'tv')
      .whereExists(qb => qb.from('episode').whereRaw('episode.tvShowId = mediaItem.id')
        .where('episode.isSpecialEpisode', false)
        .where('episode.releaseDate', '<=', currentDateString)
        .whereNotExists(qbb => qbb.from('seen').whereRaw('seen.episodeId = episode.id').where('seen.userId', userId))
      ).count('* as count');
  } else if (onlySeenItems) {
    sqlCountQuery = _knex('mediaItem').modify(_applyMt)
      .whereExists(qb => qb.from('seen').whereRaw('seen.mediaItemId = mediaItem.id').where('seen.userId', userId))
      .count('* as count');
  } else if (onlyWithUserRating) {
    sqlCountQuery = _knex('mediaItem').modify(_applyMt)
      .whereExists(qb => qb.from('userRating').whereRaw('userRating.mediaItemId = mediaItem.id').where('userRating.userId', userId).whereNotNull('userRating.rating'))
      .count('* as count');
  } else if (onlyWithoutUserRating) {
    sqlCountQuery = _knex('mediaItem').modify(_applyMt)
      .whereNotExists(qb => qb.from('userRating').whereRaw('userRating.mediaItemId = mediaItem.id').where('userRating.userId', userId).whereNotNull('userRating.rating'))
      .count('* as count');
  } else if (onlyPlayed) {
    sqlCountQuery = _knex('mediaItem').modify(_applyMt)
      .whereExists(qb => qb.from('seen').whereRaw('seen.mediaItemId = mediaItem.id').where('seen.userId', userId).where('seen.kind', 'played'))
      .count('* as count');
  } else if (onlyWatched) {
    sqlCountQuery = _knex('mediaItem').modify(_applyMt)
      .whereExists(qb => qb.from('seen').whereRaw('seen.mediaItemId = mediaItem.id').where('seen.userId', userId).where('seen.kind', 'watched'))
      .count('* as count');
  } else {
    sqlCountQuery = _knex('mediaItem').modify(_applyMt).count('* as count');
  } // count-fast-path`;

// Make this idempotent: strip any previous count-fast-path block, then inject the new one
c = c.replace(/const _knex = _dbconfig\.Database\.knex;\n  const _applyMt = qb => \{[\s\S]*?\} \/\/ count-fast-path/, old);
if (!c.includes(old)) { console.error('items simple count: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('items simple count: heavy COUNT skipped when no join filters');
