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
//    otherwise the entry exists but the dropdown filters it out.
const sideOld = '["/upcoming","/in-progress","/calendar","/lists","/watchlist"]';
const sideNew = '["/upcoming","/in-progress","/calendar","/lists","/watchlist","/downloaded"]';
if (c.includes(sideNew)) {
  console.log('downloaded tab: already in side dropdown');
} else if (!c.includes(sideOld)) {
  console.error('downloaded tab: SIDE_PATHS anchor not found'); process.exit(1);
} else {
  c = c.split(sideOld).join(sideNew);
  console.log('downloaded tab: added /downloaded to _DD side dropdown filter');
}

fs.writeFileSync(bundlePath, c);
console.log('downloaded tab: complete');
