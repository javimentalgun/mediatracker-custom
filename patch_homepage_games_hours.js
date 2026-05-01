const fs = require('fs');
const child = require('child_process');

// In the homepage summary's video_game block, replace the "(N plays)" line
// (which counted seen rows — meaningless for re-played games) with "(Xh)" using
// the new duration value. duration is computed by patch_stats_distinct_game_runtime.js
// as the sum of max IGDB time-to-beat across distinct played games (in minutes).
// We render via Cp (the existing duration formatter component) so it shows up
// as "(48h 30m)" or similar in the user's locale.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:games-hours*/';
if (c.includes(marker)) {
  console.log('homepage games hours: already patched');
  process.exit(0);
}

// Anchor: the entire "(<1>{1}</1> plays)" element for video_game.
// Replace plays with Cp(duration). Keep the items count + " juegos" prefix.
const oldFrag = 'r.createElement("div",null,r.createElement(Xe,{id:"<0>{0}</0> video games (<1>{1}</1> plays)",values:{0:o.video_game.items,1:o.video_game.plays},components:{0:r.createElement("b",null),1:r.createElement("b",null)}}))';
const newFrag = marker + 'r.createElement("div",null,r.createElement("b",null,o.video_game.items)," juegos (",r.createElement(Cp,{milliseconds:60*o.video_game.duration*1e3}),")")';

if (!c.includes(oldFrag)) {
  console.error('homepage games hours: anchor not found (upstream may have changed the summary block)');
  process.exit(1);
}

c = c.replace(oldFrag, newFrag);
fs.writeFileSync(bundlePath, c);
console.log('homepage games hours: replaced "(N plays)" with "(Xh)" derived from time-to-beat');
