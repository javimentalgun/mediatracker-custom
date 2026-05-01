const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Remove the Audiobooks menu entry (the /books tab will now include audiobooks)
const old = '{path:"/books",name:xo._("Books")},{path:"/audiobooks",name:xo._("Audiobooks")}';
const fresh = '{path:"/books",name:xo._("Books")}';

if (!c.includes(old)) {
  console.log('unify books frontend: menu already patched (or anchor not found)');
} else {
  c = c.replace(old, fresh);
  console.log('unify books frontend: removed Audiobooks menu entry');
}

fs.writeFileSync(bundlePath, c);
