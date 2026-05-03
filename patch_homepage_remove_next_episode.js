// Remove the "Next episode to watch" block from the homepage. Series with
// unwatched episodes still show up in the hamburger /in-progress section, so
// dedicating a homepage block to them is redundant and adds visual noise.
//
// Strategy: gate the createElement call with `false&&` so React renders nothing
// for that child, instead of ripping out the JSX (cheaper, easier to revert,
// same approach as patch_homepage_remove_audiobooks.js).

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:no-next-episode-home*/';
if (c.includes(marker)) {
  console.log('homepage remove next episode: already patched');
  process.exit(0);
}

const old = 'r.createElement(qv,{title:xo._("Next episode to watch")';
const fresh = marker + 'false&&r.createElement(qv,{title:xo._("Next episode to watch")';
if (!c.includes(old)) {
  console.error('homepage remove next episode: anchor not found'); process.exit(1);
}
c = c.replace(old, fresh);
fs.writeFileSync(bundlePath, c);
console.log('homepage remove next episode: short-circuited block');
