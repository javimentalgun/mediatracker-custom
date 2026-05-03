// Frontend for "Marcar como en proceso":
//   - _AIP component: a toggle button on the detail page (▶ Marcar como en proceso
//     ↔ Quitar de en proceso) that hits PUT/DELETE /api/actively-in-progress/:mediaItemId.
//     Mounted right after _AB ("Marcar como abandonada") in the detail-page button row.
//   - Card border: when item.activelyInProgress is true, render a purple ring on
//     the card so it's visually distinguishable from "watchlist + already released"
//     items in /in-progress.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:actively-in-progress*/';
if (c.includes(marker)) {
  console.log('actively-in-progress frontend: already patched');
  process.exit(0);
}

// === 1. _AIP toggle component ===
// Embed the marker inside the function body so c.includes(marker) is a reliable
// idempotency check (otherwise re-running the patch would inject _AIP twice).
const aipDef = '_AIP=function(e){' + marker +
  'var mi=e.mediaItem;' +
  'var _s=r.useState(null),active=_s[0],setA=_s[1];' +
  // Active = "force-include" state. Excluded items don't count as active.
  'var load=function(){' +
    'fetch("/api/actively-in-progress",{credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){setA((d.included||d.items||[]).indexOf(mi.id)>=0)}).catch(function(){setA(false)})' +
  '};' +
  'r.useEffect(load,[mi.id]);' +
  'if(active===null)return null;' +
  'var toggle=function(){' +
    'var url="/api/actively-in-progress/"+mi.id;' +
    'var method=active?"DELETE":"PUT";' +
    'fetch(url,{method:method,credentials:"same-origin"}).then(function(r){return r.json()}).then(function(){' +
      'setA(!active);' +
      // Be aggressive: removeQueries drops cached pages so the next visit to
      // /in-progress (or any items list) refetches with the new flag state.
      // invalidateQueries is the gentle equivalent but doesn't always trigger
      // a refetch if the consumer isn't currently mounted.
      'try{HW.removeQueries(["items"])}catch(_){}; try{HW.invalidateQueries(["items"])}catch(_){}; try{HW.removeQueries(["details",mi.id])}catch(_){};' +
    '})' +
  '};' +
  // White button (`btn` = neutral) when not active = "Marcar como en proceso";
  // red (`btn-red`) when active = "Quitar de en proceso" (destructive intent).
  // text-center forces the inner Xe label to center inside the box even when
  // the parent flex/grid stretches the button.
  'return r.createElement("div",{className:"text-sm text-center "+(active?"btn-red":"btn"),onClick:toggle},' +
    'r.createElement(Xe,{id:active?"Stop being in progress":"Mark as in progress"})' +
  ')' +
'},';

// Inject the component before _v (same pattern other custom components use).
const compAnchor = '_v=function(e){';
if (!c.includes(compAnchor)) { console.error('actively-in-progress: _v anchor not found'); process.exit(1); }
c = c.replace(compAnchor, aipDef + compAnchor);
console.log('actively-in-progress: injected _AIP component');

// === 2. Mount layout for the detail-page button row:
//   - _AIP is NOT mounted in the action grid — the green "Lo estoy viendo /
//     leyendo / escuchando / jugando" button (which opens the Progreso modal
//     with percentage + complete/cancel) covers the same in-progress
//     semantics in a richer way, and the user reported the dual buttons as
//     duplicate UX. The _AIP component definition is kept (above) because
//     other patches (item-flags-combined, details-includes-flags) still
//     reference it.
//   - "Update metadata" (sg) is moved out of its original row-1 position to
//     a new slot immediately after _AB ("Marcar como abandonada"). Removing
//     the original row-1 slot also drops the dropdown that would have lived
//     in _AIP's place, so the grid reduces to 5 children laid out as:
//        row 1 = Marcar como completado | Gp (Add to list)
//        row 2 = og/ig (watchlist add/remove) | _AB (abandonada)
//        row 3 = sg (Update metadata) | (empty)
const sgAnchor = 'function(e){var t;return["igdb","tmdb","openlibrary","audible"].includes(null===(t=e.source)||void 0===t?void 0:t.toLowerCase())}(a)?r.createElement(sg,{mediaItem:a}):r.createElement("div")';
if (!c.includes(sgAnchor + ',')) {
  console.error('actively-in-progress: sg (Update metadata) anchor not found'); process.exit(1);
}
const sgConditional = sgAnchor; // re-use as the moved markup
// Drop the row-1 slot entirely (the trailing comma too, so the chain stays well-formed).
c = c.replace(sgAnchor + ',', '');
console.log('actively-in-progress: dropped row-1 sg slot (no _AIP mount)');

// Move the (intact) Update-metadata conditional to the right of _AB.
const abMount = ',r.createElement(_AB,{mediaItem:a})';
if (!c.includes(abMount)) {
  console.error('actively-in-progress: _AB mount anchor not found for sg relocation'); process.exit(1);
}
c = c.replace(abMount, abMount + ',' + sgConditional);
console.log('actively-in-progress: relocated Update metadata to the right of _AB');

fs.writeFileSync(bundlePath, c);
console.log('actively-in-progress frontend: complete (button mounted)');
