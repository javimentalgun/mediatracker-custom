const fs = require('fs');
const path = '/app/build/controllers/calendar.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('/* CALENDAR_ALL_V2_APPLIED */')) { console.log('calendar all v2: already patched'); process.exit(0); }

// Replace getCalendarItems with a simpler query that returns episodes and non-tv items
// in the date range, without requiring the item to be in a list (watchlist or custom).
// Operates over the entire mediaItem/episode tables (which already represent the user's library).

const newImpl = `
const getCalendarItems = async args => {
  const { userId, start, end } = args;
  // Items in the user's library: any item with listItem entry, seen, rating, or progress
  const uid = Number(userId);
  // "Actively tracked" = in some list (watchlist/custom) or currently in progress.
  // Excludes items only present in 'seen' (already-watched, possibly abandoned) or
  // 'userRating' (rated then forgotten).
  const libSubquery = \`SELECT mediaItemId FROM listItem li JOIN list l ON l.id = li.listId WHERE l.userId = \${uid}
                       UNION SELECT mediaItemId FROM progress WHERE userId = \${uid} AND progress < 1\`;

  // Episodes (regular, not specials) with release date in range, only for shows in user's library
  const episodes = await _dbconfig.Database.knex('episode')
    .select({
      'episode.id': 'episode.id',
      'episode.title': 'episode.title',
      'episode.episodeNumber': 'episode.episodeNumber',
      'episode.seasonNumber': 'episode.seasonNumber',
      'episode.releaseDate': 'episode.releaseDate',
      'episode.isSpecialEpisode': 'episode.isSpecialEpisode',
      'mediaItem.id': 'mediaItem.id',
      'mediaItem.title': 'mediaItem.title',
      'mediaItem.mediaType': 'mediaItem.mediaType',
      'mediaItem.releaseDate': 'mediaItem.releaseDate',
      'episodeSeen.episodeId': 'episodeSeen.episodeId',
      'mediaItemSeen.mediaItemId': 'mediaItemSeen.mediaItemId'
    })
    .leftJoin('mediaItem', 'mediaItem.id', 'episode.tvShowId')
    .leftJoin(qb => qb.select('episodeId').from('seen').where('userId', userId).groupBy('episodeId').as('episodeSeen'), 'episodeSeen.episodeId', 'episode.id')
    .leftJoin(qb => qb.select('mediaItemId').from('seen').where('userId', userId).whereNull('episodeId').groupBy('mediaItemId').as('mediaItemSeen'), 'mediaItemSeen.mediaItemId', 'mediaItem.id')
    .where('episode.isSpecialEpisode', false)
    .whereBetween('episode.releaseDate', [start, end])
    .whereRaw(\`episode.tvShowId IN (\${libSubquery})\`);

  // Non-TV mediaItems with release date in range, only items in user's library
  const items = await _dbconfig.Database.knex('mediaItem')
    .select({
      'mediaItem.id': 'mediaItem.id',
      'mediaItem.title': 'mediaItem.title',
      'mediaItem.mediaType': 'mediaItem.mediaType',
      'mediaItem.releaseDate': 'mediaItem.releaseDate',
      'mediaItemSeen.mediaItemId': 'mediaItemSeen.mediaItemId'
    })
    .leftJoin(qb => qb.select('mediaItemId').from('seen').where('userId', userId).whereNull('episodeId').groupBy('mediaItemId').as('mediaItemSeen'), 'mediaItemSeen.mediaItemId', 'mediaItem.id')
    .whereNot('mediaItem.mediaType', 'tv')
    .whereBetween('mediaItem.releaseDate', [start, end])
    .whereRaw(\`mediaItem.id IN (\${libSubquery})\`);

  const result = [];
  for (const row of episodes) {
    if (!row['mediaItem.id']) continue;
    result.push({
      mediaItem: {
        id: row['mediaItem.id'],
        title: row['mediaItem.title'],
        releaseDate: row['mediaItem.releaseDate'],
        mediaType: row['mediaItem.mediaType'],
        seen: row['mediaItemSeen.mediaItemId'] != undefined
      },
      episode: {
        id: row['episode.id'],
        title: row['episode.title'],
        episodeNumber: row['episode.episodeNumber'],
        seasonNumber: row['episode.seasonNumber'],
        releaseDate: row['episode.releaseDate'],
        seen: row['episodeSeen.episodeId'] != undefined,
        isSpecialEpisode: Boolean(row['episode.isSpecialEpisode'])
      },
      releaseDate: row['episode.releaseDate']
    });
  }
  for (const row of items) {
    result.push({
      mediaItem: {
        id: row['mediaItem.id'],
        title: row['mediaItem.title'],
        releaseDate: row['mediaItem.releaseDate'],
        mediaType: row['mediaItem.mediaType'],
        seen: row['mediaItemSeen.mediaItemId'] != undefined
      },
      releaseDate: row['mediaItem.releaseDate']
    });
  }
  return _lodash.default.uniqBy(result, e => e.episode ? 'e' + e.episode.id : 'm' + e.mediaItem.id);
};
`;

// Find the existing function and replace
const startMarker = 'const getCalendarItems = async args => {';
const endMarker = 'exports.getCalendarItems = getCalendarItems;';
const startIdx = c.indexOf(startMarker);
const endIdx = c.indexOf(endMarker);
if (startIdx < 0 || endIdx < 0) { console.error('calendar all: anchors not found'); process.exit(1); }

c = c.slice(0, startIdx) + newImpl.trimStart() + '\n' + c.slice(endIdx) + '\n/* CALENDAR_ALL_V2_APPLIED */\n';
fs.writeFileSync(path, c);
console.log('calendar all: rewrote getCalendarItems to include all library items, not just watchlist');

// Sanity check
try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('calendar all: syntax OK');
} catch (e) {
  console.error('calendar all: SYNTAX ERROR ->', e.message.slice(0, 300));
  process.exit(1);
}
