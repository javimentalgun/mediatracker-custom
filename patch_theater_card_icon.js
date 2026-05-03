// On the item card, show a small Material Icon `theater_comedy` next to the
// "Teatro" mediaType label so theater plays read at a glance. Other mediaTypes
// keep their current text-only label (no behavior change for movies/tv/etc).
//
// Anchor on the existing `r.createElement("span",null,w[t.mediaType])` next to
// the year span. Wrap in a Fragment that prepends the icon when mediaType is
// 'theater'.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:theater-card-icon*/';
if (c.includes(marker)) {
  console.log('theater card icon: already patched');
  process.exit(0);
}

// Anchor: the inline mediaType label render.
const old = 'r.createElement("span",null,w[t.mediaType])';
if (!c.includes(old)) {
  console.error('theater card icon: w[t.mediaType] anchor not found'); process.exit(1);
}
// New: same span, but for theater prepend a tiny material-icons "theater_comedy"
// glyph styled as inline text size for the line. Other mediaTypes render as before.
const fresh =
  'r.createElement("span",null,' + marker +
    '"theater"===t.mediaType&&r.createElement("i",{className:"material-icons text-base align-middle mr-1",style:{fontSize:"1em",verticalAlign:"-0.15em"}},"theater_comedy"),' +
    'w[t.mediaType]' +
  ')';
c = c.replace(old, fresh);
fs.writeFileSync(bundlePath, c);
console.log('theater card icon: theater_comedy prefixed to mediaType label for theater items');
