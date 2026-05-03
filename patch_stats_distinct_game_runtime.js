const fs = require('fs');
const path = '/app/build/controllers/statisticsController.js';
let c = fs.readFileSync(path, 'utf8');

// For video_game, the homepage summary should display the *total time-to-beat across
// distinct played games* (so re-playing The Witcher 3 four times still counts as one
// 200h game, not four). Upstream sums seen.duration per row, which conflates retries
// with new games. The IGDB time-to-beat lives in mediaItem.runtime (populated by
// patch_igdb_time_to_beat.js), so the right aggregate is:
//   SUM(DISTINCT mediaItem.runtime) over played video_game items
// We compute it as a separate query and patch into the existing mapValues.

if (c.includes('// mt-fork: distinct-game-runtime')) {
  console.log('stats distinct game runtime: already patched');
  process.exit(0);
}

// Inject the distinct-runtime side query right before the `return _.keyBy(...)` and
// override `duration` for video_game in the mapValues callback.
//
// Anchor on the original `return (0, _lodash.default)(res).keyBy('mediaType')...` line.
const oldRet =
  "  return (0, _lodash.default)(res).keyBy('mediaType').mapValues(item => ({\n" +
  "    ..._lodash.default.omit(item, ['runtime', 'mediaType']),\n" +
  "    numberOfPages: Math.round(item.numberOfPages),\n" +
  "    duration: Math.round(item.mediaType === 'video_game' || item.mediaType === 'book' ? item.duration : item.runtime)\n" +
  "  })).value();";

if (!c.includes(oldRet)) {
  console.error('stats distinct game runtime: return anchor not found (upstream changed?)');
  process.exit(1);
}

const newRet =
  "  // mt-fork: distinct-game-runtime — for video_game expose two stats:\n" +
  "  //   played*  → distinct games with kind='played' + sum of max IGDB time-to-beat\n" +
  "  //   watched* → distinct games with kind='watched' + sum of max IGDB time-to-beat\n" +
  "  // The homepage renders two lines: '(N juegos) Xh Xm jugando' / '...viendo'.\n" +
  "  const _gameStatsByKind = async (kind) => {\n" +
  "    const rows = await _dbconfig.Database.knex\n" +
  "      .select('mediaItem.id', 'mediaItem.runtime')\n" +
  "      .from('seen')\n" +
  "      .leftJoin('mediaItem', 'mediaItem.id', 'seen.mediaItemId')\n" +
  "      .where('seen.userId', userId)\n" +
  "      .where('seen.kind', kind)\n" +
  "      .where('mediaItem.mediaType', 'video_game')\n" +
  "      .distinct();\n" +
  "    return {\n" +
  "      items: rows.length,\n" +
  "      minutes: rows.reduce((acc, r) => acc + (Number(r.runtime) || 0), 0),\n" +
  "    };\n" +
  "  };\n" +
  "  const _gamePlayed = await _gameStatsByKind('played');\n" +
  "  const _gameWatched = await _gameStatsByKind('watched');\n" +
  "  return (0, _lodash.default)(res).keyBy('mediaType').mapValues(item => ({\n" +
  "    ..._lodash.default.omit(item, ['runtime', 'mediaType']),\n" +
  "    numberOfPages: Math.round(item.numberOfPages),\n" +
  "    duration: Math.round(\n" +
  "      item.mediaType === 'video_game' ? _gamePlayed.minutes :\n" +
  "      item.mediaType === 'book' ? item.duration :\n" +
  "      item.runtime\n" +
  "    ),\n" +
  "    playedItems:    item.mediaType === 'video_game' ? _gamePlayed.items   : undefined,\n" +
  "    playedDuration: item.mediaType === 'video_game' ? Math.round(_gamePlayed.minutes)  : undefined,\n" +
  "    watchedItems:   item.mediaType === 'video_game' ? _gameWatched.items  : undefined,\n" +
  "    watchedDuration:item.mediaType === 'video_game' ? Math.round(_gameWatched.minutes) : undefined,\n" +
  "  })).value();";

c = c.replace(oldRet, newRet);
fs.writeFileSync(path, c);
console.log('stats distinct game runtime: video_game duration now reflects distinct max-time-to-beat');
