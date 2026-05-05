// Auto-generated mega-patch: patch_03_downloaded_links_wp.js
// Bundles 19 original patch_*.js scripts in execution order.
// Each constituent is wrapped in an IIFE so its top-level vars (const fs = ...)
// don't collide; `process.exit(0)` is rewritten to `return` so an early-exit
// idempotency guard inside one constituent doesn't abort the whole mega-patch.

// ===== patch_downloaded_migration.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/migrations/20260428000000_addDownloadedToMediaItem.js';

if (fs.existsSync(path)) {
  console.log('migration: already exists, skipping');
  return /* was process.exit(0) */;
}

const content = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.down = down;
exports.up = up;
async function up(knex) {
  const has = await knex.schema.hasColumn('mediaItem', 'downloaded');
  if (!has) {
    await knex.schema.alterTable('mediaItem', table => {
      table.boolean('downloaded').defaultTo(false);
    });
  }
}
async function down(knex) {
  const has = await knex.schema.hasColumn('mediaItem', 'downloaded');
  if (has) {
    await knex.schema.alterTable('mediaItem', table => {
      table.dropColumn('downloaded');
    });
  }
}
`;

fs.writeFileSync(path, content);
console.log('migration: created 20260428000000_addDownloadedToMediaItem.js');

})();

// ===== patch_downloaded_entity.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/entity/mediaItem.js';
let c = fs.readFileSync(path, 'utf8');

const old = "'posterId', 'backdropId']";
const patched = "'posterId', 'backdropId', 'downloaded']";

if (c.includes(patched)) { console.log('entity: already patched'); return /* was process.exit(0) */; }
if (!c.includes(old)) { console.error('entity: anchor not found'); process.exit(1); }

fs.writeFileSync(path, c.replace(old, patched));
console.log('entity: added downloaded to mediaItemColumns');

})();

// ===== patch_downloaded_repo.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/repository/mediaItem.js';
let c = fs.readFileSync(path, 'utf8');

const old = "booleanColumnNames: ['needsDetails']";
const patched = "booleanColumnNames: ['needsDetails', 'downloaded']";

if (c.includes(patched)) { console.log('repo: already patched'); return /* was process.exit(0) */; }
if (!c.includes(old)) { console.error('repo: anchor not found'); process.exit(1); }

fs.writeFileSync(path, c.replace(old, patched));
console.log('repo: added downloaded to booleanColumnNames');

})();

// ===== patch_downloaded_items.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

const old = "onWatchlist: Boolean(row['listItem.id']),";
const patched = "downloaded: Boolean(row['mediaItem.downloaded']),\n    onWatchlist: Boolean(row['listItem.id']),";

if (c.includes(patched)) { console.log('items: already patched'); return /* was process.exit(0) */; }
if (!c.includes(old)) { console.error('items: anchor not found'); process.exit(1); }

fs.writeFileSync(path, c.replace(old, patched));
console.log('items: added downloaded field to result mapping');

})();

// ===== patch_audio_progress_in_items.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

// Add audioProgress + links to mapRawResult so cards can read them.
// (lastSeenAt is already mapped natively by upstream — see line ~394 of
// items.js: `lastSeenAt: row['lastSeenAt']` — so it's available on cards
// without us needing to add it.)
const old = "downloaded: Boolean(row['mediaItem.downloaded']),";
const fresh = "downloaded: Boolean(row['mediaItem.downloaded']),\n    audioProgress: row['mediaItem.audioProgress'],\n    links: row['mediaItem.links'],";

if (c.includes("audioProgress: row['mediaItem.audioProgress']")) {
  console.log('audio-progress in items: already mapped');
  return /* was process.exit(0) */;
}
if (!c.includes(old)) {
  const idx = c.indexOf("downloaded:");
  console.error('audio-progress in items: anchor not found. Found "downloaded:" at idx=' + idx);
  if (idx > -1) console.error('Context: ' + JSON.stringify(c.slice(idx, idx+80)));
  process.exit(1);
}
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('audio-progress in items: added audioProgress + links to mapRawResult');

})();

// ===== patch_downloaded_controller.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('toggleDownloaded')) { console.log('controller: already patched'); return /* was process.exit(0) */; }

// Add Database import after existing imports
const oldImport = 'var _updateMetadata = require("../updateMetadata");';
const newImport = 'var _updateMetadata = require("../updateMetadata");\nvar _dbconfig = require("../dbconfig");';
if (!c.includes(oldImport)) { console.error('controller: import anchor not found'); process.exit(1); }
c = c.replace(oldImport, newImport);

// Add toggleDownloaded method before closing brace of class
const oldClose = "}\nexports.MediaItemController = MediaItemController;";
const newClose = `  toggleDownloaded = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const { mediaItemId } = req.query;
    const item = await _dbconfig.Database.knex('mediaItem').select('downloaded').where('id', mediaItemId).first();
    if (!item) { res.status(404).send(); return; }
    await _dbconfig.Database.knex('mediaItem').update({ downloaded: item.downloaded ? 0 : 1 }).where('id', mediaItemId);
    res.sendStatus(200);
  });
}
exports.MediaItemController = MediaItemController;`;

if (!c.includes(oldClose)) { console.error('controller: class close anchor not found'); process.exit(1); }
c = c.replace(oldClose, newClose);

fs.writeFileSync(path, c);
console.log('controller: added toggleDownloaded method');

})();

// ===== patch_downloaded_routes.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('/api/downloaded')) { console.log('routes: already patched'); return /* was process.exit(0) */; }

const anchor = "router.get('/api/details/update-metadata/:mediaItemId'";
if (!c.includes(anchor)) { console.error('routes: anchor not found'); process.exit(1); }

const newRoute = `router.patch('/api/downloaded', validatorHandler({
  requestQuerySchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { mediaItemId: { type: 'number' } },
    required: ['mediaItemId']
  }
}), _MediaItemController.toggleDownloaded);
`;

c = c.replace(anchor, newRoute + anchor);
fs.writeFileSync(path, c);
console.log('routes: added PATCH /api/downloaded');

})();

// ===== patch_downloaded_frontend.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Inject _DL component definition before _v card component
// _v lives inside `var Ov,Lv,Hv,_v=function(e){...}` — inject as another comma-separated declarator.
// Style matches the watchlist (Pendiente) button: Fv badge with span.material-icons inside, no inline color.
const componentDef = `_DL=function(e){var _s=r.useState(!!e.d),_t=_s[0],_u=_s[1];r.useEffect(function(){_u(!!e.d)},[e.d]);var _toggle=function(n){n.preventDefault();n.stopPropagation();var a=!_t;_u(a);fetch("/api/downloaded?mediaItemId="+e.id,{method:"PATCH",credentials:"same-origin"}).catch(function(){_u(_t)})};return r.createElement("div",{className:"inline-flex pointer-events-auto hover:cursor-pointer",title:_t?"Descargado":"Marcar como descargado",onClick:_toggle},r.createElement(Fv,null,r.createElement("span",{className:"flex material-icons"},_t?"download_done":"arrow_downward")))},`;

const cardAnchor = '_v=function(e){';
if (!c.includes(cardAnchor)) { console.error('frontend: _v anchor not found'); process.exit(1); }
if (c.includes('_DL=function(e){var _s=r.useState')) { console.log('frontend: _DL already injected'); }
else {
  c = c.replace(cardAnchor, componentDef + cardAnchor);
  console.log('frontend: injected _DL component');
}

// 2. Add download button to card bottom-right corner
const btnAnchor = 'm&&Wo(t)&&r.createElement("div",{className:"absolute pointer-events-auto bottom-1 left-1"},r.createElement(Yo,{mediaItem:t,season:n,episode:a}))';
const btnReplacement = btnAnchor + ',r.createElement("div",{className:"absolute pointer-events-auto bottom-1 right-1"},r.createElement(_DL,{id:t.id,d:t.downloaded}))';

if (c.includes('r.createElement(_DL')) { console.log('frontend: _DL usage already patched'); }
else if (!c.includes(btnAnchor)) { console.error('frontend: bottom-left anchor not found'); process.exit(1); }
else {
  c = c.replace(btnAnchor, btnReplacement);
  console.log('frontend: added download button to card bottom-right');
}

fs.writeFileSync(bundlePath, c);
console.log('frontend: download button patch complete');

})();

// ===== patch_audiobook_icon.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// In the non-TV seen check, show music_note for audiobooks instead of check_circle_outline
const old = 's.showUnwatchedEpisodesCount&&1==t.seen&&r.createElement("div",{className:"absolute inline-flex pointer-events-auto foo right-1 top-1"},r.createElement(Fv,null,r.createElement("i",{className:"flex text-white select-none material-icons"},"check_circle_outline")))';

const patched = 's.showUnwatchedEpisodesCount&&1==t.seen&&r.createElement("div",{className:"absolute inline-flex pointer-events-auto foo right-1 top-1"},r.createElement(Fv,null,r.createElement("i",{className:"flex text-white select-none material-icons"},"audiobook"===t.mediaType?"music_note":"check_circle_outline")))';

if (c.includes(patched)) { console.log('audiobook_icon: already patched'); return /* was process.exit(0) */; }
if (!c.includes(old)) { console.error('audiobook_icon: anchor not found'); process.exit(1); }

c = c.replace(old, patched);
fs.writeFileSync(bundlePath, c);
console.log('audiobook_icon: music_note for listened audiobooks OK');

})();

// ===== patch_links_migration.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/migrations/20260428000001_addLinksToMediaItem.js';

if (fs.existsSync(path)) { console.log('links migration: already exists'); return /* was process.exit(0) */; }

fs.writeFileSync(path, `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.down = down; exports.up = up;
async function up(knex) {
  const has = await knex.schema.hasColumn('mediaItem', 'links');
  if (!has) await knex.schema.alterTable('mediaItem', t => t.text('links').defaultTo('[]'));
}
async function down(knex) {
  const has = await knex.schema.hasColumn('mediaItem', 'links');
  if (has) await knex.schema.alterTable('mediaItem', t => t.dropColumn('links'));
}
`);
console.log('links migration: created');

})();

// ===== patch_links_entity.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/entity/mediaItem.js';
let c = fs.readFileSync(path, 'utf8');

const old = "'posterId', 'backdropId', 'downloaded']";
const pat = "'posterId', 'backdropId', 'downloaded', 'links']";

if (c.includes(pat)) { console.log('links entity: already patched'); return /* was process.exit(0) */; }
if (!c.includes(old)) { console.error('links entity: anchor not found'); process.exit(1); }

fs.writeFileSync(path, c.replace(old, pat));
console.log('links entity: added links to mediaItemColumns');

})();

// ===== patch_links_controller.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('updateLinks')) { console.log('links controller: already patched'); return /* was process.exit(0) */; }

const old = 'exports.MediaItemController = MediaItemController;';
const method = `  updateLinks = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const { mediaItemId } = req.query;
    const { links } = req.body;
    if (!Array.isArray(links)) { res.status(400).send(); return; }
    const safe = links.map(l => ({ label: String(l.label || l.url || ''), url: String(l.url || '') })).filter(l => l.url);
    await _dbconfig.Database.knex('mediaItem').update({ links: JSON.stringify(safe) }).where('id', mediaItemId);
    res.sendStatus(200);
  });
`;

if (!c.includes('}\nexports.MediaItemController')) { console.error('links controller: close anchor not found'); process.exit(1); }
c = c.replace('}\nexports.MediaItemController = MediaItemController;', method + '}\nexports.MediaItemController = MediaItemController;');

fs.writeFileSync(path, c);
console.log('links controller: added updateLinks method');

})();

// ===== patch_links_routes.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('/api/links')) { console.log('links routes: already patched'); return /* was process.exit(0) */; }

const anchor = "router.patch('/api/downloaded'";
if (!c.includes(anchor)) { console.error('links routes: anchor not found'); process.exit(1); }

const route = `router.put('/api/links', validatorHandler({
  requestQuerySchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { mediaItemId: { type: 'number' } },
    required: ['mediaItemId']
  },
  requestBodySchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { links: { type: 'array' } },
    required: ['links']
  }
}), _MediaItemController.updateLinks);
`;

c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('links routes: added PUT /api/links');

})();

// ===== patch_links_frontend.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Inject _LK component definition before _v card component
// _v is part of `var Ov,Lv,Hv,_v=function(e){...}` — inject as another comma-separated declarator
const compDef = `_LK=function(e){` +
  `var t=e.mediaItem;` +
  `var _p=function(){try{return JSON.parse(t.links||"[]")}catch(x){return []}};` +
  `var _q=r.useState(_p()),_ls=_q[0],_sl=_q[1];` +
  `var _a=r.useState(""),_nl=_a[0],_sn=_a[1];` +
  `var _b=r.useState(""),_nu=_b[0],_su=_b[1];` +
  `r.useEffect(function(){_sl(_p())},[t.links]);` +
  `var _sv=function(u){_sl(u);fetch("/api/links?mediaItemId="+t.id,{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({links:u})})};` +
  `var _add=function(ev){ev.preventDefault();if(!_nu)return;var u=[].concat(_ls,[{label:_nl||_nu,url:_nu}]);_sv(u);_sn("");_su("")};` +
  `var _rm=function(i){_sv(_ls.filter(function(_,idx){return idx!==i}))};` +
  `return r.createElement("div",{className:"mt-4"},` +
    `r.createElement("div",{className:"font-bold mb-2"},"Links"),` +
    `_ls.map(function(lk,i){return r.createElement("div",{key:i,className:"flex items-center gap-2 mb-1"},` +
      `r.createElement("a",{href:lk.url,target:"_blank",rel:"noopener noreferrer",className:"underline text-blue-400 truncate"},lk.label),` +
      `r.createElement("i",{className:"material-icons text-sm text-red-400 cursor-pointer select-none",onClick:function(){_rm(i)}},"delete_outline")` +
    `)}),` +
    `r.createElement("form",{onSubmit:_add,className:"flex gap-1 mt-2"},` +
      `r.createElement("input",{type:"text",placeholder:"Etiqueta",value:_nl,onChange:function(ev){_sn(ev.target.value)},className:"border rounded px-1 text-sm w-24 dark:bg-gray-700 dark:border-gray-600"}),` +
      `r.createElement("input",{type:"url",placeholder:"URL",value:_nu,onChange:function(ev){_su(ev.target.value)},required:true,className:"border rounded px-1 text-sm flex-1 dark:bg-gray-700 dark:border-gray-600"}),` +
      `r.createElement("button",{type:"submit",className:"text-sm btn"},"+")` +
    `)` +
  `)` +
`},`;

const cardAnchor = '_v=function(e){';
if (!c.includes(cardAnchor)) { console.error('links frontend: _v anchor not found'); process.exit(1); }
if (c.includes('_LK=function(e){var t=e.mediaItem')) { console.log('links frontend: _LK already injected'); }
else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('links frontend: injected _LK component');
}

// 2. Add _LK to the detail page after the rating section
const detailAnchor = '(Wo(a)||!No(a))&&r.createElement(Zp,{userRating:a.userRating,mediaItem:a})';
const detailPatched = detailAnchor + ',r.createElement(_LK,{mediaItem:a})';

if (c.includes(detailPatched)) { console.log('links frontend: detail already patched'); }
else if (!c.includes(detailAnchor)) { console.error('links frontend: detail anchor not found'); process.exit(1); }
else {
  c = c.replace(detailAnchor, detailPatched);
  console.log('links frontend: added _LK to detail page');
}

fs.writeFileSync(bundlePath, c);
console.log('links frontend: complete');

})();

// ===== patch_wp_controller.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('watchProviders')) {
  // Strip prior version (had a broken `await import("node-fetch")` that always failed)
  c = c.replace(/  watchProviders = \(0, _typescriptRoutesToOpenapiServer\.createExpressRoute\)\(async \(req, res\) => \{[\s\S]*?\}\);\n/, '');
}

const old = 'exports.MediaItemController = MediaItemController;';
const method = `  watchProviders = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const { mediaItemId } = req.query;
    const item = await _dbconfig.Database.knex('mediaItem').select('tmdbId','igdbId','openlibraryId','audibleId','mediaType','title').where('id', mediaItemId).first();
    if (!item) { res.status(404).send(); return; }
    // Resolve TMDB key: env var first, then user-stored UI key in /storage/tmdb-key.json.
    let TMDB_KEY = process.env.TMDB_API_KEY;
    if (!TMDB_KEY) {
      try { TMDB_KEY = (JSON.parse(require('fs').readFileSync('/storage/tmdb-key.json','utf8')).apiKey || '').trim() || null; } catch(_) { TMDB_KEY = null; }
    }
    if (!TMDB_KEY) {
      res.status(503).json({ error: 'TMDB API key no configurada. Pégala en Tokens de aplicación (Tokens TMDB) o define TMDB_API_KEY en docker-compose.yml.' });
      return;
    }
    const results = [];
    try {
      if ((item.mediaType === 'movie' || item.mediaType === 'tv') && item.tmdbId) {
        const type = item.mediaType === 'tv' ? 'tv' : 'movie';
        const url = \`https://api.themoviedb.org/3/\${type}/\${item.tmdbId}/watch/providers?api_key=\${TMDB_KEY}\`;
        const r = await fetch(url);
        if (r.ok) {
          const data = await r.json();
          const region = (data && data.results && (data.results.ES || data.results.US)) || (data && data.results && Object.values(data.results)[0]);
          if (region) {
            const link = region.link || \`https://www.justwatch.com/es/buscar?q=\${encodeURIComponent(item.title)}\`;
            const seen = new Set();
            const pushAll = (list, kind) => (list || []).forEach(p => {
              if (seen.has(p.provider_id)) return;
              seen.add(p.provider_id);
              results.push({ name: p.provider_name, logo: \`https://image.tmdb.org/t/p/original\${p.logo_path}\`, url: link, kind });
            });
            pushAll(region.flatrate, 'streaming');
            pushAll(region.free, 'gratis');
            pushAll(region.ads, 'gratis-con-anuncios');
            pushAll(region.rent, 'alquiler');
            pushAll(region.buy, 'compra');
          }
        }
      }
      if (item.mediaType === 'video_game') {
        results.push({ name: 'Steam', logo: null, url: \`https://store.steampowered.com/search/?term=\${encodeURIComponent(item.title)}\` });
        results.push({ name: 'GOG', logo: null, url: \`https://www.gog.com/games?search=\${encodeURIComponent(item.title)}\` });
      }
      if (item.mediaType === 'book' && item.openlibraryId) {
        results.push({ name: 'OpenLibrary', logo: null, url: \`https://openlibrary.org/works/\${item.openlibraryId}\` });
        results.push({ name: 'Google Books', logo: null, url: \`https://books.google.es/books?q=\${encodeURIComponent(item.title)}\` });
      }
      if (item.mediaType === 'audiobook') {
        results.push({ name: 'Audible', logo: null, url: \`https://www.audible.es/search?keywords=\${encodeURIComponent(item.title)}\` });
        results.push({ name: 'Storytel', logo: null, url: \`https://www.storytel.com/es/es/search#q=\${encodeURIComponent(item.title)}\` });
      }
    } catch(e) {}
    res.json(results);
  });
`;

if (!c.includes('}\nexports.MediaItemController')) { console.error('wp controller: close anchor not found'); process.exit(1); }
c = c.replace('}\nexports.MediaItemController = MediaItemController;', method + '}\nexports.MediaItemController = MediaItemController;');
fs.writeFileSync(path, c);
console.log('wp controller: added watchProviders method');

})();

// ===== patch_wp_routes.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('/api/watch-providers')) { console.log('wp routes: already patched'); return /* was process.exit(0) */; }

const anchor = "router.patch('/api/downloaded'";
if (!c.includes(anchor)) { console.error('wp routes: anchor not found'); process.exit(1); }

const route = `router.get('/api/watch-providers', validatorHandler({
  requestQuerySchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { mediaItemId: { type: 'number' } },
    required: ['mediaItemId']
  }
}), _MediaItemController.watchProviders);
`;

c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('wp routes: added GET /api/watch-providers');

})();

// ===== patch_wp_frontend.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// _WP component: fetch watch providers and show icons/buttons in detail page
// _v is part of `var Ov,Lv,Hv,_v=function(e){...}` — inject as another comma-separated declarator
const compDef =
`_WP=function(e){` +
  `var t=e.mediaItem;` +
  `var _q=r.useState(null),_ps=_q[0],_sp=_q[1];` +
  `r.useEffect(function(){` +
    `_sp(null);` +
    `fetch("/api/watch-providers?mediaItemId="+t.id,{credentials:"same-origin"})` +
      `.then(function(r){return r.json()})` +
      `.then(function(d){_sp(d)})` +
      `.catch(function(){_sp([])});` +
  `},[t.id]);` +
  `if(!_ps||_ps.length===0)return null;` +
  `var groups={"streaming":"Streaming","gratis":"Gratis","gratis-con-anuncios":"Gratis (con anuncios)","alquiler":"Alquiler","compra":"Compra"};` +
  `var byKind={};` +
  `_ps.forEach(function(p){var k=p.kind||"streaming";if(!byKind[k])byKind[k]=[];byKind[k].push(p)});` +
  `return r.createElement("div",{className:"mt-4"},` +
    `r.createElement("div",{className:"font-bold mb-2"},"Disponible en"),` +
    `Object.keys(groups).filter(function(k){return byKind[k]}).map(function(k){` +
      `return r.createElement("div",{key:k,className:"mb-3"},` +
        `r.createElement("div",{className:"text-xs text-gray-500 mb-1"},groups[k]),` +
        `r.createElement("div",{className:"flex flex-wrap gap-2"},` +
          `byKind[k].map(function(p,i){` +
            `return r.createElement("a",{key:i,href:p.url,target:"_blank",rel:"noopener noreferrer",title:p.name,` +
              `className:"flex items-center gap-1 px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-sm hover:opacity-80"},` +
              `p.logo?r.createElement("img",{src:p.logo,alt:p.name,className:"h-5 w-5 rounded object-cover"})` +
                `:r.createElement("i",{className:"material-icons text-base"},"open_in_new"),` +
              `r.createElement("span",null,p.name)` +
            `)` +
          `})` +
        `)` +
      `)` +
    `})` +
  `)` +
`},`;

const cardAnchor = '_v=function(e){';
if (!c.includes(cardAnchor)) { console.error('wp frontend: _v anchor not found'); process.exit(1); }
if (c.includes('_WP=function(e){var t=e.mediaItem;var _q=r.useState(null)')) { console.log('wp frontend: _WP already injected'); }
else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('wp frontend: injected _WP component');
}

// Add _WP to detail page after links section
const detailAnchor = ',r.createElement(_LK,{mediaItem:a})';
const detailPatched = detailAnchor + ',r.createElement(_WP,{mediaItem:a})';

if (c.includes(detailPatched)) { console.log('wp frontend: detail already patched'); }
else if (!c.includes(detailAnchor)) { console.error('wp frontend: detail anchor (_LK) not found'); process.exit(1); }
else {
  c = c.replace(detailAnchor, detailPatched);
  console.log('wp frontend: added _WP to detail page');
}

fs.writeFileSync(bundlePath, c);
console.log('wp frontend: complete');

})();

// ===== patch_progress_card.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Card progress bar:
//   Movies/Books/Audiobooks/Games: from `t.progress` (per-mediaItem)
//   TV: from `t.firstUnwatchedEpisode.progress` (per current episode)
const old = 'Lo(t)&&r.createElement(r.Fragment,null,r.createElement("div",{className:"w-full h-2 mt-1 rounded bg-slate-300"},r.createElement("div",{className:"h-full rounded bg-slate-900",style:{width:"".concat(100*t.progress,"%")}})))';

// Pick the right progress source per mediaType:
//   audiobook → t.audioProgress
//   tv        → firstUnwatchedEpisode.progress
//   else      → t.progress
const PROG = '(jo(t)?(t.audioProgress||0):Ro(t)?((t.firstUnwatchedEpisode&&t.firstUnwatchedEpisode.progress)||0):(t.progress||0))';
// Show bar + Progreso button whenever the item has unfinished progress OR
// hasn't been seen yet. For non-TV items the user may also start a re-watch
// after completing it, so an active in-flight progress (0 < PROG < 1) makes
// the bar reappear even if t.seen is true.
//   TV     → has unwatched episodes
//   non-TV → not seen yet, OR re-watch in progress (0 < PROG < 1)
const HAS = '(Ro(t)?Boolean(t.firstUnwatchedEpisode):(!t.seen||(' + '(jo(t)?(t.audioProgress||0):(t.progress||0))' + '>0&&' + '(jo(t)?(t.audioProgress||0):(t.progress||0))' + '<1)))';

const patched = HAS + '&&r.createElement(r.Fragment,null,r.createElement("div",{className:"flex items-center justify-between mt-1"},' +
  'r.createElement("span",{className:"text-xs text-gray-400"},Math.round(100*' + PROG + '),"%"),' +
  '(Do(t)||jo(t)||Ao(t)||Io(t)||Ro(t))&&r.createElement(ug,{mediaItem:t})),' +
  'r.createElement("div",{className:"w-full h-2 mt-1 rounded bg-slate-300"},r.createElement("div",{className:"h-full rounded bg-slate-900",style:{width:"".concat(100*' + PROG + ',"%")}})))';

if (c.includes(patched)) { console.log('progress_card: already patched'); return /* was process.exit(0) */; }
if (!c.includes(old)) { console.error('progress_card: anchor not found'); process.exit(1); }

c = c.replace(old, patched);
fs.writeFileSync(bundlePath, c);
console.log('progress_card: added % text + Set Progress button on card');

})();

// ===== patch_login_page.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Always redirect unauthenticated users to /login
const routerOld = 'to:i.noUsers?"/register":"/login"';
if (!c.includes(routerOld)) {
  console.log('login page: router redirect already patched');
} else {
  c = c.replace(routerOld, 'to:"/login"');
  console.log('login page: router now always redirects to /login');
}

// Always register /login route (remove !noUsers condition so it exists even with no users)
const loginRouteOld = '!i.noUsers&&r.createElement(Q,{path:"/login",element:r.createElement(Vv,{key:"/login"})})';
const loginRouteNew = 'r.createElement(Q,{path:"/login",element:r.createElement(Vv,{key:"/login"})})';
if (!c.includes(loginRouteOld)) {
  console.log('login page: /login route condition already patched');
} else {
  c = c.replace(loginRouteOld, loginRouteNew);
  console.log('login page: /login route now always registered');
}

// Login page: move Register button ABOVE the form (after the Login title heading)
// Include trailing comma in removal pattern to avoid double-comma syntax error
const regBtnOld_cond = 'Boolean(null==m?void 0:m.enableRegistration)&&r.createElement(ie,{to:"/register"},r.createElement("button",{className:"w-full mt-4"},r.createElement(Xe,{id:"Register"}))),';
const regBtnOld_uncond = 'r.createElement(ie,{to:"/register"},r.createElement("button",{className:"w-full mt-4"},r.createElement(Xe,{id:"Register"}))),';
const regBtnAboveAnchor = 'r.createElement("div",{className:"mb-10 text-5xl"},r.createElement(Xe,{id:"Login"})),r.createElement("form"';
const regBtnAbovePatched = 'r.createElement("div",{className:"mb-10 text-5xl"},r.createElement(Xe,{id:"Login"})),r.createElement(ie,{to:"/register"},r.createElement("button",{className:"w-full mb-6 text-lg"},r.createElement(Xe,{id:"Register"}))),r.createElement("form"';

if (c.includes(regBtnAbovePatched)) {
  console.log('login page: register button above form already done');
} else {
  // Remove from below form first
  if (c.includes(regBtnOld_cond)) {
    c = c.replace(regBtnOld_cond, '');
    console.log('login page: removed conditional register button from below form');
  } else if (c.includes(regBtnOld_uncond)) {
    c = c.replace(regBtnOld_uncond, '');
    console.log('login page: removed unconditional register button from below form');
  }
  // Add above form
  if (!c.includes(regBtnAboveAnchor)) {
    console.error('login page: login title anchor not found'); process.exit(1);
  }
  c = c.replace(regBtnAboveAnchor, regBtnAbovePatched);
  console.log('login page: Register button moved ABOVE login form');
}

fs.writeFileSync(bundlePath, c);
console.log('login page: complete');

})();
