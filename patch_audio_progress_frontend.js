const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Replace the sidebar block:
//   Lo(a)&&Fragment("I finished it" button + "Progress: X%")  +  ug button (Progreso)
// with:
//   "Marcar como completado" button (single, always shown)
//   Two parallel buttons "Progreso leído"/"Progreso escuchado" with their respective % below
// For non-book/audiobook items, fall back to the original single ug button.

const oldBlock = 'Lo(a)&&r.createElement(r.Fragment,null,r.createElement("div",{className:"mt-3 text-sm btn",onClick:de(ke().mark((function e(){return ke().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:un({mediaItemId:a.id,progress:1});case 1:case"end":return e.stop()}}),e)})))},Io(a)&&r.createElement(Xe,{id:"I finished watching it"}),Do(a)&&r.createElement(Xe,{id:"I finished reading it"}),jo(a)&&r.createElement(Xe,{id:"I finished listening it"}),Ao(a)&&r.createElement(Xe,{id:"I finished playing it"})),r.createElement("div",{className:"mt-3"},r.createElement(Xe,{id:"Progress"}),":"," ",Math.round(100*a.progress),"%")),r.createElement("div",{className:"mt-3"},r.createElement(ug,{mediaItem:a}))';

const newBlock =
  // For book/audiobook: two parallel columns with their own progress %
  // (The "Marcar como completado" button is rendered as part of the action grid above by patch_sidebar_grid.js)
  // The progress text was previously gated by `!a.seen` so it disappeared after
  // first completion; this hid re-read / re-listen progress entirely. Now we
  // show it whenever the underlying field is strictly between 0 and 1 (a
  // re-read/re-listen in flight) — at exact 1 we hide it because the
  // "Marcar como completado" button + green badge already convey completion.
  '(Do(a)||jo(a))?r.createElement("div",{style:{display:"flex",gap:"0.5rem",marginTop:"0.75rem"}},' +
    'r.createElement("div",{style:{flex:"1"}},' +
      'r.createElement(mo,{openModal:function(open){return r.createElement("div",{className:"text-sm text-green-500 btn",onClick:function(){return open()}},"Progreso leído")}},function(close){return r.createElement(Rp,{mediaItem:a,closeModal:close,mode:"read"})}),' +
      '(a.progress!=null&&a.progress>0&&a.progress<1)&&r.createElement("div",{className:"text-xs mt-1"},"Progreso: ",Math.round(100*a.progress),"%")' +
    '),' +
    'r.createElement("div",{style:{flex:"1"}},' +
      'r.createElement(mo,{openModal:function(open){return r.createElement("div",{className:"text-sm text-green-500 btn",onClick:function(){return open()}},"Progreso escuchado")}},function(close){return r.createElement(Rp,{mediaItem:a,closeModal:close,mode:"listen"})}),' +
      '(a.audioProgress!=null&&a.audioProgress>0&&a.audioProgress<1)&&r.createElement("div",{className:"text-xs mt-1"},"Progreso: ",Math.round(100*a.audioProgress),"%")' +
    ')' +
  '):r.createElement("div",{className:"mt-3"},r.createElement(ug,{mediaItem:a}))';

// New marker (v2) detects the fix that lets re-read/re-listen progress show
// after first completion. v1 (with `(!a.seen)` gate) is recognized and bumped.
const v2Marker = 'a.audioProgress!=null&&a.audioProgress>0&&a.audioProgress<1';
const v1Pattern = '(!a.seen)&&r.createElement("div",{className:"text-xs mt-1"},"Progreso: ",Math.round(100*(a.progress||0)),"%")';

if (c.includes(v2Marker)) {
  console.log('audio-progress frontend: already at v2 (re-read/re-listen progress visible)');
} else if (c.includes(v1Pattern)) {
  // Upgrade v1 → v2 in place: rebuild the inner block by re-running the
  // replacement assuming oldBlock was the original. We reconstruct the v1
  // shape from the current block bounds and replace with v2.
  const v1Block = oldBlock.replace(/Lo\(a\).*$/s, '').slice(0); // unused; just use direct strings:
  const v1Read = '(!a.seen)&&r.createElement("div",{className:"text-xs mt-1"},"Progreso: ",Math.round(100*(a.progress||0)),"%")';
  const v2Read = '(a.progress!=null&&a.progress>0&&a.progress<1)&&r.createElement("div",{className:"text-xs mt-1"},"Progreso: ",Math.round(100*a.progress),"%")';
  const v1Listen = '(!a.seen)&&r.createElement("div",{className:"text-xs mt-1"},"Progreso: ",Math.round(100*(a.audioProgress||0)),"%")';
  const v2Listen = '(a.audioProgress!=null&&a.audioProgress>0&&a.audioProgress<1)&&r.createElement("div",{className:"text-xs mt-1"},"Progreso: ",Math.round(100*a.audioProgress),"%")';
  c = c.replace(v1Read, v2Read).replace(v1Listen, v2Listen);
  console.log('audio-progress frontend: bumped v1 → v2 (re-read/re-listen progress visible)');
} else if (!c.includes(oldBlock)) {
  console.error('audio-progress frontend: anchor block not found');
  process.exit(1);
} else {
  c = c.replace(oldBlock, newBlock);
  console.log('audio-progress frontend: replaced sidebar block with two parallel progress buttons (v2)');
}

fs.writeFileSync(bundlePath, c);
