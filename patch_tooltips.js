const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Bookmark (Pendiente) — watchlist toggle icon
const bookmarkOld = 'r.createElement("span",{className:"flex material-icons"},"bookmark")';
const bookmarkNew = 'r.createElement("span",{className:"flex material-icons",title:"En pendientes (clic para quitar)"},"bookmark")';
if (c.includes(bookmarkOld)) {
  c = c.replace(bookmarkOld, bookmarkNew);
  console.log('tooltips: added title to bookmark (Pendiente)');
} else {
  console.log('tooltips: bookmark already has title (or anchor not found)');
}

// 2. Completado / Escuchado — check_circle_outline / music_note seen indicator
const seenOld = 'r.createElement("i",{className:"flex text-white select-none material-icons"},"audiobook"===t.mediaType?"music_note":"check_circle_outline")';
const seenNew = 'r.createElement("i",{className:"flex text-white select-none material-icons",title:"audiobook"===t.mediaType?"Escuchado":"Completado"},"audiobook"===t.mediaType?"music_note":"check_circle_outline")';
if (c.includes(seenOld)) {
  c = c.replace(seenOld, seenNew);
  console.log('tooltips: added title to seen icon (Completado/Escuchado)');
} else {
  console.log('tooltips: seen icon already has title (or anchor not found)');
}

// 3. Favorito — rating stars
const starOld = 'className:Be("material-icons select-none hover:text-yellow-400 text-2xl",(t<h||t<g)&&"text-yellow-400")},t<h&&(!g||t<g)?"star":"star_border"';
const starNew = 'className:Be("material-icons select-none hover:text-yellow-400 text-2xl",(t<h||t<g)&&"text-yellow-400"),title:(t+1)+(t+1===1?" estrella":" estrellas")},t<h&&(!g||t<g)?"star":"star_border"';
if (c.includes(starOld)) {
  c = c.replace(starOld, starNew);
  console.log('tooltips: added title to rating stars (Favorito)');
} else {
  console.log('tooltips: stars already have title (or anchor not found)');
}

fs.writeFileSync(bundlePath, c);
console.log('tooltips: complete');
