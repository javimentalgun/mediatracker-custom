const fs = require('fs');
const path = '/app/build/dbconfig.js';
let content = fs.readFileSync(path, 'utf8');

const original = 'useNullAsDefault: true,';
const patched  = 'useNullAsDefault: true, pool: { afterCreate: function(conn, done) { try { conn.pragma("journal_mode=WAL"); conn.pragma("mmap_size=268435456"); conn.pragma("cache_size=-65536"); conn.pragma("temp_store=MEMORY"); conn.pragma("synchronous=NORMAL"); conn.pragma("foreign_keys=ON"); } catch(e){} done(null,conn); } },';

if (content.includes(patched)) {
  console.log('dbconfig.js: already patched, skipping');
  process.exit(0);
}

if (!content.includes(original)) {
  console.error('dbconfig.js: anchor not found, aborting');
  process.exit(1);
}

fs.writeFileSync(path, content.replace(original, patched));
console.log('dbconfig.js: SQLite performance pragmas applied');
