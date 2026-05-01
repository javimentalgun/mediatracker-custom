const fs = require('fs');
const zlib = require('zlib');
const child = require('child_process');

// Override page background:
//   light mode → "cáscara de huevo" (#F0EAD6)
//   dark mode  → near-black (#121212) — slightly lifted off pure black so OLED
//                contrast doesn't crush text rendering.
// Tailwind already emits `body { background-color: rgb(64 64 64) }` and
// `.dark body { … }` with the same color (perma-dark default). We append a
// higher-specificity rule at the end of the CSS to win without !important.
const cssPath = child.execSync("ls /app/public/main_*.css | grep -v '\\.gz\\|\\.br'").toString().trim();
let css = fs.readFileSync(cssPath, 'utf8');

const marker = '/* mt-fork: background overrides */';
if (css.includes(marker)) {
  console.log('background colors: already patched');
} else {
  const override = '\n' + marker + '\n' +
    'html body{background-color:#F0EAD6;}\n' +
    'html.dark body{background-color:#121212;}\n';
  css = css + override;
  fs.writeFileSync(cssPath, css);
  // Re-emit .gz / .br variants so the static server keeps serving fresh bytes.
  try { fs.writeFileSync(cssPath + '.gz', zlib.gzipSync(css, { level: 9 })); } catch (_) {}
  try { fs.writeFileSync(cssPath + '.br', zlib.brotliCompressSync(css)); } catch (_) {}
  console.log('background colors: appended overrides + recompressed');
}
