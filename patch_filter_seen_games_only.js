const fs = require('fs');
const child = require('child_process');

// On the items grid pages (Movies / Series / Books / Games / Audiobooks), the
// filter dropdown shows: All, Rated, Unrated, On watchlist, Played/Watched,
// Just watched/Seen. The "Just watched" option (= filter onlyWatched) was
// added by patch_seen_kind_wiring.js to distinguish "actually played" from
// "marked watched only". For non-game media it isn't useful — the user just
// gets a redundant tab. Keep it only on the Games page (label: "Seen").

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:filter-seen-games-only*/';
if (c.includes(marker)) {
  console.log('filter seen games-only: already patched');
  process.exit(0);
}

// Anchor on the full filter object construction. The function takes mediaItem `e`
// and returns the labels-by-filter-key map. We rewrite it to spread the
// onlyWatched key only when Ao(e) is true (Ao = isVideoGame).
const oldFrag = '(e){return{all:xo._("All"),onlyWithUserRating:xo._("Rated"),onlyWithoutUserRating:xo._("Unrated"),onlyOnWatchlist:xo._("On watchlist"),onlyPlayed:jo(e)?xo._("Listened"):Do(e)?xo._("Read"):Ao(e)?xo._("Played"):xo._("Watched"),onlyWatched:Ao(e)?xo._("Seen"):xo._("Just watched")}}';
const newFrag = marker + '(e){return Object.assign({all:xo._("All"),onlyWithUserRating:xo._("Rated"),onlyWithoutUserRating:xo._("Unrated"),onlyOnWatchlist:xo._("On watchlist"),onlyPlayed:jo(e)?xo._("Listened"):Do(e)?xo._("Read"):Ao(e)?xo._("Played"):xo._("Watched")},Ao(e)?{onlyWatched:xo._("Seen")}:{})}';

if (!c.includes(oldFrag)) {
  console.error('filter seen games-only: anchor not found (filter object construction changed?)');
  process.exit(1);
}
c = c.replace(oldFrag, newFrag);
fs.writeFileSync(bundlePath, c);
console.log('filter seen games-only: onlyWatched filter restricted to Games page');
