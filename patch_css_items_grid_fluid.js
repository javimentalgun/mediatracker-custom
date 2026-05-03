// Override the upstream .items-grid fixed widths so the grid fills its
// container instead of overflowing it.
//
// Upstream sets `.items-grid` to a fixed pixel width per breakpoint
// (180/360/540/720/900/1080) with min-width = max-width = width, which clips
// the rightmost cards when the grid sits inside a sectioned page (Pendiente,
// En proceso, Watchlist, Descargados, Abandonados...) whose section has
// padding + border + overflow-hidden. The grid jumps between fixed widths
// instead of sizing to the available space, so for any viewport that doesn't
// match the breakpoints exactly, items either get clipped or leave a wide
// empty gutter.
//
// Using 100% lets the inner `flex flex-row flex-wrap` pack items naturally
// at every viewport size. `justify-content:flex-start` keeps the items
// left-aligned (upstream centered them via the fixed parent width).
//
// Must run BEFORE patch_css_rename.js — the rename hashes the CSS file
// content, so the override must be in place before hashing or the cache
// keeps serving the old (un-patched) file.

const fs = require('fs');
const child = require('child_process');
const cssPath = child.execSync("ls /app/public/main_*.css | grep -v '\\.LICENSE\\|\\.map'").toString().trim();
let c = fs.readFileSync(cssPath, 'utf8');

const marker = '/* mt-fork: items-grid-fluid */';
if (c.includes(marker)) {
  console.log('css items-grid fluid: already patched');
  process.exit(0);
}

// Override .items-grid AND its child rules:
// - items-grid → fluid (100%)
// - header/footer → drop the left/right margin (10px each) that pushed content
//   PAST the wrapper edge, which combined with the upstream
//   `flex justify-center w-full` outer wrapper centered the (now-overflowing)
//   grid → first card got clipped on the LEFT.
// - item → keep its 10px side gutters; remove fixed margins on the very first
//   one via :first-child so the first card aligns with the section's left edge.
const rules =
  '\n' + marker + '\n' +
  '.items-grid{width:100%!important;min-width:0!important;max-width:100%!important;justify-content:flex-start!important;box-sizing:border-box!important;margin-left:0!important;margin-right:0!important}\n' +
  '.items-grid .header,.items-grid .footer{width:100%!important;margin-left:0!important;margin-right:0!important;box-sizing:border-box!important}\n' +
  '.items-grid .item{margin-left:0!important;margin-right:20px!important;box-sizing:border-box!important}\n' +
  // The outer wrapper Zv renders is `flex justify-center w-full` — kill the
  // centering when it contains an items-grid so any residual "wider than parent"
  // case still left-aligns instead of clipping.
  '.flex.justify-center > .items-grid{margin-left:0!important;margin-right:auto!important}\n';

c = c + rules;
fs.writeFileSync(cssPath, c);
console.log('css items-grid fluid: applied');
