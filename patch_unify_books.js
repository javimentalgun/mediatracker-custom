// Backend: when querying mediaType='book', also include 'audiobook' (unified tab)
const fs = require('fs');
const path = '/app/build/knex/queries/items.js';
let c = fs.readFileSync(path, 'utf8');

const old = "if (mediaType) {\n      query.andWhere('mediaItem.mediaType', mediaType);\n    }";
const fresh = "if (mediaType) {\n      if (mediaType === 'book') { query.whereIn('mediaItem.mediaType', ['book','audiobook']); }\n      else { query.andWhere('mediaItem.mediaType', mediaType); }\n    }";

if (c.includes(fresh)) {
  console.log('unify books: backend already patched');
} else if (!c.includes(old)) {
  console.error('unify books: anchor not found in items.js'); process.exit(1);
} else {
  c = c.replace(old, fresh);
  fs.writeFileSync(path, c);
  console.log('unify books: backend query now returns book+audiobook for mediaType=book');
}
