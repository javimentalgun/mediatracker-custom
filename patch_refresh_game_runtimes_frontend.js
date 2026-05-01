const fs = require('fs');
const child = require('child_process');

// Add a "Refresh game runtimes" section to the Backup page (admin-only). Lets
// the user trigger the bulk IGDB time-to-beat backfill without waiting for the
// 24h metadata-refresh cycle to populate mediaItem.runtime for all games.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:gr-refresh*/';
if (c.includes(marker)) {
  console.log('refresh game runtimes frontend: already patched');
  process.exit(0);
}

// _GR (game runtimes refresh) component — single button + result status.
const compDef = '_GR=function(){' +
  'var _s=r.useState(false),busy=_s[0],setBusy=_s[1];' +
  'var _r=r.useState(null),result=_r[0],setResult=_r[1];' +
  'var refresh=function(){' +
    'if(!confirm("Esto consultar\\u00e1 IGDB por cada juego. Puede tardar 1-2 minutos."))return;' +
    'setBusy(true);setResult(null);' +
    'fetch("/api/refresh-game-runtimes",{method:"POST",credentials:"same-origin"})' +
      '.then(function(r){return r.json()})' +
      '.then(function(d){setBusy(false);setResult(d)})' +
      '.catch(function(e){setBusy(false);setResult({error:String(e.message||e)})})' +
  '};' +
  'return r.createElement("div",{className:"flex flex-col gap-2"},' +
    'r.createElement("p",{className:"text-sm text-gray-600 dark:text-gray-300"},"Trae el tiempo total estimado (max IGDB time-to-beat) para cada juego con igdbId. Se usa en el resumen de la home."),' +
    'r.createElement("button",{onClick:refresh,disabled:busy,className:"self-start px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-500 text-white rounded shadow inline-flex items-center gap-2"},' +
      'r.createElement("i",{className:"material-icons"},busy?"hourglass_top":"refresh"),' +
      'busy?"Consultando IGDB...":"Refrescar tiempos de juegos"' +
    '),' +
    'result?r.createElement("div",{className:"p-3 rounded text-white "+(result.error?"bg-red-700":"bg-green-700")},' +
      'result.error?("Error: "+result.error):' +
      '("Total: "+result.total+" \\u00b7 actualizados: "+result.updated+" \\u00b7 sin cambios: "+result.unchanged+" \\u00b7 sin tiempo IGDB: "+result.missing+(result.failed?" \\u00b7 fallidos: "+result.failed:""))' +
    '):null' +
  ')' +
'},';

// Inject component definition before _v (same anchor used by other section components).
const compAnchor = '_v=function(e){';
if (c.includes('_GR=function(){')) {
  console.log('refresh game runtimes frontend: _GR already injected');
} else if (!c.includes(compAnchor)) {
  console.error('refresh game runtimes frontend: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(compAnchor, compDef + compAnchor);
  console.log('refresh game runtimes frontend: injected _GR component');
}

// Mount _GR inside _BK page. Place after the Jellyfin section, before "Automatic backups".
const bkAnchor = 'r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},xo._("Automatic backups"))';
const bkPatched = marker + 'r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},"Tiempo de juegos (IGDB)"),r.createElement(_GR,null),' + bkAnchor;
if (c.includes(marker + 'r.createElement("h2"')) {
  console.log('refresh game runtimes frontend: _GR already mounted');
} else if (!c.includes(bkAnchor)) {
  console.error('refresh game runtimes frontend: _BK anchor not found'); process.exit(1);
} else {
  c = c.replace(bkAnchor, bkPatched);
  console.log('refresh game runtimes frontend: mounted _GR in _BK page');
}

fs.writeFileSync(bundlePath, c);
console.log('refresh game runtimes frontend: complete');
