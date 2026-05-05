// Auto-generated mega-patch: patch_06_navigation_dupes_security.js
// Bundles 27 original patch_*.js scripts in execution order.
// Each constituent is wrapped in an IIFE so its top-level vars (const fs = ...)
// don't collide; `process.exit(0)` is rewritten to `return` so an early-exit
// idempotency guard inside one constituent doesn't abort the whole mega-patch.

// ===== patch_menu_restructure.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Main menu (ty): remove Watchlist, Import, Backup
//    Watchlist still accessible via Lists page (it IS a list).
//    Import / Backup move to Settings menu.
const tyOld = '{path:"/watchlist",name:xo._("Watchlist")},{path:"/calendar",name:xo._("Calendar")},{path:"/import",name:xo._("Import")},{path:"/lists",name:xo._("Lists")},{path:"/backup",name:xo._("Backup")}';
const tyNew = '{path:"/calendar",name:xo._("Calendar")},{path:"/lists",name:xo._("Lists")}';
if (c.includes(tyNew) && !c.includes(tyOld)) {
  console.log('menu restructure: ty already patched');
} else if (!c.includes(tyOld)) {
  console.error('menu restructure: ty anchor not found');
  process.exit(1);
} else {
  c = c.replace(tyOld, tyNew);
  console.log('menu restructure: removed Watchlist/Import/Backup from main menu');
}

// 2. Settings menu (Dy): add Import and Backup at the end
const dyOld = 'oy(e.admin?[{path:"configuration",name:xo._("Configuration")},{path:"logs",name:xo._("Logs")}]:[])';
const dyNew = 'oy(e.admin?[{path:"configuration",name:xo._("Configuration")},{path:"logs",name:xo._("Logs")}]:[]),[{path:"/import",name:"Importar"},{path:"/backup",name:"Backup"}]';
if (c.includes(dyNew)) {
  console.log('menu restructure: Dy already patched');
} else if (!c.includes(dyOld)) {
  console.error('menu restructure: Dy anchor not found');
  process.exit(1);
} else {
  c = c.replace(dyOld, dyNew);
  console.log('menu restructure: added Importar/Backup to settings menu');
}

fs.writeFileSync(bundlePath, c);
console.log('menu restructure: complete');

})();

// ===== patch_menu_split.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// User-defined order for the dropdown (NOT the order from ty()). Items not in
// this list are not rendered in the dropdown. patch_downloaded_tab.js and
// patch_abandoned_frontend.js no longer need to extend this list — already here.
const SIDE_PATHS = '["/in-progress","/upcoming","/watchlist","/calendar","/lists","/abandonados","/downloaded"]';
const TOP_PATHS  = '["/","/tv","/movies","/games","/books"]';

// 1. Inject _DD dropdown component (hamburger icon → vertical menu of navigational items)
// /*menu-split-v2*/ marker forces re-injection when the body shape changes (the old
// guard `var _s=r.useState(false)` would match v1 indefinitely). Bump the marker
// when changing _DD's structure.
const compDef = `_DD=function(){/*menu-split-v2*/` +
  `var _s=r.useState(false),_open=_s[0],_setOpen=_s[1];` +
  // Build path→item map from ty(), then render in SIDE_PATHS order (preserves user-chosen ordering).
  `var _byPath={};ty().forEach(function(e){_byPath[e.path]=e});` +
  `var _items=` + SIDE_PATHS + `.map(function(p){return _byPath[p]}).filter(Boolean);` +
  // Per-path tooltip text; resolved through xo._() so patch_i18n_custom can translate.
  `var _tips={` +
    `"/in-progress":xo._("In progress menu desc"),` +
    `"/upcoming":xo._("Upcoming menu desc"),` +
    `"/watchlist":xo._("Watchlist menu desc"),` +
    `"/calendar":xo._("Calendar menu desc"),` +
    `"/lists":xo._("Lists menu desc"),` +
    `"/abandonados":xo._("Dropped menu desc"),` +
    `"/downloaded":xo._("Downloaded menu desc")` +
  `};` +
  `return r.createElement("div",{style:{position:"relative",display:"inline-block",marginRight:"0.5rem"}},` +
    `r.createElement("span",{className:"material-icons cursor-pointer text-2xl",onClick:function(){_setOpen(!_open)}},"menu"),` +
    `_open&&r.createElement("div",{style:{position:"absolute",top:"100%",left:0,zIndex:50,background:"#1e293b",border:"1px solid #475569",borderRadius:"0.25rem",padding:"0.5rem",minWidth:"10rem"},onMouseLeave:function(){_setOpen(false)}},` +
      `_items.map(function(e){` +
        `return r.createElement(oe,{key:e.path,to:e.path,title:_tips[e.path]||"",className:function(o){return Be("block py-1 px-2 text-base whitespace-nowrap text-white hover:bg-slate-700",o.isActive&&"underline font-bold")},onClick:function(){_setOpen(false)}},e.name)` +
      `})` +
    `)` +
  `)` +
`},`;
const cardAnchor = '_v=function(e){';
if (c.includes('/*menu-split-v2*/')) {
  console.log('menu split: _DD v2 already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('menu split: _v anchor for _DD not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('menu split: injected _DD dropdown');
}

// 2. Top nav (ny): render [_DD] + filtered items (Inicio, TV, Pelis, Juegos, Libros)
const oldMap = 'm.filter(function(e){return ["/tv","/movies","/games","/books"].indexOf(e.path)>=0}).map((function(e){return r.createElement("span",{key:e.path,className:"m-1 mr-2 text-xl whitespace-nowrap"},r.createElement(oe,{to:e.path,className:function(e){return Be(e.isActive&&"underline")}},e.name))}))';
const fallbackOldMap = 'm.map((function(e){return r.createElement("span",{key:e.path,className:"m-1 mr-2 text-xl whitespace-nowrap"},r.createElement(oe,{to:e.path,className:function(e){return Be(e.isActive&&"underline")}},e.name))}))';
const newMap = 'r.createElement(r.Fragment,null,r.createElement(_DD,null),m.filter(function(e){return ' + TOP_PATHS + '.indexOf(e.path)>=0}).map((function(e){return r.createElement("span",{key:e.path,className:"m-1 mr-2 text-xl whitespace-nowrap"},r.createElement(oe,{to:e.path,className:function(e){return Be(e.isActive&&"underline")}},e.name))})))';
if (c.includes(newMap)) {
  console.log('menu split: top nav already has _DD + filtered items');
} else if (c.includes(oldMap)) {
  c = c.replace(oldMap, newMap);
  console.log('menu split: top nav -> [_DD] + Inicio/TV/Pelis/Juegos/Libros');
} else if (c.includes(fallbackOldMap)) {
  c = c.replace(fallbackOldMap, newMap);
  console.log('menu split: top nav (from base) -> [_DD] + filtered items');
} else {
  console.error('menu split: top nav anchor not found'); process.exit(1);
}

// 3. Restore TS to original (no sidebar)
const oldTS_withSidebar = 'TS=function(){return r.createElement(r.Fragment,null,r.createElement(ny,null),r.createElement("div",{className:"flex flex-row max-w-7xl m-auto"},r.createElement(_SN,null),r.createElement("div",{className:"flex flex-col items-center flex-grow"},r.createElement("div",{className:"w-full p-2",key:location.pathname},r.createElement($,null)))))}';
const originalTS = 'TS=function(){return r.createElement(r.Fragment,null,r.createElement(ny,null),r.createElement("div",{className:"flex flex-col items-center max-w-5xl m-auto"},r.createElement("div",{className:"w-full p-2",key:location.pathname},r.createElement($,null))))}';
if (c.includes(originalTS)) {
  console.log('menu split: TS already in original layout');
} else if (c.includes(oldTS_withSidebar)) {
  c = c.replace(oldTS_withSidebar, originalTS);
  console.log('menu split: TS reverted to original (no sidebar)');
}

// 4. Rename "Books" menu entry → "Libros/Audiolibros" (literal, bypass i18n)
const oldBook = '{path:"/books",name:xo._("Books")}';
const newBook = '{path:"/books",name:"Libros/Audiolibros"}';
if (c.includes(newBook)) {
  console.log('menu split: books menu already renamed');
} else if (c.includes(oldBook)) {
  c = c.replace(oldBook, newBook);
  console.log('menu split: Books -> Libros/Audiolibros in menu');
}

fs.writeFileSync(bundlePath, c);
console.log('menu split: complete');

})();

// ===== patch_settings_appearance.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Inject _UD component (user dropdown):
//   Trigger: [⚙️ {user.name}] clickable block
//   Dropdown menu items: dark/light toggle, Settings, Logout
const compDef = `_UD=function(e){` +
  `var _t=e.user,_logout=e.logout;` +
  `var _x=Ne(),_dark=_x.darkMode,_setDark=_x.setDarkMode;` +
  `var _s=r.useState(false),_open=_s[0],_setOpen=_s[1];` +
  `return r.createElement("div",{style:{position:"relative",display:"inline-block"}},` +
    `r.createElement("div",{className:"flex items-center cursor-pointer select-none",onClick:function(){_setOpen(!_open)}},` +
      `r.createElement("span",{className:"material-icons text-2xl pr-1"},"settings"),` +
      `r.createElement("span",null,_t.name)` +
    `),` +
    `_open&&r.createElement("div",{style:{position:"absolute",top:"100%",right:0,zIndex:50,background:"#1e293b",border:"1px solid #475569",borderRadius:"0.25rem",padding:"0.5rem",minWidth:"12rem"},onMouseLeave:function(){_setOpen(false)}},` +
      // Dark/light toggle row
      `r.createElement("div",{className:"flex items-center justify-between py-1 px-2 cursor-pointer text-white hover:bg-slate-700",onClick:function(){_setDark(!_dark)}},` +
        `r.createElement("span",null,_dark?"Modo oscuro":"Modo claro"),` +
        `r.createElement("span",{className:"material-icons"},_dark?"light_mode":"mode_night")` +
      `),` +
      // Settings link
      `r.createElement(oe,{to:"/settings",className:function(o){return Be("block py-1 px-2 text-white hover:bg-slate-700",o.isActive&&"underline")},onClick:function(){_setOpen(false)}},"Configuración"),` +
      // Logout
      `r.createElement("a",{href:"/logout",onClick:function(e){e.preventDefault();_setOpen(false);_logout()},className:"block py-1 px-2 text-white hover:bg-slate-700"},r.createElement(Xe,{id:"Logout"}))` +
    `)` +
  `)` +
`},`;

const cardAnchor = '_v=function(e){';
if (c.includes('_UD=function(e){var _t=e.user')) {
  console.log('user dropdown: _UD already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('user dropdown: anchor not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('user dropdown: injected _UD component');
}

// Replace the top-nav user controls block with _UD
// Match either the original (with dark toggle) OR our previous gear-replacement variant
const original = 'r.createElement("span",{onClick:function(){return o(!i)},className:"pr-2 cursor-pointer select-none material-icons"},i?r.createElement(r.Fragment,null,"light_mode"):r.createElement(r.Fragment,null,"mode_night")),r.createElement("a",{href:"#/settings"},t.name),r.createElement("span",{className:"px-1"},"|"),r.createElement("a",{href:"/logout",onClick:function(e){e.preventDefault(),n()}},r.createElement(Xe,{id:"Logout"}))';
const previousGear = 'r.createElement("a",{href:"#/settings/appearance",className:"pr-2 cursor-pointer select-none material-icons text-2xl",title:"Configuración"},"settings"),r.createElement("a",{href:"#/settings"},t.name),r.createElement("span",{className:"px-1"},"|"),r.createElement("a",{href:"/logout",onClick:function(e){e.preventDefault(),n()}},r.createElement(Xe,{id:"Logout"}))';
const replacement = 'r.createElement(_UD,{user:t,logout:n})';

if (c.includes(replacement)) {
  console.log('user dropdown: top nav already replaced');
} else if (c.includes(original)) {
  c = c.replace(original, replacement);
  console.log('user dropdown: top nav replaced (from base)');
} else if (c.includes(previousGear)) {
  c = c.replace(previousGear, replacement);
  console.log('user dropdown: top nav replaced (from previous gear variant)');
} else {
  console.error('user dropdown: top nav anchor not found'); process.exit(1);
}

// Remove the standalone Apariencia tab from settings (we revert that part)
const oldAP = ',r.createElement(Q,{path:"appearance",element:r.createElement(_AP,null)})';
if (c.includes(oldAP)) {
  c = c.replace(oldAP, '');
  console.log('user dropdown: removed /settings/appearance route');
}
const oldAPMenu = ',{path:"appearance",name:"Apariencia"}';
if (c.includes(oldAPMenu)) {
  c = c.replace(oldAPMenu, '');
  console.log('user dropdown: removed Apariencia from settings menu');
}

fs.writeFileSync(bundlePath, c);
console.log('user dropdown: complete');

})();

// ===== patch_library_search.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Inject _GS (global library search) component
const compDef = `_GS=function(){` +
  `var _hash=window.location.hash.replace(/^#/,"");` +
  `var _m=_hash.match(/^\\/library-search\\/(.+)$/);` +
  `var _q=_m?decodeURIComponent(_m[1]):"";` +
  `if(!_q)return r.createElement("div",{className:"p-4 text-gray-500"},"Escribe algo para buscar.");` +
  `return r.createElement("div",{className:"p-2"},` +
    `r.createElement("h2",{className:"text-2xl mb-3"},"Resultados para \\"",_q,"\\""),` +
    `r.createElement(Zv,{args:{filter:_q,orderBy:"title",sortOrder:"asc"},showSortOrderControls:!1,showSearch:!1,gridItemAppearance:{showRating:!0,topBar:{showFirstUnwatchedEpisodeBadge:!0,showOnWatchlistIcon:!0,showUnwatchedEpisodesCount:!0}}})` +
  `)` +
`},`;
const cardAnchor = '_v=function(e){';
if (c.includes('_GS=function(){var _hash=window.location.hash')) {
  console.log('library search: _GS already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('library search: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('library search: injected _GS component');
}

// 2. Add /library-search/:q route to the authenticated route tree
const routeAnchor = 'r.createElement(Q,{path:"/lists",element:r.createElement(SS,{key:"/lists"})})';
const routePatched = 'r.createElement(Q,{path:"/library-search/:q",element:r.createElement(_GS,null)}),' + routeAnchor;
if (c.includes('path:"/library-search/:q"')) {
  console.log('library search: route already added');
} else if (!c.includes(routeAnchor)) {
  console.error('library search: route anchor not found'); process.exit(1);
} else {
  c = c.replace(routeAnchor, routePatched);
  console.log('library search: added /library-search/:q route');
}

// 3. Top nav search input — DISABLED (replaced by YouTube section per user request).
//    The /library-search/:q route still exists; you can navigate to it manually if needed.

fs.writeFileSync(bundlePath, c);
console.log('library search: complete');

})();

// ===== patch_lists_page.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// _LP: list preview component — block clickable, watchlist pinned with bookmark, item poster previews
const compDef = `_LP=function(e){` +
  `var _list=e.list;` +
  `var _u=r.useState([]),_items=_u[0],_setItems=_u[1];` +
  `r.useEffect(function(){` +
    `fetch("/api/list/items?listId="+_list.id,{credentials:"same-origin"})` +
      `.then(function(r){return r.json()})` +
      `.then(function(d){_setItems(Array.isArray(d)?d.slice(0,8):[])})` +
      `.catch(function(){_setItems([])});` +
  `},[_list.id]);` +
  `return r.createElement(ie,{to:"/list/"+_list.id,style:{textDecoration:"none",color:"inherit"}},` +
    `r.createElement("div",{style:{border:"1px solid rgba(148,163,184,0.4)",borderRadius:"0.5rem",padding:"0.75rem",marginBottom:"0.75rem",cursor:"pointer",transition:"background 0.15s"},onMouseEnter:function(e){e.currentTarget.style.background="rgba(148,163,184,0.08)"},onMouseLeave:function(e){e.currentTarget.style.background="transparent"}},` +
      // Title row: bookmark icon (if watchlist) + name + count
      `r.createElement("div",{className:"flex items-center my-1"},` +
        `_list.isWatchlist&&r.createElement("span",{className:"material-icons text-yellow-500 mr-2",title:"Lista de seguimiento"},"bookmark"),` +
        `r.createElement("div",{className:"text-xl font-semibold"},Fo(_list)),` +
        `r.createElement("div",{className:"ml-3 text-sm text-gray-400"},r.createElement(Xe,{id:"{0, plural, one {# item} other {# items}}",values:{0:_list.itemsCount}}))` +
      `),` +
      // Description (rendered at runtime; _o is the bundle-scope helper that returns the list description)
      `_o(_list)&&r.createElement("div",{className:"text-sm text-gray-500 mb-2 overflow-hidden whitespace-nowrap text-ellipsis"},_o(_list)),` +
      `_items.length>0?r.createElement("div",{style:{display:"flex",gap:"0.4rem",overflowX:"auto",marginTop:"0.5rem"}},` +
      `_items.map(function(it,i){` +
        `return r.createElement("div",{key:i,style:{flexShrink:0,width:"4.5rem"}},` +
          `r.createElement(Np,{src:it.posterSmall,itemMediaType:it.mediaType}),` +
          `r.createElement("div",{className:"text-xs mt-1 text-center text-gray-400 overflow-hidden whitespace-nowrap text-ellipsis"},it.title)` +
        `)` +
      `})` +
    `):r.createElement("div",{className:"text-sm text-gray-500 italic"},xo._("(empty)"))` +
    `)` +
  `)` +
`},`;

const cardAnchor = '_v=function(e){';
if (c.includes('_LP=function(e){var _list=e.list')) {
  console.log('lists page: _LP already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('lists page: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('lists page: injected _LP component');
}

// Replace SS body with one that sorts (watchlist first) and uses _LP
const oldSS = 'i.map((function(e){return r.createElement("div",{key:e.id,className:"mb-5"},r.createElement("div",{className:"flex items-center my-1"},r.createElement("div",{className:"text-xl"},r.createElement(ie,{to:"/list/".concat(e.id)},Fo(e))),a&&r.createElement("div",{className:"pl-2 text-xs"},r.createElement(Xp,{list:e}))),r.createElement("div",null,r.createElement(Xe,{id:"{0, plural, one {# item} other {# items}}",values:{0:e.itemsCount}})),r.createElement("div",{className:"overflow-hidden whitespace-nowrap text-ellipsis"},_o(e)))}))';
const newSS = 'i.slice().sort(function(x,y){return (y.isWatchlist?1:0)-(x.isWatchlist?1:0)}).map((function(e){return r.createElement("div",{key:e.id},r.createElement(_LP,{list:e}),a&&r.createElement("div",{className:"text-xs ml-2"},r.createElement(Xp,{list:e})))}))';
if (c.includes(newSS)) {
  console.log('lists page: SS already updated');
} else if (!c.includes(oldSS)) {
  console.error('lists page: SS anchor not found'); process.exit(1);
} else {
  c = c.replace(oldSS, newSS);
  console.log('lists page: SS now uses _LP and sorts watchlist first');
}

fs.writeFileSync(bundlePath, c);
console.log('lists page: complete');

})();

// ===== patch_watchlist_tab.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Add a separate "Watchlist" entry to ty() right after Lists (uses MT's built-in i18n key)
const oldTy = '{path:"/lists",name:xo._("Lists")}]';
const newTy = '{path:"/lists",name:xo._("Lists")},{path:"/watchlist",name:xo._("Watchlist")}]';
if (c.includes(newTy)) {
  console.log('watchlist tab: already in menu');
} else if (!c.includes(oldTy)) {
  console.error('watchlist tab: ty() anchor not found'); process.exit(1);
} else {
  c = c.replace(oldTy, newTy);
  console.log('watchlist tab: added /watchlist entry after Lists');
}

// 2. In the lists page (SS), filter OUT the watchlist (it has its own tab now)
const oldSlice = 'i.slice().sort(function(x,y){return (y.isWatchlist?1:0)-(x.isWatchlist?1:0)})';
const newSlice = 'i.filter(function(e){return !e.isWatchlist})';
if (c.includes(newSlice)) {
  console.log('watchlist tab: SS already filters watchlist');
} else if (!c.includes(oldSlice)) {
  console.log('watchlist tab: SS slice anchor not found (skipping)');
} else {
  c = c.replace(oldSlice, newSlice);
  console.log('watchlist tab: SS no longer shows watchlist (it has its own tab)');
}

fs.writeFileSync(bundlePath, c);
console.log('watchlist tab: complete');

})();

// ===== patch_downloaded_tab.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Define _DLP component (Downloaded Page) — renders one COLLAPSIBLE section per
//    mediaType, each with its own items grid filtered by onlyDownloaded=true + that type.
const compDef = '_DLP=function(){' +
  'var _Section=function(props){' +
    'var st=r.useState(false),open=st[0],setOpen=st[1];' +
    'return r.createElement("div",{className:"mb-3 border border-slate-300 dark:border-slate-700 rounded overflow-hidden"},' +
      'r.createElement("button",{' +
        'onClick:function(){setOpen(!open)},' +
        'className:"w-full text-left text-xl font-semibold px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"' +
      '},' +
        'r.createElement("i",{className:"material-icons"},open?"expand_more":"chevron_right"),' +
        'props.label' +
      '),' +
      'open&&r.createElement("div",{className:"p-2"},' +
        'r.createElement(Zv,{' +
          'args:{mediaType:props.mt,onlyDownloaded:!0,orderBy:"title",sortOrder:"asc"},' +
          'showSortOrderControls:!1,showSearch:!1,' +
          'gridItemAppearance:{showRating:!0,topBar:{showFirstUnwatchedEpisodeBadge:!0,showOnWatchlistIcon:!0,showUnwatchedEpisodesCount:!0}}' +
        '})' +
      ')' +
    ')' +
  '};' +
  'return r.createElement("div",{className:"p-2"},' +
    'r.createElement("h2",{className:"text-2xl mb-4 px-2"},xo._("Downloaded")),' +
    'r.createElement(_Section,{label:xo._("Movies"),mt:"movie"}),' +
    'r.createElement(_Section,{label:xo._("Tv"),mt:"tv"}),' +
    'r.createElement(_Section,{label:xo._("Games"),mt:"video_game"}),' +
    'r.createElement(_Section,{label:xo._("Books"),mt:"book"})' +
  ')' +
'},';

const cardAnchor = '_v=function(e){';
if (c.includes('_DLP=function(){var _Section=function(props)')) {
  console.log('downloaded tab: _DLP (collapsible) already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('downloaded tab: _v anchor not found'); process.exit(1);
} else {
  // Drop any earlier _DLP variant first (so we don't duplicate)
  c = c.replace(/_DLP=function\(\)\{return r\.createElement\("div"[\s\S]*?\}\)\)\)\},/, '');
  c = c.replace(/_DLP=function\(\)\{var _section=function[\s\S]*?_section\("Libros","book"\)\)\},/, '');
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('downloaded tab: injected _DLP component (sectioned per mediaType)');
}

// 2. Add /downloaded route
const routeAnchor = 'r.createElement(Q,{path:"/lists",element:r.createElement(SS,{key:"/lists"})})';
const routePatched = 'r.createElement(Q,{path:"/downloaded",element:r.createElement(_DLP,null)}),' + routeAnchor;
if (c.includes('path:"/downloaded"')) {
  console.log('downloaded tab: route already added');
} else if (!c.includes(routeAnchor)) {
  console.error('downloaded tab: route anchor not found'); process.exit(1);
} else {
  c = c.replace(routeAnchor, routePatched);
  console.log('downloaded tab: added /downloaded route');
}

// 3. Add "Downloaded" menu item next to /watchlist (uses MT's built-in xo._() for i18n)
const menuAnchor = '{path:"/lists",name:xo._("Lists")},{path:"/watchlist",name:xo._("Watchlist")}]';
const menuPatched = '{path:"/lists",name:xo._("Lists")},{path:"/watchlist",name:xo._("Watchlist")},{path:"/downloaded",name:xo._("Downloaded")}]';
if (c.includes('{path:"/downloaded",name:xo._("Downloaded")}')) {
  console.log('downloaded tab: menu item already added');
} else if (!c.includes(menuAnchor)) {
  console.error('downloaded tab: menu anchor not found (watchlist tab missing?)'); process.exit(1);
} else {
  c = c.replace(menuAnchor, menuPatched);
  console.log('downloaded tab: added Downloaded menu entry');
}

// 4. Add /downloaded to the SIDE_PATHS array used by the _DD hamburger dropdown,
//    otherwise the entry exists but the dropdown filters it out. patch_menu_split.js
//    may already include /downloaded in its initial list — in which case this is a no-op.
//    Tolerant regex (vs. exact string match) so the patch survives reordering or other
//    inserts upstream (patch_abandoned_frontend.js does the same for /abandonados).
const sideRe = /\["\/in-progress"[^\]]*"\/lists"[^\]]*\]|\["\/upcoming"[^\]]*"\/watchlist"[^\]]*\]/;
const sideMatch = c.match(sideRe);
if (!sideMatch) {
  console.error('downloaded tab: SIDE_PATHS anchor not found'); process.exit(1);
} else if (sideMatch[0].includes('"/downloaded"')) {
  console.log('downloaded tab: /downloaded already in SIDE_PATHS');
} else {
  const replaced = sideMatch[0].slice(0, -1) + ',"/downloaded"]';
  c = c.replace(sideMatch[0], replaced);
  console.log('downloaded tab: added /downloaded to _DD side dropdown filter');
}

fs.writeFileSync(bundlePath, c);
console.log('downloaded tab: complete');

})();

// ===== patch_sectioned_pages.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Build a sectioned page with COLLAPSIBLE dropdowns (default plegado).
// `gameSubSections`: when true, the "Juegos" section becomes nested with 5
// sub-collapsibles (Puntuado / Sin puntuar / En lista / Jugado / Visto).
function makeSectioned(name, title, filterKey, gameSubSections) {
  // _SubSection: nested collapsible inside a parent collapsible (for the Games drilldown)
  const subSection = 'function _SubSection(props){' +
    'var st=r.useState(false),open=st[0],setOpen=st[1];' +
    'return r.createElement("div",{className:"mb-2 ml-3 border-l-2 border-slate-300 dark:border-slate-700 pl-2"},' +
      'r.createElement("button",{onClick:function(){setOpen(!open)},className:"w-full text-left text-lg px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"},' +
        'r.createElement("i",{className:"material-icons text-base"},open?"expand_more":"chevron_right"),' +
        'props.label' +
      '),' +
      'open&&r.createElement("div",{className:"py-1"},' +
        'r.createElement(Zv,{' +
          'args:Object.assign({orderBy:"title",sortOrder:"asc"},props.args),' +
          'showSortOrderControls:!1,showSearch:!1,' +
          'gridItemAppearance:{showRating:!0,topBar:{showFirstUnwatchedEpisodeBadge:!0,showOnWatchlistIcon:!0,showUnwatchedEpisodesCount:!0}}' +
        '})' +
      ')' +
    ')' +
  '}';

  // Build the Games section: either single grid OR 5 sub-collapsibles
  const gamesNested = gameSubSections
    ? 'r.createElement("div",{className:"py-1"},' +
        'r.createElement(_SubSection,{label:xo._("Rated"),args:{mediaType:"video_game",onlyWithUserRating:!0}}),' +
        'r.createElement(_SubSection,{label:xo._("Unrated"),args:{mediaType:"video_game",onlyWithoutUserRating:!0}}),' +
        'r.createElement(_SubSection,{label:xo._("On list"),args:{mediaType:"video_game",onlyOnWatchlist:!0}}),' +
        'r.createElement(_SubSection,{label:xo._("Played"),args:{mediaType:"video_game",onlyWithProgress:!0}}),' +
        'r.createElement(_SubSection,{label:xo._("Seen"),args:{mediaType:"video_game",onlySeenItems:!0}})' +
      ')'
    : 'r.createElement(Zv,{args:Object.assign({orderBy:"title",sortOrder:"asc"},{mediaType:"video_game",' + filterKey + ':!0}),showSortOrderControls:!1,showSearch:!1,gridItemAppearance:{showRating:!0,topBar:{showFirstUnwatchedEpisodeBadge:!0,showOnWatchlistIcon:!0,showUnwatchedEpisodesCount:!0}}})';

  const sectionsBody = [
    'r.createElement(_Section,{label:xo._("Movies"),args:{mediaType:"movie",' + filterKey + ':!0}})',
    'r.createElement(_Section,{label:xo._("Tv"),args:{mediaType:"tv",' + filterKey + ':!0}})',
    'r.createElement(_GamesSection,null)',
    'r.createElement(_Section,{label:xo._("Books"),args:{mediaType:"book",' + filterKey + ':!0}})',
    'r.createElement(_Section,{label:xo._("Theater"),args:{mediaType:"theater",' + filterKey + ':!0}})'
  ];

  return name + '=function(){' +
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
    subSection + ';' +
    'var _GamesSection=function(){' +
      'var st=r.useState(false),open=st[0],setOpen=st[1];' +
      'return r.createElement("div",{className:"mb-3 border border-slate-300 dark:border-slate-700 rounded overflow-hidden"},' +
        'r.createElement("button",{onClick:function(){setOpen(!open)},className:"w-full text-left text-xl font-semibold px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"},' +
          'r.createElement("i",{className:"material-icons"},open?"expand_more":"chevron_right"),' +
          'xo._("Games")' +
        '),' +
        'open&&' + gamesNested +
      ')' +
    '};' +
    'return r.createElement("div",{className:"p-2"},' +
      'r.createElement("h2",{className:"text-2xl mb-4 px-2"},' + JSON.stringify(title) + '),' +
      sectionsBody.join(',') +
    ')' +
  '},';
}

const cardAnchor = '_v=function(e){';
if (!c.includes(cardAnchor)) { console.error('sectioned pages: _v anchor not found'); process.exit(1); }

// Inject _IPS and _WLS as comma-separated declarators before _v.
// Only /in-progress gets the games sub-sections drilldown (Rated/Unrated/On list/Played/Seen).
const ipsDef = makeSectioned('_IPS', 'En progreso', 'onlyWithProgress', true /* gameSubSections */);
const wlsDef = makeSectioned('_WLS', 'Lista de seguimiento', 'onlyOnWatchlist');

// Strip any prior version of these components (idempotent)
c = c.replace(/_IPS=function\(\)\{[\s\S]*?_Section,\{label:"Libros"[\s\S]*?\}\)\)\)\},/, '');
c = c.replace(/_WLS=function\(\)\{[\s\S]*?_Section,\{label:"Libros"[\s\S]*?\}\)\)\)\},/, '');
c = c.replace(/_IPS=function\(\)\{var _section[\s\S]*?_section\("Libros"[^}]*?\}\)\)\),/, '');
c = c.replace(/_WLS=function\(\)\{var _section[\s\S]*?_section\("Libros"[^}]*?\}\)\)\),/, '');

if (c.includes('_IPS=function(){var _Section=function(props)')) {
  console.log('sectioned pages: _IPS already injected (collapsible)');
} else {
  c = c.replace(cardAnchor, ipsDef + cardAnchor);
  console.log('sectioned pages: injected _IPS (in-progress collapsible)');
}
if (c.includes('_WLS=function(){var _Section=function(props)')) {
  console.log('sectioned pages: _WLS already injected (collapsible)');
} else {
  c = c.replace(cardAnchor, wlsDef + cardAnchor);
  console.log('sectioned pages: injected _WLS (watchlist collapsible)');
}

// Re-route /in-progress to _IPS
const ipOld = 'r.createElement(Q,{path:"/in-progress",element:r.createElement(iy,{key:"/in-progress"})})';
const ipNew = 'r.createElement(Q,{path:"/in-progress",element:r.createElement(_IPS,null)})';
if (c.includes(ipNew)) { console.log('sectioned pages: /in-progress already rerouted'); }
else if (!c.includes(ipOld)) { console.error('sectioned pages: /in-progress route anchor not found'); process.exit(1); }
else { c = c.replace(ipOld, ipNew); console.log('sectioned pages: /in-progress → _IPS'); }

// Re-route /watchlist to _WLS
const wlOld = 'r.createElement(Q,{path:"/watchlist",element:r.createElement(gS,{key:"/watchlist"})})';
const wlNew = 'r.createElement(Q,{path:"/watchlist",element:r.createElement(_WLS,null)})';
if (c.includes(wlNew)) { console.log('sectioned pages: /watchlist already rerouted'); }
else if (!c.includes(wlOld)) { console.error('sectioned pages: /watchlist route anchor not found'); process.exit(1); }
else { c = c.replace(wlOld, wlNew); console.log('sectioned pages: /watchlist → _WLS'); }

fs.writeFileSync(bundlePath, c);
console.log('sectioned pages: complete');

})();

// ===== patch_dupes_controller.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

// Strip prior version (idempotent)
c = c.replace(/  findDupes = \(0, _typescriptRoutesToOpenapiServer\.createExpressRoute\)[\s\S]*?\}\);\n/, '');
c = c.replace(/  mergeDupes = \(0, _typescriptRoutesToOpenapiServer\.createExpressRoute\)[\s\S]*?\}\);\n/, '');

const method = `  findDupes = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const knex = _dbconfig.Database.knex;
    // Group items by (lowercased title, releaseYear, mediaType). Pairs with >1 row are candidates.
    const rows = await knex('mediaItem')
      .select('id','title','mediaType','releaseDate','tmdbId','imdbId','tvdbId','igdbId','goodreadsId','openlibraryId','audibleId')
      .whereNotNull('title');
    const groups = new Map();
    for (const r of rows) {
      const key = (r.title || '').toLowerCase().trim() + '|' + (r.releaseDate ? String(r.releaseDate).slice(0,4) : '') + '|' + r.mediaType;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    const dupes = [];
    for (const [key, items] of groups.entries()) {
      if (items.length < 2) continue;
      // Skip if all items share the same tmdbId (just a query oddity)
      const distinctTmdb = new Set(items.map(i => i.tmdbId).filter(Boolean));
      const distinctImdb = new Set(items.map(i => i.imdbId).filter(Boolean));
      // True dupes have at least one distinct external ID
      if (distinctTmdb.size <= 1 && distinctImdb.size <= 1 && items.every(i => !i.tmdbId && !i.imdbId)) continue;
      dupes.push({ key, items });
    }
    // Bulk-load usage counts for ALL dupe items in 4 grouped queries (was 4×N).
    const allIds = dupes.flatMap(d => d.items.map(i => i.id));
    const usage = new Map();
    if (allIds.length > 0) {
      const fetchCounts = async (table) => knex(table).whereIn('mediaItemId', allIds).groupBy('mediaItemId').select('mediaItemId').count('* as c');
      const [s, r, p, l] = await Promise.all([fetchCounts('seen'), fetchCounts('userRating'), fetchCounts('progress'), fetchCounts('listItem')]);
      const add = (rows) => { for (const r of rows) usage.set(r.mediaItemId, (usage.get(r.mediaItemId) || 0) + Number(r.c || 0)); };
      add(s); add(r); add(p); add(l);
    }
    for (const d of dupes) {
      for (const it of d.items) it.usage = usage.get(it.id) || 0;
      d.items.sort((a, b) => b.usage - a.usage);
    }
    res.json({ count: dupes.length, dupes });
  });
  mergeDupes = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const knex = _dbconfig.Database.knex;
    const { winnerId, loserId } = req.body || {};
    if (!winnerId || !loserId || winnerId === loserId) { res.status(400).json({ error: 'winnerId y loserId requeridos y distintos' }); return; }
    const w = await knex('mediaItem').where('id', winnerId).first();
    const l = await knex('mediaItem').where('id', loserId).first();
    if (!w || !l) { res.status(404).json({ error: 'mediaItem no encontrado' }); return; }
    if (w.mediaType !== l.mediaType) { res.status(400).json({ error: 'mediaTypes distintos — no se puede fusionar' }); return; }
    const stats = { seen: 0, ratings: 0, progress: 0, listItems: 0 };
    // Helper: bulk-merge a child table — load loser/winner rows once, classify
    // each loser row as conflict (delete) or unique (re-assign), then batch
    // delete + batch update. 2 reads + 2 writes per table instead of N reads + N writes.
    const _bulkMerge = async (trx, table, keyFn) => {
      const loserRows = await trx(table).where('mediaItemId', loserId);
      if (loserRows.length === 0) return 0;
      const winnerRows = await trx(table).where('mediaItemId', winnerId);
      const winnerKeys = new Set(winnerRows.map(keyFn));
      const toDelete = [], toReassign = [];
      for (const r of loserRows) {
        if (winnerKeys.has(keyFn(r))) toDelete.push(r.id);
        else toReassign.push(r.id);
      }
      if (toDelete.length) await trx(table).whereIn('id', toDelete).delete();
      if (toReassign.length) await trx(table).whereIn('id', toReassign).update({ mediaItemId: winnerId });
      return toReassign.length;
    };
    await knex.transaction(async trx => {
      stats.seen      = await _bulkMerge(trx, 'seen',       r => r.userId + '|' + (r.episodeId || '') + '|' + r.date);
      stats.ratings   = await _bulkMerge(trx, 'userRating', r => r.userId + '|' + (r.seasonId || '') + '|' + (r.episodeId || ''));
      stats.progress  = await _bulkMerge(trx, 'progress',   r => r.userId + '|' + (r.episodeId || ''));
      stats.listItems = await _bulkMerge(trx, 'listItem',   r => r.listId + '|' + (r.seasonId || '') + '|' + (r.episodeId || ''));
      // Drop loser's children (episodes/seasons) and the loser itself
      await trx('episode').where('tvShowId', loserId).delete();
      await trx('season').where('tvShowId', loserId).delete();
      await trx('mediaItem').where('id', loserId).delete();
    });
    res.json({ ok: true, winnerId, loserId, ...stats });
  });
`;

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('dupes controller: anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('dupes controller: findDupes + mergeDupes installed');

})();

// ===== patch_dupes_routes.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/generated/routes/routes.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes("/api/dupes'") && c.includes("/api/dupes/merge'")) { console.log('dupes routes: already patched'); return /* was process.exit(0) */; }

const anchor = "router.get('/api/import-trakttv/state'";
if (!c.includes(anchor)) { console.error('dupes routes: anchor not found'); process.exit(1); }

const route =
"router.get('/api/dupes', validatorHandler({}), _MediaItemController.findDupes);\n" +
"router.post('/api/dupes/merge', validatorHandler({}), _MediaItemController.mergeDupes);\n";

c = c.replace(anchor, route + anchor);
fs.writeFileSync(path, c);
console.log('dupes routes: GET /api/dupes + POST /api/dupes/merge added');

})();

// ===== patch_dupes_frontend.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// _DUP page: list duplicate groups with merge buttons
const compDef = '_DUP=function(){' +
  'var _q=r.useState(null),_data=_q[0],_set=_q[1];' +
  'var _b=r.useState(false),_busy=_b[0],_setBusy=_b[1];' +
  'var _load=function(){_set(null);fetch("/api/dupes",{credentials:"same-origin"}).then(function(r){return r.json()}).then(_set).catch(function(e){_set({error:String(e)})})};' +
  'r.useEffect(_load,[]);' +
  'var _merge=function(winnerId,loserId){' +
    'if(!confirm("¿Fusionar item "+loserId+" → "+winnerId+"? Se mueven seen/ratings/progress/listas y se borra el item perdedor."))return;' +
    '_setBusy(true);' +
    'fetch("/api/dupes/merge",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({winnerId:winnerId,loserId:loserId})})' +
      '.then(function(r){return r.json()})' +
      '.then(function(d){_setBusy(false);if(d.error){alert("Error: "+d.error)}else{_load()}})' +
      '.catch(function(e){_setBusy(false);alert(String(e.message||e))})' +
  '};' +
  'if(!_data)return r.createElement("p",{className:"p-4 text-gray-500"},"Buscando duplicados...");' +
  'if(_data.error)return r.createElement("p",{className:"p-4 text-red-500"},"Error: "+_data.error);' +
  'if(!_data.dupes||_data.dupes.length===0)return r.createElement("div",{className:"p-4"},r.createElement("h2",{className:"text-2xl font-bold mb-3"},"Duplicados"),r.createElement("p",{className:"text-green-600"},"No hay duplicados detectados ✓"));' +
  'return r.createElement("div",{className:"p-2"},' +
    'r.createElement("h2",{className:"text-2xl font-bold mb-2 px-2"},"Duplicados ("+_data.count+" grupos)"),' +
    'r.createElement("p",{className:"text-sm text-gray-500 mb-4 px-2"},"Items con mismo título+año+tipo pero IDs externos distintos. Pulsa el ítem que quieras conservar; los demás se fusionan en él."),' +
    '_data.dupes.map(function(g,gi){' +
      'return r.createElement("div",{key:gi,className:"mb-6 p-3 bg-slate-100 dark:bg-slate-800 rounded"},' +
        'r.createElement("div",{className:"font-bold mb-2"},g.items[0].title+" ("+(g.items[0].releaseDate?String(g.items[0].releaseDate).slice(0,4):"?")+", "+g.items[0].mediaType+")"),' +
        'r.createElement("div",{className:"flex flex-col gap-2"},' +
          'g.items.map(function(it,i){' +
            'var ids=[];if(it.tmdbId)ids.push("tmdb:"+it.tmdbId);if(it.imdbId)ids.push("imdb:"+it.imdbId);if(it.tvdbId)ids.push("tvdb:"+it.tvdbId);if(it.igdbId)ids.push("igdb:"+it.igdbId);' +
            'var isWinner=i===0;' +
            'return r.createElement("div",{key:it.id,className:"flex items-center gap-3 p-2 rounded "+(isWinner?"bg-green-100 dark:bg-green-900":"bg-white dark:bg-slate-700")},' +
              'r.createElement("div",{className:"flex-1"},' +
                'r.createElement("a",{href:"#/details/"+it.id,className:"underline text-blue-600 dark:text-blue-400"},"#"+it.id),' +
                'r.createElement("span",{className:"ml-2 text-xs text-gray-500"},ids.join(" · ")||"sin IDs externos"),' +
                'r.createElement("span",{className:"ml-2 text-xs"},"uso: "+it.usage)' +
              '),' +
              '!isWinner?r.createElement("button",{disabled:_busy,onClick:function(){_merge(g.items[0].id,it.id)},className:"px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-500 text-white rounded text-sm"},"Fusionar → #"+g.items[0].id):r.createElement("span",{className:"text-xs px-2 py-1 bg-green-700 text-white rounded"},xo._("WINNER (most use)"))' +
            ')' +
          '})' +
        ')' +
      ')' +
    '})' +
  ')' +
'},';

const cardAnchor = '_v=function(e){';
if (!c.includes(cardAnchor)) { console.error('dupes frontend: _v anchor not found'); process.exit(1); }
if (c.includes('_DUP=function(){var _q=r.useState')) {
  console.log('dupes frontend: _DUP already injected');
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('dupes frontend: injected _DUP component');
}

// Add /dupes route
const routeAnchor = 'r.createElement(Q,{path:"/lists",element:r.createElement(SS,{key:"/lists"})})';
const routePatched = 'r.createElement(Q,{path:"/dupes",element:r.createElement(_DUP,null)}),' + routeAnchor;
if (c.includes('path:"/dupes"')) {
  console.log('dupes frontend: /dupes route already added');
} else if (!c.includes(routeAnchor)) {
  console.error('dupes frontend: route anchor not found'); process.exit(1);
} else {
  c = c.replace(routeAnchor, routePatched);
  console.log('dupes frontend: added /dupes route');
}

// Add link in /backup page (next to catalog cleanup) — keep menu clean, this is rare maintenance.
// backup_frontend uses xo._("Catalog cleanup") (post-i18n), so we anchor on that call.
const bkAnchor = 'r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},xo._("Catalog cleanup")),';
const bkPatched = 'r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},xo._("Detect duplicates")),' +
  'r.createElement("p",{className:"mb-2 text-gray-600 dark:text-gray-300"},xo._("Dupes desc backup")),' +
  'r.createElement("a",{href:"#/dupes",className:"px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded shadow inline-flex items-center gap-2 self-start mb-4"},' +
    'r.createElement("i",{className:"material-icons"},"merge_type"),' +
    'xo._("Find and merge")' +
  '),' + bkAnchor;
if (c.includes('xo._("Detect duplicates"))')) {
  console.log('dupes frontend: backup link already added');
} else if (!c.includes(bkAnchor)) {
  console.log('dupes frontend: backup anchor not found (skipping link)');
} else {
  c = c.replace(bkAnchor, bkPatched);
  console.log('dupes frontend: added "Detect duplicates" link to /backup');
}

fs.writeFileSync(bundlePath, c);
console.log('dupes frontend: complete');

})();

// ===== patch_games_total_time.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Always show "X playing" line under "Juegos" stats, even when duration is 0
const old = 'o.video_game.duration>0&&r.createElement("div",{className:"whitespace-nowrap"},r.createElement(Xe,{id:"<0><1/> </0>playing"';
const fresh = 'r.createElement("div",{className:"whitespace-nowrap"},r.createElement(Xe,{id:"<0><1/> </0>playing"';

if (c.includes('jugando":"')) {
  // Verify duration line exists then remove the >0 gate
}

if (c.includes(fresh) && !c.includes(old)) {
  console.log('games total time: already always shown');
} else if (!c.includes(old)) {
  console.error('games total time: anchor not found'); process.exit(1);
} else {
  c = c.replace(old, fresh);
  console.log('games total time: duration line now always visible (even when 0)');
}

// Also do the same for video_game data check guarding the whole block — if user has 0 plays but we still want to show,
// the outer block uses (o.video_game.plays)>0. Leave that gating alone (no plays = no card section) unless user wants otherwise.

fs.writeFileSync(bundlePath, c);

})();

// ===== patch_upcoming_filter.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Upcoming page (ay):
//  - drop the upstream onlyOnWatchlist filter so it shows ALL future items
//  - add an h2 title "Próximamente" (xo._("Upcoming")) matching the style of
//    the Pendientes / En progreso pages (which were given titles by
//    patch_sectioned_pages). Without the title, the page had no header.

const old =
  'ay=function(){return r.createElement(Zv,{args:{orderBy:"nextAiring",sortOrder:"asc",onlyOnWatchlist:!0,onlyWithNextAiring:!0},showSortOrderControls:!1,showSearch:!1,gridItemAppearance:{showNextAiring:!0,showRating:!0,topBar:{showFirstUnwatchedEpisodeBadge:!0,showOnWatchlistIcon:!0,showUnwatchedEpisodesCount:!0}}})}';
const fresh =
  'ay=function(){return r.createElement("div",{className:"p-2"},r.createElement("h2",{className:"text-2xl mb-4 px-2"},xo._("Upcoming")),r.createElement(Zv,{args:{orderBy:"nextAiring",sortOrder:"asc",onlyWithNextAiring:!0},showSortOrderControls:!1,showSearch:!1,gridItemAppearance:{showNextAiring:!0,showRating:!0,topBar:{showFirstUnwatchedEpisodeBadge:!0,showOnWatchlistIcon:!0,showUnwatchedEpisodesCount:!0}}}))}';

if (c.includes(fresh)) {
  console.log('upcoming filter: already titled + relaxed');
} else if (!c.includes(old)) {
  console.error('upcoming filter: anchor not found'); process.exit(1);
} else {
  c = c.replace(old, fresh);
  console.log('upcoming filter: added h2 title and removed onlyOnWatchlist');
}

fs.writeFileSync(bundlePath, c);

})();

// ===== patch_calendar_all.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/controllers/calendar.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('/* CALENDAR_ALL_V2_APPLIED */')) { console.log('calendar all v2: already patched'); return /* was process.exit(0) */; }

// Replace getCalendarItems with a simpler query that returns episodes and non-tv items
// in the date range, without requiring the item to be in a list (watchlist or custom).
// Operates over the entire mediaItem/episode tables (which already represent the user's library).

const newImpl = `
const getCalendarItems = async args => {
  const { userId, start, end } = args;
  // Items in the user's library: any item with listItem entry, seen, rating, or progress
  const uid = Number(userId);
  // "Actively tracked" = in some list (watchlist/custom) or currently in progress.
  // Excludes items only present in 'seen' (already-watched, possibly abandoned) or
  // 'userRating' (rated then forgotten).
  const libSubquery = \`SELECT mediaItemId FROM listItem li JOIN list l ON l.id = li.listId WHERE l.userId = \${uid}
                       UNION SELECT mediaItemId FROM progress WHERE userId = \${uid} AND progress < 1\`;

  // Episodes (regular, not specials) with release date in range, only for shows in user's library
  const episodes = await _dbconfig.Database.knex('episode')
    .select({
      'episode.id': 'episode.id',
      'episode.title': 'episode.title',
      'episode.episodeNumber': 'episode.episodeNumber',
      'episode.seasonNumber': 'episode.seasonNumber',
      'episode.releaseDate': 'episode.releaseDate',
      'episode.isSpecialEpisode': 'episode.isSpecialEpisode',
      'mediaItem.id': 'mediaItem.id',
      'mediaItem.title': 'mediaItem.title',
      'mediaItem.mediaType': 'mediaItem.mediaType',
      'mediaItem.releaseDate': 'mediaItem.releaseDate',
      'episodeSeen.episodeId': 'episodeSeen.episodeId',
      'mediaItemSeen.mediaItemId': 'mediaItemSeen.mediaItemId'
    })
    .leftJoin('mediaItem', 'mediaItem.id', 'episode.tvShowId')
    .leftJoin(qb => qb.select('episodeId').from('seen').where('userId', userId).groupBy('episodeId').as('episodeSeen'), 'episodeSeen.episodeId', 'episode.id')
    .leftJoin(qb => qb.select('mediaItemId').from('seen').where('userId', userId).whereNull('episodeId').groupBy('mediaItemId').as('mediaItemSeen'), 'mediaItemSeen.mediaItemId', 'mediaItem.id')
    .where('episode.isSpecialEpisode', false)
    .whereBetween('episode.releaseDate', [start, end])
    .whereRaw(\`episode.tvShowId IN (\${libSubquery})\`);

  // Non-TV mediaItems with release date in range, only items in user's library
  const items = await _dbconfig.Database.knex('mediaItem')
    .select({
      'mediaItem.id': 'mediaItem.id',
      'mediaItem.title': 'mediaItem.title',
      'mediaItem.mediaType': 'mediaItem.mediaType',
      'mediaItem.releaseDate': 'mediaItem.releaseDate',
      'mediaItemSeen.mediaItemId': 'mediaItemSeen.mediaItemId'
    })
    .leftJoin(qb => qb.select('mediaItemId').from('seen').where('userId', userId).whereNull('episodeId').groupBy('mediaItemId').as('mediaItemSeen'), 'mediaItemSeen.mediaItemId', 'mediaItem.id')
    .whereNot('mediaItem.mediaType', 'tv')
    .whereBetween('mediaItem.releaseDate', [start, end])
    .whereRaw(\`mediaItem.id IN (\${libSubquery})\`);

  const result = [];
  for (const row of episodes) {
    if (!row['mediaItem.id']) continue;
    result.push({
      mediaItem: {
        id: row['mediaItem.id'],
        title: row['mediaItem.title'],
        releaseDate: row['mediaItem.releaseDate'],
        mediaType: row['mediaItem.mediaType'],
        seen: row['mediaItemSeen.mediaItemId'] != undefined
      },
      episode: {
        id: row['episode.id'],
        title: row['episode.title'],
        episodeNumber: row['episode.episodeNumber'],
        seasonNumber: row['episode.seasonNumber'],
        releaseDate: row['episode.releaseDate'],
        seen: row['episodeSeen.episodeId'] != undefined,
        isSpecialEpisode: Boolean(row['episode.isSpecialEpisode'])
      },
      releaseDate: row['episode.releaseDate']
    });
  }
  for (const row of items) {
    result.push({
      mediaItem: {
        id: row['mediaItem.id'],
        title: row['mediaItem.title'],
        releaseDate: row['mediaItem.releaseDate'],
        mediaType: row['mediaItem.mediaType'],
        seen: row['mediaItemSeen.mediaItemId'] != undefined
      },
      releaseDate: row['mediaItem.releaseDate']
    });
  }
  return _lodash.default.uniqBy(result, e => e.episode ? 'e' + e.episode.id : 'm' + e.mediaItem.id);
};
`;

// Find the existing function and replace
const startMarker = 'const getCalendarItems = async args => {';
const endMarker = 'exports.getCalendarItems = getCalendarItems;';
const startIdx = c.indexOf(startMarker);
const endIdx = c.indexOf(endMarker);
if (startIdx < 0 || endIdx < 0) { console.error('calendar all: anchors not found'); process.exit(1); }

c = c.slice(0, startIdx) + newImpl.trimStart() + '\n' + c.slice(endIdx) + '\n/* CALENDAR_ALL_V2_APPLIED */\n';
fs.writeFileSync(path, c);
console.log('calendar all: rewrote getCalendarItems to include all library items, not just watchlist');

// Sanity check
try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('calendar all: syntax OK');
} catch (e) {
  console.error('calendar all: SYNTAX ERROR ->', e.message.slice(0, 300));
  process.exit(1);
}

})();

// ===== patch_recently_released.js =====
;(() => {
const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Recently released home slider:
//   - Remove onlyOnWatchlist filter (show all library)
//   - Extend the recency window from 30 → 90 days
const oldQuery = 'n=dg({orderBy:"lastAiring",sortOrder:"desc",page:1,onlyOnWatchlist:!0,onlySeenItems:!1}).items';
const newQuery = 'n=dg({orderBy:"lastAiring",sortOrder:"desc",page:1,onlySeenItems:!1}).items';

const oldFilter = 'return new Date(e.lastAiring)>ss(new Date,30)';
const newFilter = 'return new Date(e.lastAiring)>ss(new Date,90)';

if (c.includes(newQuery) && c.includes(newFilter)) {
  console.log('recently released: already patched');
  return /* was process.exit(0) */;
}

if (c.includes(oldQuery)) {
  c = c.replace(oldQuery, newQuery);
  console.log('recently released: removed onlyOnWatchlist filter');
}
if (c.includes(oldFilter)) {
  c = c.replace(oldFilter, newFilter);
  console.log('recently released: extended window 30→90 days');
}

fs.writeFileSync(bundlePath, c);

})();

// ===== patch_metadata_throttle.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/updateMetadata.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('// throttled-batch')) { console.log('metadata throttle: already patched'); return /* was process.exit(0) */; }

// Cap the number of items processed per scheduled cycle so the metadata refresh
// can't monopolize CPU/DB on large libraries. With 38k items, a single cycle
// returning all 3,156 stale items pegs CPU at 100% for hours.
const old = "const mediaItems = await _mediaItem.mediaItemRepository.itemsToPossiblyUpdate();\n  await updateMediaItems({\n    mediaItems: mediaItems\n  });";
const fresh = "const allItems = await _mediaItem.mediaItemRepository.itemsToPossiblyUpdate(); // throttled-batch\n  const mediaItems = allItems.slice(0, 10);\n  await updateMediaItems({\n    mediaItems: mediaItems\n  });";

if (!c.includes(old)) { console.error('metadata throttle: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('metadata throttle: capped per-cycle to 100 items');

})();

// ===== patch_silence_episode_dupes.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/updateMetadata.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('// silence-episode-dupes')) { console.log('silence episode dupes: already patched'); return /* was process.exit(0) */; }

// The UNIQUE constraint failures on episode.tmdbId aren't bugs — they're TMDB returning
// new episode IDs that collide with existing rows. The metadata update skips them
// silently anyway. Just stop spamming the error log with their stack traces.
const skipMsg = 'UNIQUE constraint failed: episode.tmdbId';

// 1. Inner catch (delete-local-episodes failure)
c = c.replace(
  "      } catch (error) {\n        _logger.logger.error(error);\n        return {",
  "      } catch (error) { // silence-episode-dupes\n        if (!String(error.message || '').includes('" + skipMsg + "')) _logger.logger.error(error);\n        return {"
);

// 2. Outer catch in updateMediaItems loop
c = c.replace(
  "    } catch (error) {\n      _logger.logger.error(_chalk.default.red(error.toString()));\n      numberOfFailures++;\n    }",
  "    } catch (error) {\n      if (!String(error.message || '').includes('" + skipMsg + "')) _logger.logger.error(_chalk.default.red(error.toString()));\n      numberOfFailures++;\n    }"
);

fs.writeFileSync(path, c);
console.log('silence episode dupes: filtered noisy UNIQUE constraint logs');

})();

// ===== patch_skip_startup_metadata.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/server.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('// startup-metadata-deferred')) { console.log('skip startup metadata: already patched'); return /* was process.exit(0) */; }

// Defer the initial metadata refresh by 5 minutes after boot so the server is
// responsive immediately. The setInterval continues to fire hourly as before.
// Without this, on a 38k-item DB with the 100-item throttle, startup is
// unresponsive for ~5-10 minutes while TMDB calls + SQLite writes serialize.
const old = "if (this.#config.production) {\n            await (0, _utils.catchAndLogError)(_updateMetadata.updateMetadata);\n            setInterval(async () => {";
const fresh = "if (this.#config.production) {\n            // startup-metadata-deferred: don't block startup, run first refresh in 5 min\n            setTimeout(() => (0, _utils.catchAndLogError)(_updateMetadata.updateMetadata), 5 * 60 * 1000);\n            setInterval(async () => {";

if (!c.includes(old)) { console.error('skip startup metadata: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('skip startup metadata: deferred initial refresh by 5 min');

})();

// ===== patch_igdb_time_to_beat.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/metadata/provider/igdb.js';
let c = fs.readFileSync(path, 'utf8');

// IGDB exposes a separate `game_time_to_beats` endpoint with three fields (all in seconds):
//   hastily   = main story
//   normally  = main + extras
//   completely = 100% completion
// We use `completely` (max — what the user asked for), falling back to normally/hastily
// for games without 100% data. Stored in mediaItem.runtime as MINUTES (the column type
// is integer and other media types use minutes here too).
//
// Side effects: every metadata refresh for a game will now make an extra IGDB API call
// (~250ms throttled). Fine — refreshes are 1×/24h per game.

if (c.includes('// mt-fork: time_to_beat')) {
  console.log('igdb time-to-beat: already patched');
  return /* was process.exit(0) */;
}

// Add the helper method right before `async game(gameId)`. Class field syntax is fine.
const helperMethod =
  "  async gameTimeToBeat(gameId) { // mt-fork: time_to_beat\n" +
  "    try {\n" +
  "      const res = await this.get('game_time_to_beats', `fields hastily,normally,completely; where game_id = ${gameId};`);\n" +
  "      if (!res || !res.length) return null;\n" +
  "      const t = res[0];\n" +
  "      // 500h cap: IGDB stores absurd 'completely' values for endless games\n" +
  "      // (Star Citizen → 100,000h, MMOs → years). Anything > 500h is treated\n" +
  "      // as no meaningful time-to-beat data, so the homepage total stays sane.\n" +
  "      const CAP_SECONDS = 500 * 3600;\n" +
  "      const candidates = [t.completely, t.normally, t.hastily].filter(s => s && s > 0 && s <= CAP_SECONDS);\n" +
  "      if (!candidates.length) return null;\n" +
  "      const seconds = Math.max.apply(null, candidates);\n" +
  "      return Math.round(seconds / 60);\n" +
  "    } catch (e) {\n" +
  "      return null;\n" +
  "    }\n" +
  "  }\n";

const helperAnchor = '  async game(gameId) {';
if (!c.includes(helperAnchor)) { console.error('igdb time-to-beat: helper anchor not found'); process.exit(1); }
c = c.replace(helperAnchor, helperMethod + helperAnchor);

// Patch details() to fetch time_to_beat and attach it as `runtime` on the mapped result.
// We do it in details() (not mapGame) so search results don't trigger an extra API call
// per row — that's wasteful and would blow up the rate limit on a search for "mario".
const oldDetails =
  "  async details(mediaItem) {\n" +
  "    const result = await this.game(mediaItem.igdbId);\n" +
  "    return result ? this.mapGame(result) : null;\n" +
  "  }";
const newDetails =
  "  async details(mediaItem) {\n" +
  "    const result = await this.game(mediaItem.igdbId);\n" +
  "    if (!result) return null;\n" +
  "    const mapped = this.mapGame(result);\n" +
  "    const ttb = await this.gameTimeToBeat(mediaItem.igdbId); // mt-fork: time_to_beat\n" +
  "    if (ttb) mapped.runtime = ttb;\n" +
  "    return mapped;\n" +
  "  }";

if (!c.includes(oldDetails)) { console.error('igdb time-to-beat: details anchor not found'); process.exit(1); }
c = c.replace(oldDetails, newDetails);

fs.writeFileSync(path, c);
console.log('igdb time-to-beat: patched details() to fetch and store runtime (max time-to-beat in minutes)');

})();

// ===== patch_stats_distinct_game_runtime.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/controllers/statisticsController.js';
let c = fs.readFileSync(path, 'utf8');

// For video_game, the homepage summary should display the *total time-to-beat across
// distinct played games* (so re-playing The Witcher 3 four times still counts as one
// 200h game, not four). Upstream sums seen.duration per row, which conflates retries
// with new games. The IGDB time-to-beat lives in mediaItem.runtime (populated by
// patch_igdb_time_to_beat.js), so the right aggregate is:
//   SUM(DISTINCT mediaItem.runtime) over played video_game items
// We compute it as a separate query and patch into the existing mapValues.

if (c.includes('// mt-fork: distinct-game-runtime')) {
  console.log('stats distinct game runtime: already patched');
  return /* was process.exit(0) */;
}

// Inject the distinct-runtime side query right before the `return _.keyBy(...)` and
// override `duration` for video_game in the mapValues callback.
//
// Anchor on the original `return (0, _lodash.default)(res).keyBy('mediaType')...` line.
const oldRet =
  "  return (0, _lodash.default)(res).keyBy('mediaType').mapValues(item => ({\n" +
  "    ..._lodash.default.omit(item, ['runtime', 'mediaType']),\n" +
  "    numberOfPages: Math.round(item.numberOfPages),\n" +
  "    duration: Math.round(item.mediaType === 'video_game' || item.mediaType === 'book' ? item.duration : item.runtime)\n" +
  "  })).value();";

if (!c.includes(oldRet)) {
  console.error('stats distinct game runtime: return anchor not found (upstream changed?)');
  process.exit(1);
}

const newRet =
  "  // mt-fork: distinct-game-runtime — for video_game expose two stats:\n" +
  "  //   played*  → distinct games with kind='played' + sum of max IGDB time-to-beat\n" +
  "  //   watched* → distinct games with kind='watched' + sum of max IGDB time-to-beat\n" +
  "  // The homepage renders two lines: '(N juegos) Xh Xm jugando' / '...viendo'.\n" +
  "  const _gameStatsByKind = async (kind) => {\n" +
  "    const rows = await _dbconfig.Database.knex\n" +
  "      .select('mediaItem.id', 'mediaItem.runtime')\n" +
  "      .from('seen')\n" +
  "      .leftJoin('mediaItem', 'mediaItem.id', 'seen.mediaItemId')\n" +
  "      .where('seen.userId', userId)\n" +
  "      .where('seen.kind', kind)\n" +
  "      .where('mediaItem.mediaType', 'video_game')\n" +
  "      .distinct();\n" +
  "    return {\n" +
  "      items: rows.length,\n" +
  "      minutes: rows.reduce((acc, r) => acc + (Number(r.runtime) || 0), 0),\n" +
  "    };\n" +
  "  };\n" +
  "  const _gamePlayed = await _gameStatsByKind('played');\n" +
  "  const _gameWatched = await _gameStatsByKind('watched');\n" +
  "  return (0, _lodash.default)(res).keyBy('mediaType').mapValues(item => ({\n" +
  "    ..._lodash.default.omit(item, ['runtime', 'mediaType']),\n" +
  "    numberOfPages: Math.round(item.numberOfPages),\n" +
  "    duration: Math.round(\n" +
  "      item.mediaType === 'video_game' ? _gamePlayed.minutes :\n" +
  "      item.mediaType === 'book' ? item.duration :\n" +
  "      item.runtime\n" +
  "    ),\n" +
  "    playedItems:    item.mediaType === 'video_game' ? _gamePlayed.items   : undefined,\n" +
  "    playedDuration: item.mediaType === 'video_game' ? Math.round(_gamePlayed.minutes)  : undefined,\n" +
  "    watchedItems:   item.mediaType === 'video_game' ? _gameWatched.items  : undefined,\n" +
  "    watchedDuration:item.mediaType === 'video_game' ? Math.round(_gameWatched.minutes) : undefined,\n" +
  "  })).value();";

c = c.replace(oldRet, newRet);
fs.writeFileSync(path, c);
console.log('stats distinct game runtime: video_game duration now reflects distinct max-time-to-beat');

})();

// ===== patch_auto_refresh_games_on_stats.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/controllers/statisticsController.js';
let c = fs.readFileSync(path, 'utf8');

// Auto-trigger the IGDB time-to-beat backfill the FIRST time userStatisticsSummary
// runs, if there are any video_game items missing runtime. Without this the user
// has to manually click "Refrescar tiempos de juegos" on the Backup page before
// the homepage games block has anything to display.
//
// Fire-and-forget — we don't await; the stats response returns immediately with
// whatever's currently in the DB. The first reload after the refresh finishes
// (~85s for 334 games at 250ms each) will show the populated hours.
//
// One-shot per container lifetime via global._mtAutoRefreshGamesDone flag.

if (c.includes('// mt-fork: auto-refresh-games')) {
  console.log('auto refresh games on stats: already patched');
  return /* was process.exit(0) */;
}

// Anchor at the top of userStatisticsSummary, right after `const userStatisticsSummary = async userId => {`
const oldFn = "const userStatisticsSummary = async userId => {\n  const res = await _dbconfig.Database.knex('seen')";
const newFn =
  "const userStatisticsSummary = async userId => {\n" +
  "  // mt-fork: auto-refresh-games — fire once per container lifetime\n" +
  "  if (!global._mtAutoRefreshGamesDone) {\n" +
  "    global._mtAutoRefreshGamesDone = true;\n" +
  "    setImmediate(async () => {\n" +
  "      try {\n" +
  "        const knex = _dbconfig.Database.knex;\n" +
  "        const games = await knex('mediaItem').where({ mediaType: 'video_game' }).whereNotNull('igdbId').whereNull('runtime').select('id', 'igdbId', 'title');\n" +
  "        if (!games.length) return;\n" +
  "        const { metadataProviders } = require('../metadata/metadataProviders');\n" +
  "        const igdb = metadataProviders.get('video_game', 'IGDB');\n" +
  "        if (!igdb) return;\n" +
  "        _logger.logger.info('mt-fork: auto-refreshing IGDB time-to-beat for ' + games.length + ' game(s) without runtime');\n" +
  "        let updated = 0, missing = 0, failed = 0;\n" +
  "        // Process in batches of 5 in parallel — drops total time from ~250ms*N to ~250ms*(N/5).\n" +
  "        // Going wider risks IGDB rate-limiting the user's app credentials.\n" +
  "        const BATCH = 5;\n" +
  "        for (let i = 0; i < games.length; i += BATCH) {\n" +
  "          const slice = games.slice(i, i + BATCH);\n" +
  "          await Promise.all(slice.map(async g => {\n" +
  "            let ttb = null;\n" +
  "            try { ttb = await igdb.gameTimeToBeat(g.igdbId); }\n" +
  "            catch (_) { failed++; return; }\n" +
  "            if (!ttb) { missing++; return; }\n" +
  "            try { await knex('mediaItem').where('id', g.id).update({ runtime: ttb }); updated++; }\n" +
  "            catch (_) { failed++; }\n" +
  "          }));\n" +
  "        }\n" +
  "        _logger.logger.info('mt-fork: auto-refresh done — updated=' + updated + ', missing=' + missing + ', failed=' + failed);\n" +
  "      } catch (e) {\n" +
  "        _logger.logger.error('mt-fork: auto-refresh failed: ' + (e && e.message));\n" +
  "      }\n" +
  "    });\n" +
  "  }\n" +
  "  const res = await _dbconfig.Database.knex('seen')";

if (!c.includes(oldFn)) {
  console.error('auto refresh games on stats: function-start anchor not found');
  process.exit(1);
}

// Need _logger import. Check it's available; if not, add it.
if (!/_logger\s*=\s*require/.test(c) && !/var _logger\s*=\s*require/.test(c) && !c.includes('require("../logger")') && !c.includes("require('../logger')")) {
  // Add logger import at top (after the existing requires)
  const reqAnchor = 'var _dbconfig = require("../dbconfig");';
  const reqInjection = 'var _dbconfig = require("../dbconfig");\nvar _logger = require("../logger");';
  if (c.includes(reqAnchor)) {
    c = c.replace(reqAnchor, reqInjection);
    console.log('auto refresh games on stats: added _logger import');
  }
}

c = c.replace(oldFn, newFn);
fs.writeFileSync(path, c);
console.log('auto refresh games on stats: installed background backfill on first stats request');

})();

// ===== patch_youtube_stats_in_summary.js =====
;(() => {
// Inline YouTube watched stats into /api/statistics/summary so the homepage
// gets {movie, tv, book, video_game, audiobook, youtube} in a single request.
// Without this patch, _YTHome makes its own fetch to /api/youtube/watched-stats
// in a useEffect, which fires AFTER the rest of the summary has rendered — that
// staircase is what the user sees as "YouTube tarda más".
//
// Adds ~ms to the summary call (one JSON file read + reduce). The YouTube page
// still uses /api/youtube/watched-stats independently; that endpoint is left
// alone.

const fs = require('fs');
const path = '/app/build/controllers/statisticsController.js';
let c = fs.readFileSync(path, 'utf8');

const marker = '/* mt-fork: youtube-stats-in-summary */';
if (c.includes(marker)) {
  console.log('youtube stats in summary: already patched');
  return /* was process.exit(0) */;
}

// 1. Insert YouTube stats lookup right before the final lodash chain.
const beforeReturnAnchor = "  return (0, _lodash.default)(res).keyBy('mediaType').mapValues";
if (!c.includes(beforeReturnAnchor)) {
  console.error('youtube stats in summary: pre-return anchor not found'); process.exit(1);
}
const ytLookup =
  "  " + marker + "\n" +
  "  let _ytStats = { count: 0, totalSeconds: 0, totalMinutes: 0 };\n" +
  "  try {\n" +
  "    const _fsYT = require('fs');\n" +
  "    const _dataYT = JSON.parse(_fsYT.readFileSync('/storage/youtube-' + userId + '.json', 'utf8'));\n" +
  "    const _arrYT = Array.isArray(_dataYT.watched) ? _dataYT.watched : [];\n" +
  "    const _totalYT = _arrYT.reduce(function (s, w) { return s + (Number(w.durationSeconds) || 0); }, 0);\n" +
  "    _ytStats = { count: _arrYT.length, totalSeconds: _totalYT, totalMinutes: Math.round(_totalYT / 60) };\n" +
  "  } catch (_) {}\n";
c = c.replace(beforeReturnAnchor, ytLookup + beforeReturnAnchor);

// 2. Convert `return <chain>.value();` into a statement that we can extend with .youtube.
const valueClose = ').value();\n};';
if (!c.includes(valueClose)) {
  console.error('youtube stats in summary: value() close anchor not found'); process.exit(1);
}
c = c.replace(
  beforeReturnAnchor,
  "  const _summaryByType = (0, _lodash.default)(res).keyBy('mediaType').mapValues"
);
c = c.replace(
  valueClose,
  ').value();\n  _summaryByType.youtube = _ytStats;\n  return _summaryByType;\n};'
);

fs.writeFileSync(path, c);
console.log('youtube stats in summary: added .youtube to summary response');

// Sanity check: require the file to catch syntax errors at build time.
try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('youtube stats in summary: syntax OK');
} catch (e) {
  console.error('youtube stats in summary: SYNTAX ERROR ->', e.message.slice(0, 300));
  process.exit(1);
}

})();

// ===== patch_book_reading_minutes.js =====
;(() => {
// Compute "minutos leyendo" for the homepage summary as numberOfPages × 2,
// instead of using sum(seen.duration) — which is almost always 0 because the
// user doesn't enter per-session reading time.
//
// `item.numberOfPages` in userStatisticsSummary is already the SUM across all
// `seen` rows for books (pages-per-read summed), so re-reads correctly count
// twice. Two minutes/page is the assumption (≈ 30 min per 15-page chapter).

const fs = require('fs');
const path = '/app/build/controllers/statisticsController.js';
let c = fs.readFileSync(path, 'utf8');

const marker = '/* mt-fork: book-reading-minutes */';
if (c.includes(marker)) {
  console.log('book reading minutes: already patched');
  return /* was process.exit(0) */;
}

// The lodash mapValues callback computes `duration` per mediaType. Swap the
// book branch to derive minutes from pages.
const old = "item.mediaType === 'book' ? item.duration :";
const fresh = "item.mediaType === 'book' ? (item.numberOfPages || 0) * 2 " + marker + " :";

if (!c.includes(old)) {
  console.error('book reading minutes: anchor not found (statisticsController layout changed?)');
  process.exit(1);
}

c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('book reading minutes: book duration = pages × 2');

try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('book reading minutes: syntax OK');
} catch (e) {
  console.error('book reading minutes: SYNTAX ERROR ->', e.message.slice(0, 300));
  process.exit(1);
}

})();

// ===== patch_refresh_game_runtimes.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

// Admin endpoint to backfill mediaItem.runtime for every video_game with an
// igdbId. Without this, the patch_igdb_time_to_beat.js change only takes
// effect on the 24h metadata-refresh cycle, so existing libraries see "0h"
// in the homepage games block until each game's lastTimeUpdated rolls over.
//
// One-shot, idempotent (re-running is fine — it only writes when the value
// differs). Throttled by IGDB's own request queue (250ms between calls).

if (c.includes('refreshGameRuntimes =') && c.includes('refreshGameRuntimeOne =')) {
  console.log('refresh game runtimes: already patched');
  return /* was process.exit(0) */;
}

// Strip prior versions so re-running this patch picks up new logic.
['refreshGameRuntimes', 'refreshGameRuntimeOne'].forEach(name => {
  const re = new RegExp('  ' + name + ' = \\(0, _typescriptRoutesToOpenapiServer\\.createExpressRoute\\)\\(async \\(req, res\\) => \\{[\\s\\S]*?\\n  \\}\\);\\n', 'g');
  c = c.replace(re, '');
});

const method =
  "  refreshGameRuntimes = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
  "    if (!(await this.jellyfinIsAdmin(req, res))) return;\n" +
  "    const knex = _dbconfig.Database.knex;\n" +
  "    const { metadataProviders } = require('../metadata/metadataProviders');\n" +
  "    const igdb = metadataProviders.get('video_game', 'IGDB');\n" +
  "    if (!igdb) { res.status(500).json({ error: 'IGDB provider not available' }); return; }\n" +
  "    const games = await knex('mediaItem').where({ mediaType: 'video_game' }).whereNotNull('igdbId').select('id','igdbId','runtime','title');\n" +
  "    let updated = 0, unchanged = 0, missing = 0, failed = 0;\n" +
  "    for (const g of games) {\n" +
  "      let ttb = null;\n" +
  "      try { ttb = await igdb.gameTimeToBeat(g.igdbId); }\n" +
  "      catch (_) { failed++; continue; }\n" +
  "      if (!ttb) { missing++; continue; }\n" +
  "      if (g.runtime === ttb) { unchanged++; continue; }\n" +
  "      try {\n" +
  "        await knex('mediaItem').where('id', g.id).update({ runtime: ttb });\n" +
  "        updated++;\n" +
  "      } catch (_) { failed++; }\n" +
  "    }\n" +
  "    res.json({ ok: true, total: games.length, updated, unchanged, missing, failed });\n" +
  "  });\n" +
  // Per-game variant: refresh a single video_game's runtime from IGDB.
  // Any logged-in user can trigger this for an item they care about; the
  // change writes mediaItem.runtime which is shared across users (same as
  // upstream's metadata refresh button).
  "  refreshGameRuntimeOne = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
  "    const userId = Number(req.user);\n" +
  "    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }\n" +
  "    const id = Number(req.params.mediaItemId);\n" +
  "    if (!id) { res.status(400).json({ error: 'mediaItemId requerido' }); return; }\n" +
  "    const knex = _dbconfig.Database.knex;\n" +
  "    const { metadataProviders } = require('../metadata/metadataProviders');\n" +
  "    const igdb = metadataProviders.get('video_game', 'IGDB');\n" +
  "    if (!igdb) { res.status(500).json({ error: 'IGDB provider not available' }); return; }\n" +
  "    const g = await knex('mediaItem').where({ id, mediaType: 'video_game' }).whereNotNull('igdbId').first();\n" +
  "    if (!g) { res.status(404).json({ error: 'game not found or has no igdbId' }); return; }\n" +
  "    let ttb = null;\n" +
  "    try { ttb = await igdb.gameTimeToBeat(g.igdbId); }\n" +
  "    catch (e) { res.status(502).json({ error: 'IGDB error: ' + e.message }); return; }\n" +
  "    if (!ttb) { res.json({ ok: true, updated: false, reason: 'no time-to-beat from IGDB', runtime: g.runtime }); return; }\n" +
  "    if (g.runtime === ttb) { res.json({ ok: true, updated: false, reason: 'unchanged', runtime: ttb }); return; }\n" +
  "    await knex('mediaItem').where('id', id).update({ runtime: ttb });\n" +
  "    res.json({ ok: true, updated: true, runtime: ttb });\n" +
  "  });\n";

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('refresh game runtimes: anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('refresh game runtimes: added refreshGameRuntimes endpoint');

// Register the route
const routesPath = '/app/build/generated/routes/routes.js';
let r = fs.readFileSync(routesPath, 'utf8');
if (r.includes("/api/refresh-game-runtimes'") && r.includes("/api/refresh-game-runtime/:mediaItemId'")) {
  console.log('refresh game runtimes: routes already registered');
} else {
  // Strip prior versions so re-running picks up the new (per-game) route too.
  r = r.replace(/router\.post\('\/api\/refresh-game-runtimes?'[^\n]*\n/g, '');
  r = r.replace(/router\.post\('\/api\/refresh-game-runtime\/:mediaItemId'[^\n]*\n/g, '');
  const routeAnchor = "router.post('/api/catalog/cleanup'";
  if (!r.includes(routeAnchor)) { console.error('refresh game runtimes: route anchor not found'); process.exit(1); }
  const routeLines =
    "router.post('/api/refresh-game-runtimes', validatorHandler({}), _MediaItemController.refreshGameRuntimes);\n" +
    "router.post('/api/refresh-game-runtime/:mediaItemId', validatorHandler({}), _MediaItemController.refreshGameRuntimeOne);\n";
  r = r.replace(routeAnchor, routeLines + routeAnchor);
  fs.writeFileSync(routesPath, r);
  console.log('refresh game runtimes: 2 routes registered (bulk + per-game)');
}

})();

// ===== patch_sw_no_cache.js =====
;(() => {
const fs = require('fs');
const path = '/app/build/server.js';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('// sw-no-cache')) { console.log('sw no-cache: already patched'); return /* was process.exit(0) */; }

// Force Cache-Control: no-store for /sw.js so Cloudflare and browsers always
// fetch the latest. Without this, /sw.js inherits the .js max-age=31536000 rule
// and CF caches it for a year, defeating the SW's content-hash invalidation.
const old = "this.#app.get(/\\.(?:js|css|woff2)$/, (req, res, next) => {\n      res.set('Cache-Control', 'max-age=31536000');\n      next();\n    });";
const fresh = "this.#app.get(/\\.(?:js|css|woff2)$/, (req, res, next) => { // sw-no-cache\n      if (req.path === '/sw.js') { res.set('Cache-Control', 'no-store, no-cache, must-revalidate'); next(); return; }\n      res.set('Cache-Control', 'max-age=31536000');\n      next();\n    });";

if (!c.includes(old)) { console.error('sw no-cache: anchor not found'); process.exit(1); }
c = c.replace(old, fresh);
fs.writeFileSync(path, c);
console.log('sw no-cache: /sw.js now served with no-store (CF and browsers always refetch)');

})();

// ===== patch_accept_encoding_safe.js =====
;(() => {
// Bugfix: server.js does `req.header('Accept-Encoding').includes('br')` to
// decide whether to swap a .js/.css URL to its .br/.gz variant. If the
// request omits the Accept-Encoding header (curl, some bots, dev tools that
// disable cache), `req.header(...)` returns undefined and `.includes` throws,
// returning a 500 for every js/css fetch — so the SPA bundle can't load.
//
// Wrap each access in `(req.header('Accept-Encoding') || '')` so absence
// degrades cleanly to "no compression accepted".

const fs = require('fs');
const path = '/app/build/server.js';
let c = fs.readFileSync(path, 'utf8');

const marker = '// mt-fork: accept-encoding-safe';
if (c.includes(marker)) {
  console.log('accept-encoding safe: already patched');
  return /* was process.exit(0) */;
}

let changed = 0;
const old1 = "req.header('Accept-Encoding').includes('br')";
const new1 = "(req.header('Accept-Encoding') || '').includes('br')";
if (c.includes(old1)) {
  c = c.split(old1).join(new1);
  changed++;
}
const old2 = "req.header('Accept-Encoding').includes('gz')";
const new2 = "(req.header('Accept-Encoding') || '').includes('gz')";
if (c.includes(old2)) {
  c = c.split(old2).join(new2);
  changed++;
}

if (changed === 0) {
  console.error('accept-encoding safe: no anchors matched (server.js layout changed?)');
  process.exit(1);
}

c = '// ' + marker.replace('// ', '') + '\n' + c;
fs.writeFileSync(path, c);
console.log('accept-encoding safe: hardened ' + changed + ' brotli/gzip checks');

try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('accept-encoding safe: syntax OK');
} catch (e) {
  console.error('accept-encoding safe: SYNTAX ERROR -> ' + e.message.slice(0, 300));
  process.exit(1);
}

})();

// ===== patch_download_asset_ua.js =====
;(() => {
// Bugfix: utils.downloadAsset() calls axios.get(url, { responseType: 'arraybuffer' })
// with no headers. Wikimedia Commons (and several other CDNs) require a
// non-empty User-Agent and return 403 Forbidden otherwise — which means our
// Wikidata-sourced theater posters never download.
//
// Patch the axios.get call inside downloadAsset to include a UA + Accept.

const fs = require('fs');
const path = '/app/build/utils.js';
let c = fs.readFileSync(path, 'utf8');

const marker = '// mt-fork: download-asset-ua';
if (c.includes(marker)) {
  console.log('download-asset-ua: already patched');
  return /* was process.exit(0) */;
}

const old = `const response = await _axios.default.get(url, {
    responseType: 'arraybuffer'
  });`;
const _new = `const response = await _axios.default.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'MediaTrackerCustom/0.1 (+image-fetch)',
      'Accept': 'image/webp,image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5'
    },
    timeout: 30000,
    maxRedirects: 5
  });`;

if (!c.includes(old)) {
  console.error('download-asset-ua: anchor not found in utils.js (downloadAsset layout changed?)');
  process.exit(1);
}
c = c.replace(old, _new);
c = '// ' + marker.replace('// ', '') + '\n' + c;
fs.writeFileSync(path, c);
console.log('download-asset-ua: added UA + Accept headers to downloadAsset');

try {
  delete require.cache[require.resolve(path)];
  require(path);
  console.log('download-asset-ua: syntax OK');
} catch (e) {
  console.error('download-asset-ua: SYNTAX ERROR -> ' + e.message.slice(0, 300));
  process.exit(1);
}

})();
