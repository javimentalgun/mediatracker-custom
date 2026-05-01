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
    'r.createElement(_Section,{label:xo._("Books"),args:{mediaType:"book",' + filterKey + ':!0}})'
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
