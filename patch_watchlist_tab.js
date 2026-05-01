const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Add a separate "Watchlist" entry to ty() right after Lists (uses MT's built-in i18n key)
const oldTy = '{path:"/lists",name:xo._("Lists")}]';
const newTy = '{path:"/lists",name:xo._("Lists")},{path:"/watchlist",name:xo._("Watchlist")}]';
if (c.includes(newTy)) {
  console.log('watchlist tab: already in menu');
} else if (!c.includes(oldTy)) {
  console.error('watchlist tab: ty() anchor not found'); process.exit(1);
} else {
  c = c.replace(oldTy, newTy);
  console.log('watchlist tab: added /watchlist entry after Lists');
}

// 2. In the lists page (SS), filter OUT the watchlist (it has its own tab now)
const oldSlice = 'i.slice().sort(function(x,y){return (y.isWatchlist?1:0)-(x.isWatchlist?1:0)})';
const newSlice = 'i.filter(function(e){return !e.isWatchlist})';
if (c.includes(newSlice)) {
  console.log('watchlist tab: SS already filters watchlist');
} else if (!c.includes(oldSlice)) {
  console.log('watchlist tab: SS slice anchor not found (skipping)');
} else {
  c = c.replace(oldSlice, newSlice);
  console.log('watchlist tab: SS no longer shows watchlist (it has its own tab)');
}

fs.writeFileSync(bundlePath, c);
console.log('watchlist tab: complete');
