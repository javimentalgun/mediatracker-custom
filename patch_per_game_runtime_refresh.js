// Per-game "Refrescar tiempo IGDB" button on the detail page.
//
// Wraps `sg=function(e){...}` (the Update-metadata button component) so that,
// for video_game items with an igdbId, an extra button appears next to
// "Update metadata" that triggers POST /api/refresh-game-runtime/:mediaItemId
// (defined by patch_refresh_game_runtimes.js).
//
// On success: invalidate the detail query → the page re-renders with the new
// runtime. On unchanged / missing time-to-beat / error: alert().
//
// MUST run after patch_update_metadata_btn.js — that patch promotes the
// button to btn-blue and changes the Xe id to a conditional, which is the
// anchor we replace.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: per-game-igdb-refresh */';
if (c.includes(marker)) {
  console.log('per-game igdb refresh: already patched');
  process.exit(0);
}

// 1) Inject runtime-refresh state + handler inside sg=, right after `s=i.isLoading;`.
const stateAnchor = 's=i.isLoading;';
if (!c.includes(stateAnchor)) {
  console.error('per-game igdb refresh: sg= state anchor not found');
  process.exit(1);
}
const stateInjection =
  's=i.isLoading;' +
  'var _gr=r.useState(false),grBusy=_gr[0],setGrBusy=_gr[1];' +
  'var refreshGameRT=function(){' +
    'setGrBusy(true);' +
    'fetch("/api/refresh-game-runtime/"+a.id,{method:"POST",credentials:"same-origin"})' +
      '.then(function(r){return r.json()})' +
      '.then(function(d){' +
        'setGrBusy(false);' +
        'if(d.error){alert("Error: "+d.error);return}' +
        'if(d.updated){HW.invalidateQueries(en(a.id))}' +
        'else{alert(d.reason==="unchanged"?"Sin cambios \\u2014 el tiempo ya estaba al d\\u00eda":"Sin tiempo IGDB disponible para este juego")}' +
      '})' +
      '.catch(function(e){setGrBusy(false);alert(String(e.message||e))})' +
  '};';
c = c.replace(stateAnchor, stateInjection);

// 2) Wrap the return: original Update-metadata button + new IGDB refresh button (only for games with igdbId).
const oldReturn = 'return r.createElement("button",{className:"text-sm btn-blue",onClick:function(){return o()},disabled:s},r.createElement(Xe,{id:s?"Updating metadata":"Update metadata"}))';
if (!c.includes(oldReturn)) {
  console.error('per-game igdb refresh: sg= return anchor not found (did patch_update_metadata_btn run first?)');
  process.exit(1);
}
const newReturn = 'return r.createElement(r.Fragment,null,' +
  'r.createElement("button",{className:"text-sm btn-blue",onClick:function(){return o()},disabled:s},r.createElement(Xe,{id:s?"Updating metadata":"Update metadata"})),' +
  '(a.mediaType==="video_game"&&a.igdbId)?r.createElement("button",{className:"text-sm btn-blue",onClick:refreshGameRT,disabled:grBusy},grBusy?xo._("Refreshing IGDB..."):xo._("Refresh IGDB time")):null' +
')';
c = c.replace(oldReturn, newReturn);

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

console.log('per-game igdb refresh: done');
