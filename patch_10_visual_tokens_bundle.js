// Auto-generated mega-patch: patch_10_visual_tokens_bundle.js
// Bundles 13 original patch_*.js scripts in execution order.
// Each constituent is wrapped in an IIFE so its top-level vars (const fs = ...)
// don't collide; `process.exit(0)` is rewritten to `return` so an early-exit
// idempotency guard inside one constituent doesn't abort the whole mega-patch.

// ===== patch_background_colors.js =====
;(() => {
const fs = require('fs');
const zlib = require('zlib');
const child = require('child_process');

// Override page background:
//   light mode → pure white (#FFFFFF) — user prefers crisp white over the
//                previous "cáscara de huevo" #F0EAD6 cream.
//   dark mode  → near-black (#121212) — slightly lifted off pure black so OLED
//                contrast doesn't crush text rendering.
// Tailwind already emits `body { background-color: rgb(64 64 64) }` and
// `.dark body { … }` with the same color (perma-dark default). We append a
// higher-specificity rule at the end of the CSS to win without !important.
const cssPath = child.execSync("ls /app/public/main_*.css | grep -v '\\.gz\\|\\.br'").toString().trim();
let css = fs.readFileSync(cssPath, 'utf8');

const marker = '/* mt-fork: background overrides v2 (white light) */';
if (css.includes(marker)) {
  console.log('background colors: already patched');
} else {
  const override = '\n' + marker + '\n' +
    'html body{background-color:#FFFFFF;}\n' +
    'html.dark body{background-color:#121212;}\n';
  css = css + override;
  fs.writeFileSync(cssPath, css);
  // Re-emit .gz / .br variants so the static server keeps serving fresh bytes.
  try { fs.writeFileSync(cssPath + '.gz', zlib.gzipSync(css, { level: 9 })); } catch (_) {}
  try { fs.writeFileSync(cssPath + '.br', zlib.brotliCompressSync(css)); } catch (_) {}
  console.log('background colors: appended overrides + recompressed');
}

})();

// ===== patch_css_btn_green.js =====
;(() => {
// Add a `.btn-green` class to the CSS bundle, matching the visual weight of
// `.btn-red` / `.btn-blue` (outlined button: 1px border + colored text). Used
// by the _AIP toggle on the detail page.
//
// Must run BEFORE patch_css_rename.js so the rename's content hash reflects the
// final CSS (otherwise the rule is in the file but caches keep serving the
// old hash and the class looks unstyled).

const fs = require('fs');
const child = require('child_process');
const cssPath = child.execSync("ls /app/public/main_*.css | grep -v '\\.LICENSE\\|\\.map'").toString().trim();
let c = fs.readFileSync(cssPath, 'utf8');

const marker = '/* mt-fork: btn-green */';
if (c.includes(marker)) {
  console.log('css btn-green: already patched');
  return /* was process.exit(0) */;
}

// Light mode green: tailwind green-700 (rgb 21 128 61). Dark mode: green-400.
// Mirrors how btn-blue uses two `.btn-blue { color: ... }` rules at different
// specificities for light/dark.
const rules =
  '\n' + marker + '\n' +
  '.btn-green { display: inline-block !important; padding: 2px 16px !important; border-radius: 4px !important; border-width: 1px !important; cursor: pointer !important; transition: all 150ms !important; user-select: none !important; border-color: currentColor; color: rgb(21 128 61); }\n' +
  '.btn-green:hover { box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); }\n' +
  '.btn-green:disabled { cursor: auto; background-color: rgb(209 213 219); }\n' +
  '.dark .btn-green { color: rgb(74 222 128); }\n';

c = c + rules;
fs.writeFileSync(cssPath, c);
console.log('css btn-green: appended .btn-green rules');

})();

// ===== patch_css_items_grid_fluid.js =====
;(() => {
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
  return /* was process.exit(0) */;
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

})();

// ===== patch_items_grid_no_center.js =====
;(() => {
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
  return /* was process.exit(0) */;
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

})();

// ===== patch_settings_import_backup_inside.js =====
;(() => {
// Make /import and /backup live INSIDE the Settings layout so the sidebar
// stays visible while the user is on those pages.
//
// Upstream (and the fork's menu config in `Dy`) listed Import and Backup with
// ABSOLUTE paths "/import" and "/backup" — clicking them navigates OUT of
// /settings/* and the page renders the bare component, no sidebar. The fix:
// register them as RELATIVE child-routes of `Ny` (the Settings router) and
// switch the menu entries to relative paths so navigation stays in /settings.
//
// The top-level /import and /backup routes are kept untouched so any external
// links/bookmarks keep working.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: settings-import-backup-inside */';
if (c.includes(marker)) { console.log('settings import/backup inside: already patched'); return /* was process.exit(0) */; }

// 1) Menu items: relative paths so the sidebar links stay in /settings/*.
const menuOld = '[{path:"/import",name:"Importar"},{path:"/backup",name:"Backup"}]';
const menuNew = '[{path:"import",name:"Importar"},{path:"backup",name:"Backup"}]';
if (!c.includes(menuOld)) {
  console.error('settings import/backup inside: menu anchor not found');
  process.exit(1);
}
c = c.replace(menuOld, menuNew);

// 2) Settings router (Ny): inject import + backup child-routes after preferences.
const routeAnchor = 'r.createElement(Q,{path:"preferences",element:r.createElement(vy,null)}),';
if (!c.includes(routeAnchor)) {
  console.error('settings import/backup inside: settings-router anchor not found');
  process.exit(1);
}
const newRoutes =
  'r.createElement(Q,{path:"import",element:r.createElement(JP,{key:"settings/import"})}),' +
  'r.createElement(Q,{path:"backup",element:r.createElement(_BK,{key:"settings/backup"})}),';
c = c.replace(routeAnchor, routeAnchor + newRoutes);

c = marker + c;
fs.writeFileSync(bundlePath, c);

// Invalidate compressed variants.
const path = require('path');
for (const ext of ['.br', '.gz']) {
  const p = bundlePath + ext;
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
    catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
  }
}

console.log('settings import/backup inside: applied');

})();

// ===== patch_css_rename.js =====
;(() => {
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const child = require('child_process');

// Same trick as patch_bundle_rename.js but for the CSS file. Without this, the
// server sets `Cache-Control: max-age=31536000` on /main_*.css and the browser
// (and Cloudflare) keep serving the same cached file forever — so frontend
// patches that touch the CSS (e.g. background_colors) don't reach the user
// even after a rebuild. Renaming with a content hash forces a fresh URL.
//
// Must run AFTER any patch that modifies the CSS contents (background_colors).

const pubDir = '/app/public';
const idxPath = path.join(pubDir, 'index.html');
const cssPath = child.execSync("ls /app/public/main_*.css | grep -v '\\.gz\\|\\.br'").toString().trim();
const oldName = path.basename(cssPath);

if (/_[a-f0-9]{12}\.css$/.test(oldName)) {
  console.log('css rename: already content-hashed (' + oldName + ')');
  return /* was process.exit(0) */;
}

const content = fs.readFileSync(cssPath);
const hash = crypto.createHash('sha1').update(content).digest('hex').slice(0, 12);
const newName = oldName.replace(/\.css$/, '_' + hash + '.css');
const newPath = path.join(pubDir, newName);

fs.renameSync(cssPath, newPath);
console.log('css rename: ' + oldName + ' → ' + newName);

// Move sibling .gz / .br variants emitted by patch_background_colors.js.
['.gz', '.br'].forEach(ext => {
  const oldSib = cssPath + ext;
  if (fs.existsSync(oldSib)) {
    fs.renameSync(oldSib, newPath + ext);
    console.log('css rename: ' + oldName + ext + ' → ' + newName + ext);
  }
});

// Rewrite all references in index.html.
let idx = fs.readFileSync(idxPath, 'utf8');
const refCount = idx.split(oldName).length - 1;
if (refCount > 0) {
  idx = idx.split(oldName).join(newName);
  fs.writeFileSync(idxPath, idx);
  console.log('css rename: updated ' + refCount + ' refs in index.html');
} else {
  console.log('css rename: no refs to ' + oldName + ' in index.html');
}

})();

// ===== patch_credentials_to_tokens.js =====
;(() => {
// Move credential-style configuration blocks from "Configuration" / "Backup" /
// "/youtube" into the "Application tokens" settings tab. First milestone:
// move the IGDB credentials sub-form (`wy`) out of `yy` (Configuration) and
// mount it inside the `application-tokens` route alongside the existing
// upstream tokens manager (`dy`).
//
// Strategy: don't touch `dy` directly — wrap the route element in a Fragment
// that renders both `dy` and a new `_AT_EXT` wrapper. _AT_EXT renders one
// section per migrated credential (currently just IGDB). Future iterations
// will add Jellyfin (_JF) and YouTube OAuth.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: credentials-to-tokens */';
if (c.includes(marker)) {
  console.log('credentials-to-tokens: already patched');
  return /* was process.exit(0) */;
}

// === 1. Remove `r.createElement(wy,null)` from yy (Configuration page). ===
const igdbInYy = ',r.createElement(wy,null)';
if (!c.includes(igdbInYy)) {
  console.error('credentials-to-tokens: wy mount in yy not found');
  process.exit(1);
}
c = c.replace(igdbInYy, '');
console.log('credentials-to-tokens: removed IGDB form from Configuration page');

// === 2. Define the _YTAUTH (Google/YouTube OAuth) component standalone. ===
//   Was inline in _YT (the /youtube page) — extracted here so it lives in
//   /settings/application-tokens with the rest of the credential UI.
//   Renders only the body (buttons row) — the title + card chrome are added
//   by the `my` wrapper used in _AT_EXT.
const ytAuthDef = '_YTAUTH=function(){' +
  'var _a=r.useState({connected:false}),auth=_a[0],setAuth=_a[1];' +
  'var _sb=r.useState(false),syncBusy=_sb[0],setSyncBusy=_sb[1];' +
  'var loadAuth=function(){fetch("/api/youtube/oauth/status",{credentials:"same-origin"}).then(function(r){return r.json()}).then(setAuth).catch(function(){setAuth({connected:false})})};' +
  'r.useEffect(function(){loadAuth()},[]);' +
  'var connectOauth=function(){window.location="/api/youtube/oauth/start"};' +
  'var syncOauth=function(){' +
    'setSyncBusy(true);' +
    'fetch("/api/youtube/oauth/sync",{method:"POST",credentials:"same-origin"})' +
      '.then(function(r){return r.json()})' +
      '.then(function(){setSyncBusy(false);loadAuth()})' +
      '.catch(function(){setSyncBusy(false)});' +
  '};' +
  'var disconnectOauth=function(){' +
    'fetch("/api/youtube/oauth",{method:"DELETE",credentials:"same-origin"}).then(function(){loadAuth()})' +
  '};' +
  'return r.createElement("div",{className:"flex flex-wrap items-center gap-2"},' +
    '!auth.connected?' +
      'r.createElement("button",{onClick:connectOauth,className:"px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded shadow inline-flex items-center gap-2"},' +
        'r.createElement("i",{className:"material-icons"},"link"),' +
        'xo._("Link YouTube account")' +
      '):' +
      'r.createElement(r.Fragment,null,' +
        'r.createElement("span",{className:"px-3 py-1 rounded bg-green-700 text-white text-sm inline-flex items-center gap-1"},' +
          'r.createElement("i",{className:"material-icons text-base"},"check_circle"),' +
          'xo._("Connected as")+" "+(auth.email||"?")' +
        '),' +
        'r.createElement("button",{onClick:syncOauth,disabled:syncBusy,className:"px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white rounded text-sm inline-flex items-center gap-1"},' +
          'r.createElement("i",{className:"material-icons text-base"},syncBusy?"hourglass_top":"sync"),' +
          'syncBusy?"...":xo._("Sync my subscriptions")' +
        '),' +
        'r.createElement("button",{onClick:disconnectOauth,className:"px-2 py-1 text-sm text-red-500 hover:text-red-700 underline"},xo._("Disconnect"))' +
      ')' +
  ')' +
'},';

// === 3. Define the _AT_EXT wrapper component. ===
//   Renders the relocated credential blocks below the upstream tokens form,
//   each wrapped in `my` (the upstream settings card with title + border +
//   padding) so all three sections share the same chrome as the upstream ones.
//   `wy` (IGDB) already wraps itself in `my` internally — render it bare. For
//   `_JF` and `_YTAUTH` we add the wrapper here.
const wrapperDef = ytAuthDef + '_AT_EXT=function(){' +
  'return r.createElement(r.Fragment,null,' +
    'r.createElement("div",{className:"mt-3"}),' +
    'r.createElement(wy,null),' +
    'r.createElement("div",{className:"mt-3"}),' +
    'r.createElement(my,{title:"Jellyfin"},r.createElement(_JF,null)),' +
    'r.createElement("div",{className:"mt-3"}),' +
    'r.createElement(my,{title:"YouTube"},r.createElement(_YTAUTH,null))' +
  ')' +
'},';

const compAnchor = '_v=function(e){';
if (!c.includes(compAnchor)) { console.error('credentials-to-tokens: _v anchor not found'); process.exit(1); }
c = c.replace(compAnchor, wrapperDef + compAnchor);
console.log('credentials-to-tokens: injected _AT_EXT component');

// === 3. Wrap the application-tokens route element to render dy + _AT_EXT. ===
const routeOld = 'r.createElement(Q,{path:"application-tokens",element:r.createElement(dy,null)})';
const routeNew = 'r.createElement(Q,{path:"application-tokens",element:r.createElement(r.Fragment,null,r.createElement(dy,null),r.createElement(_AT_EXT,null))})';
if (!c.includes(routeOld)) {
  console.error('credentials-to-tokens: application-tokens route anchor not found');
  process.exit(1);
}
c = c.replace(routeOld, routeNew);
console.log('credentials-to-tokens: wrapped application-tokens route with _AT_EXT');

c = marker + c;
fs.writeFileSync(bundlePath, c);

// Invalidate compressed variants so the server stops serving stale gzip/br.
const path = require('path');
for (const ext of ['.br', '.gz']) {
  const p = bundlePath + ext;
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
    catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
  }
}

console.log('credentials-to-tokens: done (IGDB relocated)');

})();

// ===== patch_tmdb_user_key.js =====
;(() => {
// Self-service TMDB API key management.
//
// MediaTracker's custom features (watchProviders, fetchEpisodeRuntimes) need
// a TMDB API key to call api.themoviedb.org. We support two equivalent ways
// to provide it:
//   1) `TMDB_API_KEY` env var in docker-compose.yml — preferred for prod.
//   2) UI: user pastes key in /settings/application-tokens, persisted to
//      `/storage/tmdb-key.json` (admin-only).
//
// The env var wins if both are set. The two consumer endpoints already chain
// env → file → 503 with a hint pointing at this UI section.
//
// Steps:
//   1. Backend: GET /api/tmdb/key  → { configured, source, masked } (admin-only).
//      Backend: PUT /api/tmdb/key  → set or clear (admin-only).
//   2. Frontend: `_TMDBKEY` React component (input + save + status row).
//      Mounted inside `_AT_EXT` after the YouTube section, wrapped in `my`.
//
// Idempotent: each step checks for a marker before mutating.

const fs = require('fs');
const child = require('child_process');

// === Backend: controller methods + routes =================================
{
  const ctrlPath = '/app/build/controllers/item.js';
  let c = fs.readFileSync(ctrlPath, 'utf8');

  // Strip prior versions for clean re-applies.
  ['tmdbKeyGet', 'tmdbKeyPut'].forEach(name => {
    const re = new RegExp('  ' + name + ' = \\(0, _typescriptRoutesToOpenapiServer\\.createExpressRoute\\)\\(async \\(req, res\\) => \\{[\\s\\S]*?\\}\\);\\n', 'g');
    c = c.replace(re, '');
  });

  const methods = `  tmdbKeyGet = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    if (!(await this.jellyfinIsAdmin(req, res))) return;
    const fs = require('fs');
    const envKey = process.env.TMDB_API_KEY;
    let fileKey = null;
    try { fileKey = (JSON.parse(fs.readFileSync('/storage/tmdb-key.json','utf8')).apiKey || '').trim() || null; } catch(_) {}
    const effective = envKey || fileKey;
    res.json({
      configured: !!effective,
      source: envKey ? 'env' : (fileKey ? 'file' : 'none'),
      masked: effective ? (effective.slice(0, 4) + '…' + effective.slice(-4)) : null,
      hasFileKey: !!fileKey,
    });
  });
  tmdbKeyPut = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    if (!(await this.jellyfinIsAdmin(req, res))) return;
    const fs = require('fs');
    const apiKey = (req.body && typeof req.body.apiKey === 'string') ? req.body.apiKey.trim() : '';
    const file = '/storage/tmdb-key.json';
    if (!apiKey) {
      // Empty body means "clear" — remove the file.
      try { fs.unlinkSync(file); } catch(_) {}
      res.json({ ok: true, cleared: true });
      return;
    }
    if (!/^[a-f0-9]{20,}$/i.test(apiKey)) {
      res.status(400).json({ error: 'Formato de TMDB API key inválido (se esperan ≥20 hex chars).' });
      return;
    }
    fs.writeFileSync(file, JSON.stringify({ apiKey }, null, 2));
    try { fs.chmodSync(file, 0o600); } catch(_) {}
    res.json({ ok: true });
  });
`;

  const anchor = '}\nexports.MediaItemController = MediaItemController;';
  if (!c.includes(anchor)) { console.error('tmdb user key: controller anchor not found'); process.exit(1); }
  c = c.replace(anchor, methods + anchor);
  fs.writeFileSync(ctrlPath, c);
  console.log('tmdb user key: installed tmdbKeyGet + tmdbKeyPut');
}

// === Backend: routes ======================================================
{
  const routesPath = '/app/build/generated/routes/routes.js';
  let c = fs.readFileSync(routesPath, 'utf8');
  const marker = '/* mt-fork: tmdb-user-key-routes */';
  if (c.includes(marker)) {
    console.log('tmdb user key: routes already wired');
  } else {
    const anchor = "router.get('/api/configuration', validatorHandler({}), _ConfigurationController.get);";
    if (!c.includes(anchor)) {
      console.error('tmdb user key: routes anchor not found'); process.exit(1);
    }
    const newRoutes =
      "\n" + marker + "\n" +
      "router.get('/api/tmdb/key', validatorHandler({}), _MediaItemController.tmdbKeyGet);\n" +
      "router.put('/api/tmdb/key', validatorHandler({}), _MediaItemController.tmdbKeyPut);";
    c = c.replace(anchor, anchor + newRoutes);
    fs.writeFileSync(routesPath, c);
    console.log('tmdb user key: wired GET/PUT /api/tmdb/key');
  }
}

// === Frontend: _TMDBKEY component + mount in _AT_EXT ======================
{
  const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
  let c = fs.readFileSync(bundlePath, 'utf8');
  const marker = '/* mt-fork: tmdb-user-key */';
  if (c.includes(marker)) {
    console.log('tmdb user key: frontend already patched');
  } else {
    // Define _TMDBKEY just before the credentials wrapper anchor used by other
    // application-tokens additions.
    const compDef = '_TMDBKEY=function(){' +
      'var _i=r.useState(""),input=_i[0],setInput=_i[1];' +
      'var _b=r.useState(false),busy=_b[0],setBusy=_b[1];' +
      'var _s=r.useState(null),status=_s[0],setStatus=_s[1];' +
      'var _m=r.useState(null),msg=_m[0],setMsg=_m[1];' +
      'var load=function(){fetch("/api/tmdb/key",{credentials:"same-origin"}).then(function(r){return r.json()}).then(setStatus).catch(function(){})};' +
      'r.useEffect(load,[]);' +
      'var save=function(){' +
        'setBusy(true);setMsg(null);' +
        'fetch("/api/tmdb/key",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey:input.trim()})})' +
          '.then(function(r){return r.json()})' +
          '.then(function(d){setBusy(false);if(d.error){setMsg({type:"error",text:d.error})}else{setInput("");setMsg({type:"success",text:d.cleared?xo._("Key deleted."):xo._("Key saved.")});load()}})' +
          '.catch(function(e){setBusy(false);setMsg({type:"error",text:String(e.message||e)})})' +
      '};' +
      'var clearKey=function(){' +
        'if(!confirm(xo._("Confirm delete TMDB key")))return;' +
        'setBusy(true);setMsg(null);' +
        'fetch("/api/tmdb/key",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey:""})})' +
          '.then(function(r){return r.json()}).then(function(){setBusy(false);setMsg({type:"success",text:xo._("Key deleted.")});load()})' +
          '.catch(function(e){setBusy(false);setMsg({type:"error",text:String(e.message||e)})})' +
      '};' +
      'return r.createElement("div",{className:"pb-2"},' +
        'r.createElement("p",{className:"text-sm text-gray-600 dark:text-gray-300 mb-2"},' +
          'xo._("TMDB key info"),' +
          'r.createElement("a",{href:"https://www.themoviedb.org/settings/api",target:"_blank",rel:"noopener noreferrer",className:"underline text-blue-600 dark:text-blue-400"},"themoviedb.org/settings/api"),' +
          'xo._("TMDB key info suffix")' +
        '),' +
        'status?r.createElement("div",{className:"text-sm mb-2"},' +
          'status.configured' +
            '?r.createElement(r.Fragment,null,r.createElement("span",{className:"text-green-700 dark:text-green-400"},xo._("Configured")),' +
              '" \\u00b7 ",xo._("source:")," ",r.createElement("b",null,status.source),' +
              '" \\u00b7 ",r.createElement("code",{className:"px-1 bg-slate-100 dark:bg-slate-700 rounded"},status.masked))' +
            ':r.createElement("span",{className:"text-amber-600 dark:text-amber-400"},xo._("TMDB not configured warning"))' +
        '):null,' +
        'r.createElement("form",{className:"flex gap-2 items-center",onSubmit:function(e){e.preventDefault();save()}},' +
          'r.createElement("input",{type:"password",placeholder:xo._("Paste your TMDB API key"),value:input,onChange:function(e){setInput(e.currentTarget.value)},className:"flex-1 px-3 py-1 rounded border dark:bg-slate-800 dark:border-slate-600 text-sm",autoComplete:"off",spellCheck:"false"}),' +
          'r.createElement("button",{type:"submit",disabled:busy||!input.trim(),className:"px-3 py-1 rounded text-sm text-white bg-purple-700 hover:bg-purple-800 disabled:bg-gray-500 disabled:cursor-not-allowed"},busy?"...":xo._("Save")),' +
          '(status&&status.hasFileKey)?r.createElement("button",{type:"button",onClick:clearKey,disabled:busy,className:"px-3 py-1 rounded text-sm border border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900"},xo._("Delete")):null' +
        '),' +
        'msg?r.createElement("div",{className:"mt-2 text-sm "+(msg.type==="success"?"text-green-700 dark:text-green-400":"text-red-600 dark:text-red-400")},msg.text):null' +
      ')' +
    '},';

    // Inject component definition before _v anchor (same convention).
    const compAnchor = '_v=function(e){';
    if (!c.includes(compAnchor)) { console.error('tmdb user key: _v anchor not found'); process.exit(1); }
    c = c.replace(compAnchor, compDef + compAnchor);

    // Mount it inside _AT_EXT after the YouTube section. The existing tail is
    // `r.createElement(my,{title:"YouTube"},r.createElement(_YTAUTH,null))` —
    // append a sibling for TMDB. Wrapped in `my` for consistent card chrome.
    const mountAnchor = 'r.createElement(my,{title:"YouTube"},r.createElement(_YTAUTH,null))';
    if (!c.includes(mountAnchor)) {
      console.error('tmdb user key: _AT_EXT mount anchor not found (did patch_credentials_to_tokens run first?)');
      process.exit(1);
    }
    const mountReplacement = mountAnchor +
      ',r.createElement("div",{className:"mt-3"}),' +
      'r.createElement(my,{title:xo._("TMDB tokens")},r.createElement(_TMDBKEY,null))';
    c = c.replace(mountAnchor, mountReplacement);

    c = marker + c;
    fs.writeFileSync(bundlePath, c);

    // Invalidate compressed variants so the static server reflects the change.
    const path = require('path');
    for (const ext of ['.br', '.gz']) {
      const p = bundlePath + ext;
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
        catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
      }
    }
    console.log('tmdb user key: injected _TMDBKEY and mounted in _AT_EXT');
  }
}

})();

// ===== patch_jellyfin_import_from_server.js =====
;(() => {
// /api/jellyfin/import-from-server: scan all of Jellyfin (Movies + Series)
// and, for each item:
//   - if MT already has it: mark `downloaded = 1` (option A)
//   - if MT doesn't have it: insert a stub mediaItem with provider IDs and
//     needsDetails=1 so the next metadata-refresh cycle pulls full details
//     from TMDB (option B)
//
// Also clears the in-memory `_jfLibCache` and `_jfLookupCache` so the
// "Available on Jellyfin" badge and "Play in Jellyfin" deeplink reflect the
// new contents on the next request.

const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('jellyfinImportFromServer =')) {
  console.log('jellyfin import-from-server: already patched');
} else {
  const method =
"  jellyfinImportFromServer = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
"    if (!process.env.JELLYFIN_URL || !process.env.JELLYFIN_API_KEY) { res.json({ ok: false, configured: false }); return; }\n" +
"    const knex = _dbconfig.Database.knex;\n" +
"    try {\n" +
"      const userId = await this.jellyfinUserId();\n" +
"      const list = await this.jellyfinFetch('/Users/' + userId + '/Items?Recursive=true&IncludeItemTypes=Movie,Series&Fields=ProviderIds&Limit=20000');\n" +
"      const items = list.Items || [];\n" +
"      let marked = 0, alreadyMarked = 0, created = 0, skippedNoIds = 0;\n" +
"      for (const it of items) {\n" +
"        const p = it.ProviderIds || {};\n" +
"        const mt = it.Type === 'Movie' ? 'movie' : it.Type === 'Series' ? 'tv' : null;\n" +
"        if (!mt) continue;\n" +
"        if (!p.Tmdb && !p.Imdb && !p.Tvdb) { skippedNoIds++; continue; }\n" +
"        let media = null;\n" +
"        if (p.Tmdb) media = await knex('mediaItem').where({ mediaType: mt, tmdbId: Number(p.Tmdb) }).first();\n" +
"        if (!media && p.Imdb) media = await knex('mediaItem').where({ mediaType: mt, imdbId: p.Imdb }).first();\n" +
"        if (!media && p.Tvdb && mt === 'tv') media = await knex('mediaItem').where({ mediaType: mt, tvdbId: Number(p.Tvdb) }).first();\n" +
"        if (media) {\n" +
"          if (media.downloaded) { alreadyMarked++; continue; }\n" +
"          await knex('mediaItem').where('id', media.id).update('downloaded', true);\n" +
"          marked++;\n" +
"        } else {\n" +
"          try {\n" +
"            await knex('mediaItem').insert({\n" +
"              title: it.Name || '(unknown)',\n" +
"              mediaType: mt,\n" +
"              tmdbId: p.Tmdb ? Number(p.Tmdb) : null,\n" +
"              imdbId: p.Imdb || null,\n" +
"              tvdbId: p.Tvdb && mt === 'tv' ? Number(p.Tvdb) : null,\n" +
"              source: 'tmdb',\n" +
"              needsDetails: 1,\n" +
"              lastTimeUpdated: 0,\n" +
"              downloaded: 1\n" +
"            });\n" +
"            created++;\n" +
"          } catch (e) { skippedNoIds++; }\n" +
"        }\n" +
"      }\n" +
"      if (global._jfLibCache) global._jfLibCache.clear();\n" +
"      if (global._jfLookupCache) global._jfLookupCache.clear();\n" +
"      res.json({ ok: true, jellyfinItems: items.length, newlyMarked: marked, alreadyMarked, created, skippedNoIds });\n" +
"    } catch (e) {\n" +
"      res.status(500).json({ error: e.message });\n" +
"    }\n" +
"  });\n";

  const anchor = '}\nexports.MediaItemController = MediaItemController;';
  if (!c.includes(anchor)) { console.error('jellyfin import-from-server: anchor not found'); process.exit(1); }
  c = c.replace(anchor, method + anchor);
  fs.writeFileSync(path, c);
  console.log('jellyfin import-from-server: added jellyfinImportFromServer method');
}

// Register route
const routesPath = '/app/build/generated/routes/routes.js';
let r = fs.readFileSync(routesPath, 'utf8');
if (r.includes("/api/jellyfin/import-from-server'")) {
  console.log('jellyfin import-from-server: route already registered');
} else {
  const routeAnchor = "router.post('/api/jellyfin/sync-downloaded'";
  if (!r.includes(routeAnchor)) { console.error('jellyfin import-from-server: route anchor not found'); process.exit(1); }
  const routeLine = "router.post('/api/jellyfin/import-from-server', validatorHandler({}), _MediaItemController.jellyfinImportFromServer);\n";
  r = r.replace(routeAnchor, routeLine + routeAnchor);
  fs.writeFileSync(routesPath, r);
  console.log('jellyfin import-from-server: route registered');
}

})();

// ===== patch_jellyfin_import_buttons.js =====
;(() => {
// Two purple "Refrescar desde Jellyfin" buttons — one next to the Downloaded
// page title (_DLP) and one inside the _JF section in /settings/application-tokens.
// Both call /api/jellyfin/import-from-server (defined by
// patch_jellyfin_import_from_server.js): mark existing MT items as downloaded
// when they're in Jellyfin, and create stubs for new ones. Also busts the
// client-side `__jfLib` cache so the "Available on Jellyfin" badge and the
// "Play in Jellyfin" deeplink update for the just-imported items.
//
// MUST run AFTER patch_downloaded_tab.js (defines _DLP) and
// patch_jellyfin_frontend.js (defines _JF).

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: jellyfin-import-buttons */';
if (c.includes(marker)) {
  console.log('jellyfin import buttons: already patched');
  return /* was process.exit(0) */;
}

// Shared helper. Defined as a comma-chained var-decl entry next to other
// component definitions so it lives inside the bundle's IIFE scope (where HW
// — the React Query client — is in closure).
const helperDef = '_jfImportFromServer=function(setBusy){' +
  'setBusy(true);' +
  'return fetch("/api/jellyfin/import-from-server",{method:"POST",credentials:"same-origin"})' +
    '.then(function(r){return r.json()})' +
    '.then(function(d){' +
      'setBusy(false);' +
      'if(d.error){alert("Error: "+d.error);return d}' +
      'if(d.configured===false){alert("Jellyfin no est\\u00e1 configurado");return d}' +
      'window.__jfLib=undefined;window.__jfLibPromise=undefined;' +
      'try{HW.invalidateQueries()}catch(_){}' +
      'alert("Importados desde Jellyfin: "+d.jellyfinItems+" items \\u00b7 nuevos: "+d.created+" \\u00b7 marcados como descargados: "+d.newlyMarked+" \\u00b7 ya marcados: "+d.alreadyMarked+(d.skippedNoIds?(" \\u00b7 sin IDs: "+d.skippedNoIds):""));' +
      'return d' +
    '})' +
    '.catch(function(e){setBusy(false);alert(String(e.message||e))})' +
'},';

const compAnchor = '_v=function(e){';
if (!c.includes(compAnchor)) { console.error('jellyfin import buttons: _v anchor not found'); process.exit(1); }
c = c.replace(compAnchor, helperDef + compAnchor);

// === 1. Downloaded page (_DLP). Add busy state + button next to the h2 title. ===
const dlpFnAnchor = '_DLP=function(){';
if (!c.includes(dlpFnAnchor)) { console.error('jellyfin import buttons: _DLP anchor not found'); process.exit(1); }
const dlpFnReplacement = '_DLP=function(){' +
  'var _jfb=r.useState(false),jfBusy=_jfb[0],setJfBusy=_jfb[1];' +
  'var jfImport=function(){_jfImportFromServer(setJfBusy)};';
c = c.replace(dlpFnAnchor, dlpFnReplacement);

const dlpTitleAnchor = 'r.createElement("h2",{className:"text-2xl mb-4 px-2"},xo._("Downloaded")),';
if (!c.includes(dlpTitleAnchor)) { console.error('jellyfin import buttons: _DLP title anchor not found'); process.exit(1); }
const dlpTitleReplacement =
  // Header row: title with extra horizontal breathing room before the button.
  'r.createElement("div",{className:"flex items-center gap-6 mb-2 px-2"},' +
    'r.createElement("h2",{className:"text-2xl"},xo._("Downloaded")),' +
    'r.createElement("button",{onClick:jfImport,disabled:jfBusy,className:"px-3 py-1 rounded text-sm text-white bg-purple-700 hover:bg-purple-800 disabled:bg-gray-500 disabled:cursor-not-allowed inline-flex items-center gap-1"},' +
      'r.createElement("i",{className:"material-icons text-base"},jfBusy?"hourglass_top":"refresh"),' +
      'jfBusy?xo._("Importing..."):xo._("Refresh from Jellyfin")' +
    ')' +
  '),' +
  // Hint pointing users to where Jellyfin is actually configured.
  'r.createElement("p",{className:"text-sm text-gray-500 dark:text-gray-400 italic mb-4 px-2"},' +
    'xo._("Configure Jellyfin connection in "),' +
    'r.createElement("a",{href:"#/settings/application-tokens",className:"underline text-blue-600 dark:text-blue-400 not-italic"},xo._("Application tokens")),' +
    '"."' +
  '),';
c = c.replace(dlpTitleAnchor, dlpTitleReplacement);
console.log('jellyfin import buttons: added button to Downloaded page (_DLP)');

// === 2. _JF (Jellyfin section in /settings/application-tokens). Add a third action button. ===
const jfBusyAnchor = 'var _b=r.useState(false),busy=_b[0],setBusy=_b[1];';
if (!c.includes(jfBusyAnchor)) { console.error('jellyfin import buttons: _JF busy anchor not found'); process.exit(1); }
const jfBusyReplacement = jfBusyAnchor +
  'var _jfib=r.useState(false),jfImpBusy=_jfib[0],setJfImpBusy=_jfib[1];';
c = c.replace(jfBusyAnchor, jfBusyReplacement);

const jfEditBtnAnchor = 'r.createElement("button",{onClick:function(){setEdit(true)},className:"px-4 py-2 bg-gray-200';
if (!c.includes(jfEditBtnAnchor)) { console.error('jellyfin import buttons: _JF edit-button anchor not found'); process.exit(1); }
const jfNewBtn =
  'r.createElement("button",{onClick:function(){_jfImportFromServer(setJfImpBusy)},disabled:jfImpBusy,className:"px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-500 text-white rounded shadow inline-flex items-center gap-2"},' +
    'r.createElement("i",{className:"material-icons"},jfImpBusy?"hourglass_top":"refresh"),' +
    'jfImpBusy?xo._("Importing..."):xo._("Refresh from Jellyfin")' +
  '),';
c = c.replace(jfEditBtnAnchor, jfNewBtn + jfEditBtnAnchor);
console.log('jellyfin import buttons: added button to _JF (settings)');

c = marker + c;
fs.writeFileSync(bundlePath, c);

// Invalidate compressed variants.
const path = require('path');
for (const ext of ['.br', '.gz']) {
  const p = bundlePath + ext;
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
    catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
  }
}

console.log('jellyfin import buttons: done');

})();

// ===== patch_bundle_rename.js =====
;(() => {
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pubDir = '/app/public';
const idxPath = path.join(pubDir, 'index.html');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
const oldName = path.basename(bundlePath);

// If filename already includes a content hash suffix (`_xxxxxxxxxxxx.js`), skip.
if (/_[a-f0-9]{12}\.js$/.test(oldName)) {
  console.log('bundle rename: already content-hashed (' + oldName + ')');
  return /* was process.exit(0) */;
}

const content = fs.readFileSync(bundlePath);
const hash = crypto.createHash('sha1').update(content).digest('hex').slice(0, 12);
const newName = oldName.replace(/\.js$/, '_' + hash + '.js');
const newPath = path.join(pubDir, newName);

fs.renameSync(bundlePath, newPath);
console.log('bundle rename: ' + oldName + ' → ' + newName);

// Move sibling artifacts (.LICENSE.txt is the only one that exists at this point;
// .gz/.br are regenerated downstream, .map doesn't exist in the runtime image).
['.LICENSE.txt'].forEach(ext => {
  const oldSib = bundlePath + ext;
  if (fs.existsSync(oldSib)) {
    fs.renameSync(oldSib, newPath + ext);
    console.log('bundle rename: ' + oldName + ext + ' → ' + newName + ext);
  }
});

// Rewrite all references to the old basename in index.html
let idx = fs.readFileSync(idxPath, 'utf8');
const refCount = idx.split(oldName).length - 1;
if (refCount > 0) {
  idx = idx.split(oldName).join(newName);
  fs.writeFileSync(idxPath, idx);
  console.log('bundle rename: updated ' + refCount + ' refs in index.html');
}

})();

// ===== patch_index_html_title.js =====
;(() => {
// Update <title> in index.html: "Media Tracker" → "MediaTOC".
// Idempotent: only rewrites if the upstream title is still present.

const fs = require('fs');
const path = '/app/public/index.html';
let c = fs.readFileSync(path, 'utf8');

const old = '<title>Media Tracker</title>';
const fresh = '<title>MediaTOC</title>';

if (c.includes(fresh)) {
  console.log('index.html title: already MediaTOC');
  return /* was process.exit(0) */;
}
if (!c.includes(old)) {
  console.log('index.html title: anchor not found (upstream changed?), skipping');
  return /* was process.exit(0) */;
}
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('index.html title: rewritten to MediaTOC');

})();

// ===== patch_pwa.js =====
;(() => {
const fs = require('fs');
const path = require('path');

const crypto = require('crypto');
const pubDir = '/app/public';
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
const bundleName = path.basename(bundlePath);
// Hash the bundle CONTENTS (post-patches) so each rebuild that actually changes
// the bundle invalidates the SW cache. Using just the filename meant that our
// patches were silently served from stale cache after rebuilds.
const bundleHash = crypto.createHash('sha1').update(fs.readFileSync(bundlePath)).digest('hex').slice(0, 12);

// ---------- 1. manifest.json ----------
const manifest = {
  name: "MediaTOC",
  short_name: "MediaTOC",
  description: "Self-hosted media tracker for completionists",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#0f172a",
  theme_color: "#0f172a",
  lang: "es",
  icons: [
    { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { src: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" }
  ]
};
fs.writeFileSync(path.join(pubDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('pwa: wrote manifest.json');

// ---------- 2. sw.js (service worker) ----------
// Cache version is tied to the bundle filename — when the bundle hash changes, a new SW
// activates and old caches are evicted. No manual bumping needed.
const swCode = `// MediaTOC service worker — generated at build time
const VERSION = ${JSON.stringify(bundleName + '-' + bundleHash + '-' + Date.now())};
const STATIC_CACHE = 'mt-static-' + VERSION;
const RUNTIME_CACHE = 'mt-runtime-' + VERSION;
const IMAGE_CACHE = 'mt-images-' + VERSION;
const API_CACHE = 'mt-api-' + VERSION;

const PRECACHE = [
  '/',
  '/' + ${JSON.stringify(bundleName)},
  '/manifest.json',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => {
        if (![STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE, API_CACHE].includes(k)) {
          return caches.delete(k);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return /\\.(js|css|woff2?|ttf|otf|eot)$/i.test(url.pathname);
}
function isImage(url) {
  return /\\.(png|jpe?g|gif|svg|webp|ico|avif)$/i.test(url.pathname);
}
function isApi(url) {
  return url.pathname.startsWith('/api/');
}
function isNavigation(req) {
  return req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'));
}

// Cache-first: try cache, fallback to network, store on miss
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    if (resp && resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
}

// Stale-while-revalidate: return cache immediately, update in background
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((resp) => {
    if (resp && resp.ok) cache.put(req, resp.clone());
    return resp;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// Network-first: try network, fallback to cache (used for API + navigation)
async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(req);
    if (resp && resp.ok && req.method === 'GET') cache.put(req, resp.clone());
    return resp;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
  } else if (isImage(url)) {
    event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE));
  } else if (isApi(url)) {
    event.respondWith(networkFirst(req, API_CACHE));
  } else if (isNavigation(req)) {
    event.respondWith(
      networkFirst(req, RUNTIME_CACHE).catch(() => caches.match('/'))
    );
  }
});
`;
fs.writeFileSync(path.join(pubDir, 'sw.js'), swCode);
// Pre-compress: the static handler swaps /sw.js → /sw.js.br|.gz based on Accept-Encoding;
// without these variants the swap targets a missing file and the request 401s through auth.
const zlib = require('zlib');
fs.writeFileSync(path.join(pubDir, 'sw.js.gz'), zlib.gzipSync(Buffer.from(swCode), { level: 9 }));
fs.writeFileSync(path.join(pubDir, 'sw.js.br'), zlib.brotliCompressSync(Buffer.from(swCode)));
console.log('pwa: wrote sw.js (cache version = ' + bundleName + ') + .gz + .br');

// ---------- 3. Patch index.html ----------
const idxPath = path.join(pubDir, 'index.html');
let idx = fs.readFileSync(idxPath, 'utf8');
let idxChanged = false;

if (!idx.includes('rel="manifest"')) {
  idx = idx.replace('</head>', '  <link rel="manifest" href="/manifest.json">\n  <meta name="theme-color" content="#0f172a">\n  </head>');
  idxChanged = true;
  console.log('pwa: linked manifest.json in index.html');
} else {
  console.log('pwa: manifest link already present');
}

const swReg = '<script>if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(e){console.warn("SW registration failed",e)})})}</script>';
if (!idx.includes('navigator.serviceWorker.register')) {
  idx = idx.replace('</body>', '  ' + swReg + '\n</body>');
  idxChanged = true;
  console.log('pwa: injected service worker registration');
} else {
  console.log('pwa: SW registration already present');
}

if (idxChanged) fs.writeFileSync(idxPath, idx);
console.log('pwa: complete');

})();
