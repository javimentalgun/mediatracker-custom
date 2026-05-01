const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Always show "X playing" line under "Juegos" stats, even when duration is 0
const old = 'o.video_game.duration>0&&r.createElement("div",{className:"whitespace-nowrap"},r.createElement(Xe,{id:"<0><1/> </0>playing"';
const fresh = 'r.createElement("div",{className:"whitespace-nowrap"},r.createElement(Xe,{id:"<0><1/> </0>playing"';

if (c.includes('jugando":"')) {
  // Verify duration line exists then remove the >0 gate
}

if (c.includes(fresh) && !c.includes(old)) {
  console.log('games total time: already always shown');
} else if (!c.includes(old)) {
  console.error('games total time: anchor not found'); process.exit(1);
} else {
  c = c.replace(old, fresh);
  console.log('games total time: duration line now always visible (even when 0)');
}

// Also do the same for video_game data check guarding the whole block — if user has 0 plays but we still want to show,
// the outer block uses (o.video_game.plays)>0. Leave that gating alone (no plays = no card section) unless user wants otherwise.

fs.writeFileSync(bundlePath, c);
