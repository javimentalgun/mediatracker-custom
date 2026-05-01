const fs = require('fs');
const path = '/app/build/entity/tvepisode.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("'progress'")) { console.log('episode-progress entity: already patched'); process.exit(0); }

const old = "'tvShowId', 'isSpecialEpisode'";
if (!c.includes(old)) { console.error('episode-progress entity: anchor not found'); process.exit(1); }
c = c.replace(old, "'tvShowId', 'isSpecialEpisode', 'progress'");
fs.writeFileSync(path, c);
console.log('episode-progress entity: added progress to tvEpisodeColumns');
