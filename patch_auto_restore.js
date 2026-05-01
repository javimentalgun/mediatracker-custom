const fs = require('fs');
const path = '/docker/entrypoint.sh';
let c = fs.readFileSync(path, 'utf8');

if (c.includes('# auto-restore-from-backup')) { console.log('auto-restore: already patched'); process.exit(0); }

// Insert restore logic right before the chown lines (so /storage exists but no DB yet).
// If /storage/data.db is missing, copy the most recent /storage/backups/data-*.db to /storage/data.db.
const inject = `
# auto-restore-from-backup: si arrancas en limpio (volumen nuevo, /storage/data.db ausente),
# coge el backup más reciente automáticamente. Disaster recovery sin intervención.
if [ ! -f /storage/data.db ] && [ -d /storage/backups ]; then
  LATEST=$(ls -1t /storage/backups/data-*.db 2>/dev/null | head -1)
  if [ -n "$LATEST" ]; then
    echo "auto-restore: /storage/data.db ausente, restaurando desde $LATEST"
    cp "$LATEST" /storage/data.db
    rm -f /storage/data.db-wal /storage/data.db-shm
    chmod 644 /storage/data.db
  else
    echo "auto-restore: no hay backups disponibles, MT arrancará con BD vacía"
  fi
fi

`;

const anchor = 'chown -R abc:abc /storage';
if (!c.includes(anchor)) { console.error('auto-restore: anchor not found'); process.exit(1); }
c = c.replace(anchor, inject + anchor);
fs.writeFileSync(path, c);
console.log('auto-restore: entrypoint hooked');
