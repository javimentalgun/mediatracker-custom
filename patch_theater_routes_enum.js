// /api/items, /api/items/paginated and other routes validate `mediaType` against
// a hard-coded enum ['audiobook','book','movie','tv','video_game']. Without
// 'theater' the validator rejects requests from /theater, the frontend bubbles
// the 400 up and the page renders blank. Add 'theater' to the enum everywhere.

const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

const old = "enum: ['audiobook', 'book', 'movie', 'tv', 'video_game']";
const fresh = "enum: ['audiobook', 'book', 'movie', 'tv', 'video_game', 'theater']";

const occ = c.split(old).length - 1;
if (occ === 0) {
  if (c.includes(fresh)) {
    console.log('theater routes enum: already patched');
    process.exit(0);
  }
  console.error('theater routes enum: anchor not found'); process.exit(1);
}
c = c.split(old).join(fresh);
fs.writeFileSync(path, c);
console.log('theater routes enum: added theater to ' + occ + ' enum location(s)');
