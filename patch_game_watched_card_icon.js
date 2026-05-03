// Show an eye icon (visibility) on game cards when the item has at least one
// kind='watched' seen row, positioned at top-right just next to (left of) the
// existing "Completado" check_circle. Two icons can show simultaneously when
// the game is both played and watched.
//
// Edits:
//   1. controllers/queries/items.js: add a `seenWatched` flag to each row by
//      joining a subquery of distinct (userId, mediaItemId) pairs from seen
//      where kind='watched'. Cheap: one subquery, indexed on seen_kind_index.
//   2. main bundle: insert a conditional createElement for the eye icon next
//      to the existing check_circle anchor.

const fs = require('fs');
const child = require('child_process');

// ===== Backend: items.js =====
{
  const path = '/app/build/knex/queries/items.js';
  let c = fs.readFileSync(path, 'utf8');
  if (c.includes('// mt-fork: seenWatched-flag')) {
    console.log('game watched card icon: items.js already patched');
  } else {
    // Anchor: the existing leftJoin for `lastSeen` (introduced upstream).
    // Place the new join right after it so the alias `seenWatched` is in scope
    // before the row map.
    const joinAnchor =
      "}).from('seen').where('userId', userId).groupBy('mediaItemId').as('lastSeen'), 'lastSeen.mediaItemId', 'mediaItem.id')";
    if (!c.includes(joinAnchor)) {
      console.error('game watched card icon: lastSeen join anchor not found');
      process.exit(1);
    }
    const newJoin =
      joinAnchor +
      "\n    // mt-fork: seenWatched-flag\n" +
      "    .leftJoin(qb => qb.select('mediaItemId').from('seen').where('userId', userId).where('kind', 'watched').groupBy('mediaItemId').as('seenWatched'), 'seenWatched.mediaItemId', 'mediaItem.id')";
    c = c.replace(joinAnchor, newJoin);

    // Add seenWatched.mediaItemId to the main .select({...}) — without this
    // the column isn't materialized in the result rows (knex only returns
    // what's explicitly selected even when the join is wired up).
    const selectAnchor =
      "    'lastSeen.mediaItemId': 'lastSeen.mediaItemId',";
    if (!c.includes(selectAnchor)) {
      console.error('game watched card icon: select lastSeen anchor not found');
      process.exit(1);
    }
    const selectNew = selectAnchor +
      "\n    'seenWatched.mediaItemId': 'seenWatched.mediaItemId',";
    c = c.replace(selectAnchor, selectNew);

    // Anchor: the row map `seen: row[...] === 'tv' ? ... : Boolean(...)`.
    // Add `seenWatched: Boolean(row['seenWatched.mediaItemId'])` right after.
    const seenLine =
      "seen: row['mediaItem.mediaType'] === 'tv' ? row.numberOfEpisodes > 0 && !row.unseenEpisodesCount : Boolean(row['lastSeen.mediaItemId']),";
    if (!c.includes(seenLine)) {
      console.error('game watched card icon: row.seen anchor not found');
      process.exit(1);
    }
    const seenLineNew =
      seenLine + "\n    seenWatched: Boolean(row['seenWatched.mediaItemId']),";
    c = c.replace(seenLine, seenLineNew);
    fs.writeFileSync(path, c);
    console.log('game watched card icon: items.js exposes seenWatched per item');
  }
}

// ===== Frontend: insert eye icon outside the s-gated Fragment =====
// The audiobook/check_circle/book icons live inside the `s && Fragment(...)`
// non-TV branch, so they only render when the parent Zv passes a non-empty
// `gridItemAppearance`. The _GVS split sub-sections pass `gridItemAppearance:{}`,
// which would hide the eye there. Anchor on the play_circle element which sits
// at the SAME tree level as `s && Fragment(...)` (outside the gate) so the eye
// shows on every page that lists game cards regardless of appearance config.
{
  const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
  let c = fs.readFileSync(bundlePath, 'utf8');
  const marker = '/*mt-fork:game-watched-card-icon*/';
  if (c.includes(marker)) {
    console.log('game watched card icon: bundle already patched');
  } else {
    // Anchor: the "Jugando" play_circle, which is at the s-ungated level,
    // sibling of `s && Fragment(...)`.
    const anchor =
      'Ao(t)&&t.progress>0&&!t.seen&&r.createElement("div",{className:"absolute inline-flex pointer-events-auto foo top-1 right-1"},r.createElement(Fv,null,r.createElement("i",{className:"flex text-white select-none material-icons",title:"Jugando"},"play_circle_outline")))';
    if (!c.includes(anchor)) {
      console.error('game watched card icon: play_circle (s-ungated) anchor not found');
      process.exit(1);
    }
    // Eye icon: shown for games when seenWatched is true. Stacked BELOW the
    // check_circle (same right-1 anchor, top:2.5rem). For pages where the
    // check_circle isn't drawn (s={}), the eye still appears alone at this
    // offset — fine, since the user only cares it's *there*.
    const eye =
      '"video_game"===t.mediaType&&t.seenWatched&&r.createElement("div",{className:"absolute inline-flex pointer-events-auto foo right-1",style:{top:"2.5rem"}' + marker + '},r.createElement(Fv,null,r.createElement("span",{className:"flex material-icons",title:"Visto"},"visibility"))),';
    c = c.replace(anchor, eye + anchor);
    fs.writeFileSync(bundlePath, c);
    console.log('game watched card icon: eye injected outside s-gated Fragment (visible on all pages)');
  }
}
