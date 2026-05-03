const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Card progress bar:
//   Movies/Books/Audiobooks/Games: from `t.progress` (per-mediaItem)
//   TV: from `t.firstUnwatchedEpisode.progress` (per current episode)
const old = 'Lo(t)&&r.createElement(r.Fragment,null,r.createElement("div",{className:"w-full h-2 mt-1 rounded bg-slate-300"},r.createElement("div",{className:"h-full rounded bg-slate-900",style:{width:"".concat(100*t.progress,"%")}})))';

// Pick the right progress source per mediaType:
//   audiobook → t.audioProgress
//   tv        → firstUnwatchedEpisode.progress
//   else      → t.progress
const PROG = '(jo(t)?(t.audioProgress||0):Ro(t)?((t.firstUnwatchedEpisode&&t.firstUnwatchedEpisode.progress)||0):(t.progress||0))';
// Show bar + Progreso button whenever the item has unfinished progress OR
// hasn't been seen yet. For non-TV items the user may also start a re-watch
// after completing it, so an active in-flight progress (0 < PROG < 1) makes
// the bar reappear even if t.seen is true.
//   TV     → has unwatched episodes
//   non-TV → not seen yet, OR re-watch in progress (0 < PROG < 1)
const HAS = '(Ro(t)?Boolean(t.firstUnwatchedEpisode):(!t.seen||(' + '(jo(t)?(t.audioProgress||0):(t.progress||0))' + '>0&&' + '(jo(t)?(t.audioProgress||0):(t.progress||0))' + '<1)))';

const patched = HAS + '&&r.createElement(r.Fragment,null,r.createElement("div",{className:"flex items-center justify-between mt-1"},' +
  'r.createElement("span",{className:"text-xs text-gray-400"},Math.round(100*' + PROG + '),"%"),' +
  '(Do(t)||jo(t)||Ao(t)||Io(t)||Ro(t))&&r.createElement(ug,{mediaItem:t})),' +
  'r.createElement("div",{className:"w-full h-2 mt-1 rounded bg-slate-300"},r.createElement("div",{className:"h-full rounded bg-slate-900",style:{width:"".concat(100*' + PROG + ',"%")}})))';

if (c.includes(patched)) { console.log('progress_card: already patched'); process.exit(0); }
if (!c.includes(old)) { console.error('progress_card: anchor not found'); process.exit(1); }

c = c.replace(old, patched);
fs.writeFileSync(bundlePath, c);
console.log('progress_card: added % text + Set Progress button on card');
