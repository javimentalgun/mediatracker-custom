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
  process.exit(0);
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
  'r.createElement("div",{className:"flex items-center gap-3 mb-4 px-2"},' +
    'r.createElement("h2",{className:"text-2xl"},xo._("Downloaded")),' +
    'r.createElement("button",{onClick:jfImport,disabled:jfBusy,className:"px-3 py-1 rounded text-sm text-white bg-purple-700 hover:bg-purple-800 disabled:bg-gray-500 disabled:cursor-not-allowed inline-flex items-center gap-1"},' +
      'r.createElement("i",{className:"material-icons text-base"},jfBusy?"hourglass_top":"refresh"),' +
      'jfBusy?xo._("Importing..."):xo._("Refresh from Jellyfin")' +
    ')' +
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
