// Restructure the Progreso modal (Rp component) so its buttons follow the
// design the user asked for:
//
//   1. Marcar como completado     — green filled (unchanged), FIRST
//   2. Guardar progreso            — green outline, always visible, submits slider
//   3. Quitar progreso             — red outline, always visible, clears progress
//   4. Marcar en proceso ↔ Quitar de proceso — green/red OUTLINE toggle, state-aware
//   5. Cancelar                    — red filled (unchanged), LAST
//
// Save and clear are two separate, always-visible buttons (no toggle): the
// user wants to see both choices at once.
//   • Guardar progreso (green outline) — submits the slider value via _save.
//   • Quitar progreso (red outline)    — sets the matching progress field to 0
//     (audio-progress for audiobook/listen, episode-progress for TV current ep,
//     un() with progress:0 otherwise) and refetches.
//   • Marcar/Quitar de proceso reads/writes mediaItem.activelyInProgress via
//     /api/actively-in-progress/:id (PUT to mark, DELETE to unmark).
//
// "Outline" styling = `btn` class (which already gives a 1px border using
// border-color: currentColor) with text-green-500 / text-red-500 text colors,
// no background — matches Tailwind "outline" semantics naturally.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/* mt-fork: modal-restructured-buttons */';
if (c.includes(marker)) {
  console.log('modal-restructured-buttons: already patched');
  process.exit(0);
}

// --- 1. Drop the original "Guardar progreso" submit button inside the form.
// We'll re-add a click-driven version OUTSIDE the form so it can be paired
// with "Quitar progreso" as a single toggle slot in the new button order.
const oldGuardarSubmit = ',r.createElement("button",{className:"w-full btn"},"Guardar progreso")';
if (!c.includes(oldGuardarSubmit)) {
  console.error('modal-restructured-buttons: Guardar submit anchor not found');
  process.exit(1);
}
c = c.replace(oldGuardarSubmit, '');
console.log('modal-restructured-buttons: removed in-form Guardar submit button');

// --- 2. Replace the trailing block (Marcar como completado + Cancel) plus
// any older injected buttons (Quitar de proceso / Quitar progreso) with the
// final four-button layout in the right order.
//
// We anchor on the unchanged Marcar como completado element. Everything from
// there to the end of the createElement(div,{className:"p-3"} ...) tree is
// the buttons section we want to rewrite. The simplest, robust replacement
// is to anchor on the EXACT createElement(...) call for "Marcar como
// completado" that has the green-bg style override, plus the chain that
// follows it (which may now contain my older Quitar de proceso / Quitar
// progreso, or just Cancel).
//
// To stay resilient to either state of the chain, we match
//   <CompletadoElement>...<CancelElement>
// and replace it wholesale.
//
// Build the regex from the Completado anchor.
const completadoAnchor = 'r.createElement("div",{className:"w-full mt-3 btn-blue",style:{background:"#16a34a",color:"white"},onClick:_markCompleted},_tvEp?"Marcar episodio como completado":"Marcar como completado")';
const cancelAnchor = 'r.createElement("div",{className:"w-full mt-3 btn-red",onClick:function(){return n()}},r.createElement(Xe,{id:"Cancel"}))';
const cidx = c.indexOf(completadoAnchor);
const xidx = c.indexOf(cancelAnchor, cidx);
if (cidx < 0 || xidx < 0) {
  console.error('modal-restructured-buttons: Completado/Cancel anchors not found');
  process.exit(1);
}
const oldBlock = c.slice(cidx, xidx + cancelAnchor.length);

// Build the new block. Order:
//   [1] Marcar como completado, [2] Guardar progreso, [3] Quitar progreso,
//   [4] Marcar/Quitar en proceso (toggle), [5] Cancelar.
const newBlock = ''
  + 'r.createElement(r.Fragment,null,'
    // [1] Marcar como completado (unchanged, first)
    + completadoAnchor + ','
    // [2] Guardar progreso — green outline, always visible, submits slider
    + 'r.createElement("div",{className:"w-full mt-3 btn text-green-500",onClick:function(ev){_save(ev)}},"Guardar progreso"),'
    // [3] Quitar progreso — red outline, always visible, sets the matching
    //     progress field to 0 and refetches.
    + '(function(){'
      + 'var _clearOnce=function(){'
        + 'var promises=[];'
        + 'if(_tvEp){'
          + 'promises.push(fetch("/api/episode-progress?episodeId="+_tvEp.id+"&progress=0",{method:"PUT",credentials:"same-origin"}));'
        + '}else{'
          + 'un({mediaItemId:t.id,progress:0,duration:0});'
          + 'promises.push(fetch("/api/audio-progress?mediaItemId="+t.id+"&progress=0",{method:"PUT",credentials:"same-origin"}));'
        + '}'
        + 'Promise.all(promises).finally(function(){HW.refetchQueries(en(t.id));HW.refetchQueries(["items"]);n()});'
      + '};'
      + 'return r.createElement("div",{className:"w-full mt-3 btn text-red-500",onClick:_clearOnce},"Quitar progreso");'
    + '})(),'
    // [4] Toggle Marcar en proceso ↔ Quitar de proceso (outline)
    //     "Quitar de proceso" además garantiza que la serie quede en
    //     Seguimiento (Watchlist) — al sacar de "En proceso" la añadimos
    //     idempotentemente al watchlist para que no desaparezca de la
    //     vista del usuario.
    + '(function(){'
      + 'var _aip=Boolean(t.activelyInProgress);'
      + 'if(_aip){'
        + 'var _delAip=function(){'
          + 'Promise.all(['
            + 'fetch("/api/actively-in-progress/"+t.id,{method:"DELETE",credentials:"same-origin"}),'
            + 'fetch("/api/watchlist?mediaItemId="+t.id,{method:"PUT",credentials:"same-origin"})'
          + ']).finally(function(){window._mtBustItemFlags&&window._mtBustItemFlags(t.id);HW.refetchQueries(en(t.id));HW.refetchQueries(["items"]);n();});'
        + '};'
        + 'return r.createElement("div",{className:"w-full mt-3 btn text-red-500",onClick:_delAip},"Quitar de proceso");'
      + '}'
      + 'var _addAip=function(){'
        + 'fetch("/api/actively-in-progress/"+t.id,{method:"PUT",credentials:"same-origin"})'
          + '.finally(function(){window._mtBustItemFlags&&window._mtBustItemFlags(t.id);HW.refetchQueries(en(t.id));HW.refetchQueries(["items"]);n();});'
      + '};'
      + 'return r.createElement("div",{className:"w-full mt-3 btn text-green-500",onClick:_addAip},"Marcar en proceso");'
    + '})(),'
    // [5] Cancelar (unchanged, last)
    + cancelAnchor
  + ')';

c = c.slice(0, cidx) + newBlock + c.slice(xidx + cancelAnchor.length);
console.log('modal-restructured-buttons: rewrote button block (Completado · Guardar/Quitar progreso · Marcar/Quitar proceso · Cancelar)');

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

console.log('modal-restructured-buttons: done');
