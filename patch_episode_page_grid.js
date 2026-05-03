const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Restructure individual episode page (PS) into a grid:
//   Row 1: [Visto (Yp)]                [No visto ($p)]
//   Row 2: [Añadir episodio a la lista (Gp)]  full-width
//   Row 3: [Progreso (opens Rp modal targeting this episode)]  full-width

const oldBlock = 'r.createElement("div",{className:"mt-3"},r.createElement(Gp,{mediaItemId:o.id,episodeId:s.id})),(Wo(s)||!No(o))&&r.createElement(r.Fragment,null,r.createElement("div",{className:"mt-3"},r.createElement(Yp,{mediaItem:o,episode:s})),Kp(s)&&r.createElement("div",{className:"mt-3"},r.createElement($p,{mediaItem:o,episode:s})))';

const newBlock =
  'r.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginTop:"0.75rem",alignItems:"center"}},' +
    // Row 1
    '(Wo(s)||!No(o))?r.createElement(Yp,{mediaItem:o,episode:s}):r.createElement("div"),' +
    'Kp(s)?r.createElement($p,{mediaItem:o,episode:s}):r.createElement("div"),' +
    // Row 2: Añadir a lista takes full width
    'r.createElement("div",{style:{gridColumn:"1 / -1"}},r.createElement(Gp,{mediaItemId:o.id,episodeId:s.id})),' +
    // Row 3: Per-episode Progreso button — opens the same Rp modal as the
    // show-level button, targeting this episode (Rp uses e.episode when set).
    'r.createElement("div",{style:{gridColumn:"1 / -1"}},r.createElement(mo,{openModal:function(open){return r.createElement("div",{className:"text-sm text-green-500 btn",onClick:function(){return open()}},"Progreso")}},function(close){return r.createElement(Rp,{mediaItem:o,episode:s,closeModal:close})}))' +
  ')';

if (c.includes('r.createElement(_EP,{episode:s})')) {
  console.log('episode page grid: already patched');
} else if (!c.includes(oldBlock)) {
  console.error('episode page grid: anchor block not found');
  process.exit(1);
} else {
  c = c.replace(oldBlock, newBlock);
  console.log('episode page grid: replaced PS bottom block with 2x2 grid');
}

fs.writeFileSync(bundlePath, c);
