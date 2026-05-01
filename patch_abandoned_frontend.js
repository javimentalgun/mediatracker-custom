const fs = require('fs');
const child = require('child_process');

// Frontend wiring for the "Dropped / Abandonados" feature:
//   1. _AB component: a toggle button on the detail page (Marcar como abandonada
//      ↔ Reanudar) that hits PUT/DELETE /api/abandoned/:mediaItemId.
//   2. _ABS component: a /abandonados page that mirrors the Pendiente layout
//      (collapsible per-mediaType sections) but filters by onlyAbandoned.
//   3. Pendiente sections gain `excludeAbandoned: true` so abandoned items
//      don't show there anymore.
//   4. /abandonados route + hamburger menu entry.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:abandoned-frontend*/';
if (c.includes(marker)) {
  console.log('abandoned frontend: already patched');
  process.exit(0);
}

// === 1. _AB toggle component (detail-page button) ===
const abDef = '_AB=function(e){' +
  'var mi=e.mediaItem;' +
  'var _s=r.useState(null),abandoned=_s[0],setA=_s[1];' +
  'var load=function(){' +
    'fetch("/api/abandoned",{credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){setA((d.items||[]).indexOf(mi.id)>=0)}).catch(function(){setA(false)})' +
  '};' +
  'r.useEffect(load,[mi.id]);' +
  'if(abandoned===null)return null;' +
  'var toggle=function(){' +
    'var url="/api/abandoned/"+mi.id;' +
    'var method=abandoned?"DELETE":"PUT";' +
    'fetch(url,{method:method,credentials:"same-origin"}).then(function(r){return r.json()}).then(function(){' +
      'setA(!abandoned);' +
      'try{HW.invalidateQueries(["items"])}catch(_){}; try{HW.invalidateQueries(["details",mi.id])}catch(_){};' +
    '})' +
  '};' +
  'return r.createElement("div",{className:"text-sm "+(abandoned?"btn":"btn-red"),onClick:toggle},' +
    'r.createElement(Xe,{id:abandoned?"Resume":"Mark as dropped"})' +
  ')' +
'},';

// === 2. _ABS page component — matches _IPS layout (no _GamesSection sub-dropdowns) ===
const absDef = '_ABS=function(){' +
  'var _Section=function(props){' +
    'var st=r.useState(false),open=st[0],setOpen=st[1];' +
    'return r.createElement("div",{className:"mb-3 border border-slate-300 dark:border-slate-700 rounded overflow-hidden"},' +
      'r.createElement("button",{onClick:function(){setOpen(!open)},className:"w-full text-left text-xl font-semibold px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"},' +
        'r.createElement("i",{className:"material-icons"},open?"expand_more":"chevron_right"),' +
        'props.label' +
      '),' +
      'open&&r.createElement("div",{className:"p-2"},' +
        'r.createElement(Zv,{args:Object.assign({orderBy:"title",sortOrder:"asc"},props.args),showSortOrderControls:!1,showSearch:!1,gridItemAppearance:{showRating:!0,topBar:{showFirstUnwatchedEpisodeBadge:!0,showOnWatchlistIcon:!0,showUnwatchedEpisodesCount:!0}}})' +
      ')' +
    ')' +
  '};' +
  'return r.createElement("div",{className:"p-2"},' +
    'r.createElement("h2",{className:"text-2xl mb-4 px-2"},r.createElement(Xe,{id:"Dropped"})),' +
    'r.createElement(_Section,{label:xo._("Movies"),args:{mediaType:"movie",onlyAbandoned:!0}}),' +
    'r.createElement(_Section,{label:xo._("Tv"),args:{mediaType:"tv",onlyAbandoned:!0}}),' +
    'r.createElement(_Section,{label:xo._("Games"),args:{mediaType:"video_game",onlyAbandoned:!0}}),' +
    'r.createElement(_Section,{label:xo._("Books"),args:{mediaType:"book",onlyAbandoned:!0}})' +
  ')' +
'},';

// Inject both component definitions before _v (same anchor as other custom components).
const compAnchor = '_v=function(e){';
if (!c.includes(compAnchor)) { console.error('abandoned frontend: _v anchor not found'); process.exit(1); }
c = c.replace(compAnchor, abDef + absDef + compAnchor);
console.log('abandoned frontend: injected _AB + _ABS components');

// === 3. Detail-page: render _AB next to the watchlist toggle ===
// Anchor: the watchlist toggle ternary `…onWatchlist}(a)?r.createElement(<x>,{mediaItem:a}):r.createElement(<y>,{mediaItem:a})`.
// Match ends at the closing `)` of the ternary's else branch. The minified
// component vars (og/ig) are bundle-specific, so use \w+ for both.
const dpAnchor = /e\.onWatchlist\}\(a\)\?r\.createElement\(\w+,\{mediaItem:a\}\):r\.createElement\(\w+,\{mediaItem:a\}\)/;
const dpMatch = c.match(dpAnchor);
if (!dpMatch) {
  console.error('abandoned frontend: detail-page watchlist anchor not found');
  process.exit(1);
}
c = c.replace(dpAnchor, dpMatch[0] + ',r.createElement(_AB,{mediaItem:a})');
console.log('abandoned frontend: mounted _AB on detail page');

// === 4. /in-progress (Pendiente): add excludeAbandoned to all sections ===
// Pendiente has 4 _Section calls with onlyWithProgress:!0. Append excludeAbandoned:!0 to each.
const pendArgsRe = /args:\{mediaType:"(movie|tv|video_game|book)",onlyWithProgress:!0\}/g;
const pendMatches = (c.match(pendArgsRe) || []).length;
if (pendMatches < 4) {
  console.error('abandoned frontend: expected 4 Pendiente section args, found ' + pendMatches);
  process.exit(1);
}
c = c.replace(pendArgsRe, 'args:{mediaType:"$1",onlyWithProgress:!0,excludeAbandoned:!0}');
console.log('abandoned frontend: Pendiente sections now exclude abandoned (' + pendMatches + ' updated)');

// === 5. Register /abandonados route ===
const routeAnchor = 'r.createElement(Q,{path:"/in-progress",element:r.createElement(_IPS,null)})';
const routePatched = routeAnchor + ',r.createElement(Q,{path:"/abandonados",element:r.createElement(_ABS,null)})';
if (c.includes('path:"/abandonados"')) {
  console.log('abandoned frontend: route already added');
} else if (!c.includes(routeAnchor)) {
  console.error('abandoned frontend: /in-progress route anchor not found'); process.exit(1);
} else {
  c = c.replace(routeAnchor, routePatched);
  console.log('abandoned frontend: /abandonados route registered');
}

// === 6. Add hamburger menu entry next to "In progress" ===
// Idempotency guard checks for the menu entry's specific shape (path + name),
// since the route registration above also contains `path:"/abandonados"` and
// would falsely trigger a generic includes check.
const menuAnchor = '{path:"/in-progress",name:xo._("In progress")}';
const menuPatched = menuAnchor + ',{path:"/abandonados",name:xo._("Dropped")}';
if (c.includes('path:"/abandonados",name:xo._("Dropped")')) {
  console.log('abandoned frontend: menu entry already added');
} else if (!c.includes(menuAnchor)) {
  console.error('abandoned frontend: menu anchor not found'); process.exit(1);
} else {
  c = c.replace(menuAnchor, menuPatched);
  console.log('abandoned frontend: added Abandonados menu entry');
}

c = marker + c;
fs.writeFileSync(bundlePath, c);
console.log('abandoned frontend: complete');
