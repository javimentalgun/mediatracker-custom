const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Add a "playing" indicator in top-right for video games that have progress but are not yet completed.
// Sibling to the existing seen-check element. Renders only when: video_game AND has progress AND not seen.
// Anchor must include the exact paren count after position patch (5 close parens).
const anchor = '"check_circle_outline"))))),m&&Wo(t)';
const playingElem = ',Ao(t)&&t.progress>0&&!t.seen&&r.createElement("div",{className:"absolute inline-flex pointer-events-auto foo top-1 right-1"},r.createElement(Fv,null,r.createElement("i",{className:"flex text-white select-none material-icons",title:"Jugando"},"play_circle_outline")))';

if (c.includes('"play_circle_outline"')) {
  console.log('game playing: already patched');
} else if (!c.includes(anchor)) {
  console.error('game playing: anchor not found'); process.exit(1);
} else {
  c = c.replace(anchor, '"check_circle_outline")))))' + playingElem + ',m&&Wo(t)');
  console.log('game playing: added play_circle_outline indicator for games with progress not yet completed');
}

fs.writeFileSync(bundlePath, c);
