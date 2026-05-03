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
