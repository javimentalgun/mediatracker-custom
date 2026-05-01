const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Show music_note (top-center) on any item that has audio progress > 0 (book/audiobook with audioProgress)
// regardless of seen state. Keeps the existing top-right check_circle for non-audiobook seen items.
const oldSeen = 's.showUnwatchedEpisodesCount&&1==t.seen&&r.createElement("div",{className:"absolute inline-flex pointer-events-auto foo top-1 "+("audiobook"===t.mediaType?"left-1/2 -translate-x-1/2":"right-1")},r.createElement(Fv,null,r.createElement("i",{className:"flex text-white select-none material-icons",title:"audiobook"===t.mediaType?"Escuchado":"Completado"},"audiobook"===t.mediaType?"music_note":"check_circle_outline")))';

const newSeen =
  // (a) Audiobook seen → music_note at top-CENTER (audiobook seen check replacement)
  '"audiobook"===t.mediaType&&1==t.seen&&r.createElement("div",{className:"absolute inline-flex pointer-events-auto foo top-1",style:{left:"50%",transform:"translateX(-50%)"}},r.createElement(Fv,null,r.createElement("span",{className:"flex material-icons",title:"Escuchado"},"music_note"))),' +
  // (b) Check_circle for completed non-audiobook items at top-right (includes games)
  's.showUnwatchedEpisodesCount&&1==t.seen&&"audiobook"!==t.mediaType&&r.createElement("div",{className:"absolute inline-flex pointer-events-auto foo top-1 right-1"},r.createElement(Fv,null,r.createElement("span",{className:"flex material-icons",title:"Completado"},"check_circle_outline"))),' +
  // (c) Books only: music_note BELOW the completed icon when audioProgress>0
  '"book"===t.mediaType&&t.audioProgress>0&&r.createElement("div",{className:"absolute inline-flex pointer-events-auto foo right-1",style:{top:"3rem"}},r.createElement(Fv,null,r.createElement("span",{className:"flex material-icons",title:"Escuchado"},"music_note")))';

if (c.includes('t.audioProgress>0||("audiobook"===t.mediaType&&1==t.seen)')) {
  console.log('audio listened icon: already patched');
} else if (!c.includes(oldSeen)) {
  console.error('audio listened icon: anchor not found');
  process.exit(1);
} else {
  c = c.replace(oldSeen, newSeen);
  console.log('audio listened icon: split seen icon into music_note (top-center, audioProgress>0) + check (top-right, seen+non-audiobook)');
}

fs.writeFileSync(bundlePath, c);
