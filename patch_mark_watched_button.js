// "Marcar como visto" toggle on the detail page (replaces the easy-to-mis-click
// eye icon that used to live on game cards). Same visual style as the rest of
// the action row (`btn` / `btn-red`).
//   - Reads state from /api/item-flags (shared cache via _mtFetchItemFlags so
//     it loads in lockstep with _AB and _AIP).
//   - PUT /api/seen?mediaItemId=X&kind=watched&lastSeenAt=now to mark.
//   - DELETE /api/seen/watched/:mediaItemId to unmark — backed by the patch in
//     patch_item_flags_combined that deletes ONLY rows with kind='watched',
//     leaving any 'played' row intact.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:mark-watched-btn*/';
if (c.includes(marker)) {
  console.log('mark-watched-btn: already patched');
  process.exit(0);
}

// _MAS toggle component. Mirrors _AIP / _AB style.
const masDef = '_MAS=function(e){' + marker +
  'var mi=e.mediaItem;' +
  'var _s=r.useState(null),seen=_s[0],setS=_s[1];' +
  'var load=function(){' +
    'window._mtFetchItemFlags(mi.id).then(function(d){setS(!!d.seenWatched)})' +
  '};' +
  'r.useEffect(load,[mi.id]);' +
  'if(seen===null)return null;' +
  'var toggle=function(){' +
    'var url=seen?"/api/seen/watched/"+mi.id:"/api/seen?mediaItemId="+mi.id+"&lastSeenAt=now&kind=watched";' +
    'var method=seen?"DELETE":"PUT";' +
    'fetch(url,{method:method,credentials:"same-origin"}).then(function(){' +
      'setS(!seen);' +
      'window._mtBustItemFlags(mi.id);' +
      'try{HW.invalidateQueries(["items"])}catch(_){}; try{HW.invalidateQueries(["details",mi.id])}catch(_){};' +
    '})' +
  '};' +
  'return r.createElement("div",{className:"text-sm text-center "+(seen?"btn-red":"btn"),onClick:toggle},' +
    'r.createElement(Xe,{id:seen?"Stop being seen":"Mark as seen"})' +
  ')' +
'},';

// Inject _MAS in the comma-chain before _v.
const compAnchor = '_v=function(e){';
if (!c.includes(compAnchor)) {
  console.error('mark-watched-btn: _v anchor not found'); process.exit(1);
}
c = c.replace(compAnchor, masDef + compAnchor);

// _MAS is intentionally NOT mounted on the detail page. The "Marcar como
// completado" green button already covers the "I saw it" semantics for non-
// episodic media (theater, movies, books, audiobooks, games), so a separate
// "Visto" toggle was duplicate UX. We keep the _MAS component definition
// (and the /api/seen/watched/:id endpoint + seenWatched flag) intact so the
// game card "watched" eye-icon and any other consumers keep working.

fs.writeFileSync(bundlePath, c);
console.log('mark-watched-btn: _MAS defined but NOT mounted on detail panel (deduped vs Marcar como completado)');
