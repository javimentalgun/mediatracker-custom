// Override the upstream .items-grid fixed widths so the grid:
//   - never exceeds 5 columns on wide viewports (avoids the rightmost card
//     getting clipped by the section card's overflow-hidden)
//   - sits horizontally centered inside its section
//   - still wraps to fewer columns on narrower viewports
//
// Upstream sets `.items-grid` to a fixed pixel width per breakpoint
// (180/360/540/720/900/1080) with min-width = max-width = width. The 1080
// breakpoint (6 columns) is what bleeds out of the section card on wide
// monitors — the section has padding + border + overflow-hidden, so the
// 6th column gets cut on the right.
//
// Each .item is 160px + 20px right margin = 180px slot. 5 columns × 180px
// = 900px → set `.items-grid` to `width:100%; max-width:900px; margin:0 auto`.
// At ≥900px container width the grid renders 5 cards, centered. At narrower
// widths the inner `flex flex-row flex-wrap` packs fewer columns naturally.
//
// Must run BEFORE patch_css_rename.js — the rename hashes the CSS file
// content, so the override must be in place before hashing or the cache
// keeps serving the old (un-patched) file.

const fs = require('fs');
const zlib = require('zlib');
const child = require('child_process');
const cssPath = child.execSync("ls /app/public/main_*.css | grep -v '\\.gz\\|\\.br'").toString().trim();
let c = fs.readFileSync(cssPath, 'utf8');

const marker = '/* mt-fork: items-grid-fluid v3 (5col centered, cf-cache-bust) */';
if (c.includes(marker)) {
  console.log('css items-grid fluid: already patched');
  process.exit(0);
}

// Override .items-grid AND its child rules:
// - items-grid → max 5 columns (max-width:900px), centered (margin:0 auto)
// - header/footer → drop the upstream 10/10 horizontal margins so they
//   don't push content past the wrapper edge.
// - item → keep a 20px right gutter (left:0) so 5 items × 180px = 900px fit
//   exactly. `:last-child` drops the trailing margin so the row hugs the
//   right edge cleanly.
// Use justify-content:center on the items-grid (which is itself a flex
// container via the upstream `flex flex-row flex-wrap` classes) so the items
// inside center within the grid box. Combined with max-width:900px and
// margin:auto, the grid is centered AND its items are centered — works even
// for partial last rows.
const rules =
  '\n' + marker + '\n' +
  '.items-grid{width:100%!important;min-width:0!important;max-width:900px!important;justify-content:center!important;box-sizing:border-box!important;margin-left:auto!important;margin-right:auto!important}\n' +
  '.items-grid .header,.items-grid .footer{width:100%!important;margin-left:0!important;margin-right:0!important;box-sizing:border-box!important;text-align:center!important}\n' +
  '.items-grid .item{margin-left:10px!important;margin-right:10px!important;box-sizing:border-box!important}\n';

c = c + rules;
fs.writeFileSync(cssPath, c);
// Re-emit .gz / .br so the static server (and Cloudflare via brotli) doesn't
// keep serving the previous patch step's compressed bytes under the renamed
// hash. Without this, css_rename moves stale .gz/.br alongside the fresh .css.
try { fs.writeFileSync(cssPath + '.gz', zlib.gzipSync(c, { level: 9 })); } catch (_) {}
try { fs.writeFileSync(cssPath + '.br', zlib.brotliCompressSync(c)); } catch (_) {}
console.log('css items-grid fluid: applied');
