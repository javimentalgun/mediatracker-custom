// Remove the white "Lo estoy viendo / leyendo / escuchando / jugando" button
// from the detail page action panel. The "in progress" semantics now live
// exclusively in the Progreso modal (Marcar/Quitar en proceso toggle). For
// games specifically, mount the _MAS toggle ("Marcar como visto" / "Quitar
// de visto") instead — the user wants that "seen-watched" affordance only on
// game detail pages, not on movies / books / audiobooks / theater / tv.
//
// Anchor: the original IAM button div (with the regenerator-coroutine onClick
// and the 5 mediaType-conditional labels — Tt(a) was inserted earlier by
// patch_theater_hide_iam_btn.js, so it's expected here). We replace the whole
// `!Lo(a)&&r.createElement(...)` expression with a games-gated _MAS mount;
// for non-game items the slot collapses to nothing.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: iam-removed-mas-games */';
if (c.includes(marker)) {
  console.log('iam-removed-mas-games: already patched');
  process.exit(0);
}

const old = '!Lo(a)&&r.createElement("div",{className:"mt-3 text-sm btn",onClick:de(ke().mark((function e(){return ke().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:un({mediaItemId:a.id,progress:0});case 1:case"end":return e.stop()}}),e)})))},Io(a)&&r.createElement(Xe,{id:"I am watching it"}),Tt(a)&&r.createElement(Xe,{id:"I am watching it"}),Do(a)&&r.createElement(Xe,{id:"I am reading it"}),jo(a)&&r.createElement(Xe,{id:"I am listening it"}),Ao(a)&&r.createElement(Xe,{id:"I am playing it"}))';
const _new = 'Ao(a)&&r.createElement(_MAS,{mediaItem:a})';
if (!c.includes(old)) {
  console.error('iam-removed-mas-games: anchor not found');
  process.exit(1);
}
c = c.replace(old, _new);
console.log('iam-removed-mas-games: IAM button removed; _MAS mounted only for games (Ao)');

c = marker + c;
fs.writeFileSync(bundlePath, c);

const path = require('path');
for (const ext of ['.br', '.gz']) {
  const p = bundlePath + ext;
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
    catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
  }
}

console.log('iam-removed-mas-games: done');
