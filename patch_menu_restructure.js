const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Main menu (ty): remove Watchlist, Import, Backup
//    Watchlist still accessible via Lists page (it IS a list).
//    Import / Backup move to Settings menu.
const tyOld = '{path:"/watchlist",name:xo._("Watchlist")},{path:"/calendar",name:xo._("Calendar")},{path:"/import",name:xo._("Import")},{path:"/lists",name:xo._("Lists")},{path:"/backup",name:xo._("Backup")}';
const tyNew = '{path:"/calendar",name:xo._("Calendar")},{path:"/lists",name:xo._("Lists")}';
if (c.includes(tyNew) && !c.includes(tyOld)) {
  console.log('menu restructure: ty already patched');
} else if (!c.includes(tyOld)) {
  console.error('menu restructure: ty anchor not found');
  process.exit(1);
} else {
  c = c.replace(tyOld, tyNew);
  console.log('menu restructure: removed Watchlist/Import/Backup from main menu');
}

// 2. Settings menu (Dy): add Import and Backup at the end
const dyOld = 'oy(e.admin?[{path:"configuration",name:xo._("Configuration")},{path:"logs",name:xo._("Logs")}]:[])';
const dyNew = 'oy(e.admin?[{path:"configuration",name:xo._("Configuration")},{path:"logs",name:xo._("Logs")}]:[]),[{path:"/import",name:"Importar"},{path:"/backup",name:"Backup"}]';
if (c.includes(dyNew)) {
  console.log('menu restructure: Dy already patched');
} else if (!c.includes(dyOld)) {
  console.error('menu restructure: Dy anchor not found');
  process.exit(1);
} else {
  c = c.replace(dyOld, dyNew);
  console.log('menu restructure: added Importar/Backup to settings menu');
}

fs.writeFileSync(bundlePath, c);
console.log('menu restructure: complete');
