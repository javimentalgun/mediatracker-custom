const fs = require('fs');
const child = require('child_process');

// Render two lines in the homepage video_game summary:
//   line 1: "(N juegos) Xh Ym jugando"  → distinct kind=played
//   line 2: "(M juegos) Xh Ym viendo"   → distinct kind=watched
// Counts and minutes come from playedItems/playedDuration/watchedItems/watchedDuration
// computed in patch_stats_distinct_game_runtime.js. Cp formats milliseconds.

const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:games-hours*/';
if (c.includes(marker)) {
  console.log('homepage games hours: already patched');
  process.exit(0);
}

// Anchor: the entire "(<1>{1}</1> plays)" element for video_game.
// Replace with two lines: "(N juegos) Xh Ym jugando" and "(M juegos) Xh Ym viendo".
const oldFrag = 'r.createElement("div",null,r.createElement(Xe,{id:"<0>{0}</0> video games (<1>{1}</1> plays)",values:{0:o.video_game.items,1:o.video_game.plays},components:{0:r.createElement("b",null),1:r.createElement("b",null)}}))';
const newFrag = marker +
  'r.createElement(r.Fragment,null,' +
    'r.createElement("div",null,"(",r.createElement("b",null,o.video_game.playedItems||0)," juegos) ",r.createElement(Cp,{milliseconds:60*(o.video_game.playedDuration||0)*1e3})," jugando"),' +
    'r.createElement("div",null,"(",r.createElement("b",null,o.video_game.watchedItems||0)," juegos) ",r.createElement(Cp,{milliseconds:60*(o.video_game.watchedDuration||0)*1e3})," viendo")' +
  ')';

if (!c.includes(oldFrag)) {
  console.error('homepage games hours: anchor not found (upstream may have changed the summary block)');
  process.exit(1);
}

c = c.replace(oldFrag, newFrag);

// Also remove the upstream "Xh playing" line that sits between the "Games"
// header and our two new lines. It's redundant now (our "(N juegos) Xh jugando"
// already tells you the playing time) and the user explicitly asked to drop it.
const playingLine = 'r.createElement("div",{className:"whitespace-nowrap"},r.createElement(Xe,{id:"<0><1/> </0>playing",components:{0:r.createElement("b",null),1:r.createElement(Cp,{milliseconds:60*o.video_game.duration*1e3})}})),';
if (c.includes(playingLine)) {
  c = c.replace(playingLine, '');
  console.log('homepage games hours: removed upstream "Xh playing" line');
} else {
  console.log('homepage games hours: "Xh playing" line not found (already removed?)');
}

fs.writeFileSync(bundlePath, c);
console.log('homepage games hours: replaced "(N plays)" with two lines (jugando/viendo)');
