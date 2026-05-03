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
  process.exit(0);
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
