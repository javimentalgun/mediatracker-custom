// Strip the `flex justify-center w-full` wrapper around `.items-grid` in the
// JS bundle.
//
// Upstream wraps the items-grid in a `flex justify-center w-full` div. With
// the original fixed-width `.items-grid` (180/360/540/720/900/1080), centering
// produced a balanced gutter on each side. patch_css_items_grid_fluid makes
// the grid 100%-wide via CSS — but in some viewport widths the rendered
// items-grid still ends up wider than its parent (likely because `flex` on
// the parent treats the 100% as min-content) and `justify-content: center`
// then pushes the LEFT edge into negative offset, which the section card's
// `overflow-hidden` clips — chopping the first item's left half.
//
// Replacing `flex justify-center w-full` → `w-full` removes the flex parent
// entirely so no centering can happen, regardless of the items-grid's intrinsic
// size.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: items-grid-no-center */';
if (c.includes(marker)) {
  console.log('items-grid no-center: already patched');
  process.exit(0);
}

const target = '"flex justify-center w-full"';
const replacement = '"w-full"';
const before = c.length;
c = c.split(target).join(replacement);
const replaced = (before - c.length) / (target.length - replacement.length);

if (replaced === 0) {
  console.error('items-grid no-center: anchor not found (was it already patched in a prior build?)');
  process.exit(1);
}

c = marker + c;
fs.writeFileSync(bundlePath, c);
console.log('items-grid no-center: replaced', replaced, 'occurrences');

// Invalidate compressed variants.
const path = require('path');
for (const ext of ['.br', '.gz']) {
  const p = bundlePath + ext;
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
    catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
  }
}
