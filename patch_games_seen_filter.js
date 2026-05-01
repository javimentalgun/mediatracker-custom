const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Final mapping using the seen.kind column:
//   Jugado/Listened/Read/Watched (label depending on mediaType) → onlyPlayed (kind='played')
//   Visto/Seen → onlyWatched (kind='watched')
const original = '{all:xo._("All"),onlyWithUserRating:xo._("Rated"),onlyWithoutUserRating:xo._("Unrated"),onlyOnWatchlist:xo._("On watchlist"),onlySeenItems:jo(e)?xo._("Listened"):Do(e)?xo._("Read"):Ao(e)?xo._("Played"):xo._("Watched")}';
const intermediate = '{all:xo._("All"),onlyWithUserRating:xo._("Rated"),onlyWithoutUserRating:xo._("Unrated"),onlyOnWatchlist:xo._("On watchlist"),onlyWithProgress:jo(e)?xo._("Listened"):Do(e)?xo._("Read"):Ao(e)?xo._("Played"):xo._("In progress"),onlySeenItems:Ao(e)?xo._("Seen"):jo(e)?xo._("Listened"):Do(e)?xo._("Read"):xo._("Watched")}';
const fresh = '{all:xo._("All"),onlyWithUserRating:xo._("Rated"),onlyWithoutUserRating:xo._("Unrated"),onlyOnWatchlist:xo._("On watchlist"),onlyPlayed:jo(e)?xo._("Listened"):Do(e)?xo._("Read"):Ao(e)?xo._("Played"):xo._("Watched"),onlyWatched:Ao(e)?xo._("Seen"):xo._("Just watched")}';
if (c.includes('onlyPlayed:jo(e)?xo._("Listened")')) {
  console.log('games seen filter: already patched (onlyPlayed/onlyWatched)');
} else if (c.includes(intermediate)) {
  c = c.replace(intermediate, fresh);
  console.log('games seen filter: upgraded from intermediate to onlyPlayed/onlyWatched');
} else if (c.includes(original)) {
  c = c.replace(original, fresh);
  console.log('games seen filter: applied onlyPlayed/onlyWatched mapping');
} else {
  console.error('games seen filter: anchor not found'); process.exit(1);
}

fs.writeFileSync(bundlePath, c);
console.log('games seen filter: complete');
