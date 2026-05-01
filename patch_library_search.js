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
