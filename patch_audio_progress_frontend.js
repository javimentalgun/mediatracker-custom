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
  '(Do(a)||jo(a))?r.createElement("div",{style:{display:"flex",gap:"0.5rem",marginTop:"0.75rem"}},' +
    'r.createElement("div",{style:{flex:"1"}},' +
      'r.createElement(mo,{openModal:function(open){return r.createElement("div",{className:"text-sm text-green-500 btn",onClick:function(){return open()}},"Progreso leído")}},function(close){return r.createElement(Rp,{mediaItem:a,closeModal:close,mode:"read"})}),' +
      '(!a.seen)&&r.createElement("div",{className:"text-xs mt-1"},"Progreso: ",Math.round(100*(a.progress||0)),"%")' +
    '),' +
    'r.createElement("div",{style:{flex:"1"}},' +
      'r.createElement(mo,{openModal:function(open){return r.createElement("div",{className:"text-sm text-green-500 btn",onClick:function(){return open()}},"Progreso escuchado")}},function(close){return r.createElement(Rp,{mediaItem:a,closeModal:close,mode:"listen"})}),' +
      '(!a.seen)&&r.createElement("div",{className:"text-xs mt-1"},"Progreso: ",Math.round(100*(a.audioProgress||0)),"%")' +
    ')' +
  '):r.createElement("div",{className:"mt-3"},r.createElement(ug,{mediaItem:a}))';

if (c.includes('"Marcar como completado"') && c.includes('"Progreso leído"') && c.includes('"Progreso escuchado"')) {
  console.log('audio-progress frontend: already patched');
} else if (!c.includes(oldBlock)) {
  console.error('audio-progress frontend: anchor block not found');
  process.exit(1);
} else {
  c = c.replace(oldBlock, newBlock);
  console.log('audio-progress frontend: replaced sidebar block with two parallel progress buttons');
}

fs.writeFileSync(bundlePath, c);
