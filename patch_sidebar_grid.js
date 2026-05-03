const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Replace the sequence of detail-page sidebar action buttons with a 2-column grid:
//   Row 1: [Marcar como completado] [Actualizar metadatos]
//   Row 2: [Marcar como leído]      [Marcar como no leído]
//   Row 3: [Añadido en N listas]    [Quitar/Añadir a Pendientes]
//
// Buttons that don't satisfy their visibility condition render an empty <div> as a
// placeholder so the grid stays aligned.

const oldBlock = 'function(e){var t;return["igdb","tmdb","openlibrary","audible"].includes(null===(t=e.source)||void 0===t?void 0:t.toLowerCase())}(a)&&r.createElement("div",{className:"pt-3"},r.createElement(sg,{mediaItem:a})),r.createElement("div",{className:"mt-3"},function(e){return!0===e.onWatchlist}(a)?r.createElement(og,{mediaItem:a}):r.createElement(ig,{mediaItem:a})),r.createElement("div",{className:"mt-3"},r.createElement(Gp,{mediaItemId:a.id})),r.createElement("div",{className:"mt-3"},(Wo(a)||!No(a))&&r.createElement(r.Fragment,null,r.createElement(Yp,{mediaItem:a}),Kp(a)&&r.createElement("div",{className:"mt-3"},r.createElement($p,{mediaItem:a})))),r.createElement("div",{className:"mt-3"})';

// Toggle "Marcar como completado" / "Quitar completado":
//   - If item is completed (seen / progress=1 / audioProgress=1): red, removes completion
//   - Else: white, marks completion. For games, auto-pulls HLTB time and stores it as seen.duration
//
// For games, "completado" means a kind='played' seen row exists. Without this
// branch the button would also light up after "Marcar como visto" (kind='watched'),
// because `a.seen===true` is set as soon as ANY seen row exists.
const completedExpr =
  '((a.mediaType==="video_game"' +
    '?(a.seenHistory&&a.seenHistory.some(function(s){return s.kind==="played"}))' +
    ':a.seen===true' +
  ')||a.progress===1||a.audioProgress===1)';
// "Quitar completado" must delete only kind='played' rows, not watched ones —
// the new DELETE accepts &kind=played (handler patched in patch_seen_kind_wiring).
const markCompletedBtn = 'r.createElement("div",{className:"text-sm btn",style:' + completedExpr + '?{background:"#dc2626",color:"white",borderColor:"#dc2626"}:{},onClick:function(){' +
  'if(' + completedExpr + '){' +
    'Promise.all([' +
      'fetch("/api/seen/?mediaItemId="+a.id+"&kind=played",{method:"DELETE",credentials:"same-origin"}),' +
      'fetch("/api/audio-progress?mediaItemId="+a.id+"&progress=0",{method:"PUT",credentials:"same-origin"})' +
    ']).then(function(){un({mediaItemId:a.id,progress:0,duration:0});HW.refetchQueries(en(a.id));HW.refetchQueries(["items"])});' +
  '}else{' +
    'un({mediaItemId:a.id,progress:1});' +
    'var _doMark=function(dur){' +
      'var url="/api/seen?mediaItemId="+a.id+"&lastSeenAt=now"+(dur?"&duration="+dur:"");' +
      // Sidebar toggle: only seen + progress (read). Does NOT touch audioProgress
      // (use the listen modal explicitly to mark as escuchado).
      'return fetch(url,{method:"PUT",credentials:"same-origin"})' +
        '.then(function(){HW.refetchQueries(en(a.id));HW.refetchQueries(["items"])});' +
    '};' +
    'if(Ao(a)){fetch("/api/hltb?mediaItemId="+a.id,{credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){_doMark((d&&(d.completely||d.normally||d.hastily))||0)}).catch(function(){_doMark(0)})}else{_doMark(0)}' +
  '}' +
'}},' + completedExpr + '?"Quitar completado":"Marcar como completado")';

const sgCell = 'function(e){var t;return["igdb","tmdb","openlibrary","audible"].includes(null===(t=e.source)||void 0===t?void 0:t.toLowerCase())}(a)?r.createElement(sg,{mediaItem:a}):r.createElement("div")';
const gpCell = 'r.createElement(Gp,{mediaItemId:a.id})';
const watchlistCell = 'function(e){return!0===e.onWatchlist}(a)?r.createElement(og,{mediaItem:a}):r.createElement(ig,{mediaItem:a})';

// Grid is now 2 rows × 2 cols (no Yp / $p — replaced by the toggle)
const newBlock =
  'r.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginTop:"0.75rem"}},' +
    markCompletedBtn + ',' +
    sgCell + ',' +
    gpCell + ',' +
    watchlistCell +
  ')';

if (c.includes('Marcar como completado"')&&c.includes('display:"grid",gridTemplateColumns:"1fr 1fr"')) {
  console.log('sidebar grid: already patched');
} else if (!c.includes(oldBlock)) {
  console.error('sidebar grid: anchor block not found');
  process.exit(1);
} else {
  c = c.replace(oldBlock, newBlock);
  console.log('sidebar grid: replaced action buttons with 2-column grid');
}

fs.writeFileSync(bundlePath, c);
