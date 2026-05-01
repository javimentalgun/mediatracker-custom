const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

// Add `progress` to the firstUnwatchedEpisode object in the items result mapping
const old = "isSpecialEpisode: Boolean(row['firstUnwatchedEpisode.isSpecialEpisode']),\n      userRating: undefined,";
const fresh = "isSpecialEpisode: Boolean(row['firstUnwatchedEpisode.isSpecialEpisode']),\n      progress: row['firstUnwatchedEpisode.progress'],\n      userRating: undefined,";

if (c.includes("progress: row['firstUnwatchedEpisode.progress']")) {
  console.log('tv-episode-progress: already in result mapping');
} else if (!c.includes(old)) {
  console.error('tv-episode-progress: anchor not found'); process.exit(1);
} else {
  c = c.replace(old, fresh);
  fs.writeFileSync(path, c);
  console.log('tv-episode-progress: added progress to firstUnwatchedEpisode result mapping');
}
