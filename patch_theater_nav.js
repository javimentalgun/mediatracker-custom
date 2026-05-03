// Add a "Teatro" (theater) section as a first-class mediaType, integrated like
// movies/tv/games/books. Top nav entry sits left of YouTube.
//
// Edits in this single patch:
//   1. ty() menu — add {path:"/theater", name: xo._("Theater")} just before
//      the /youtube entry.
//   2. Top-nav inclusion filter ["/","/tv","/movies","/games","/books","/youtube"]
//      — add "/theater" so the entry actually renders in the horizontal nav.
//   3. Title-filter mirror (same array, used to hide the page-title duplicate
//      for top-nav routes).
//   4. Route registration — add `<Q path="/theater" element=ey({mediaType:"theater"})>`
//      right before the /youtube route. Reuses ey() (the generic Zv wrapper),
//      same as movie/tv/games/books.
//   5. Predicate Tt (is theater) defined alongside existing Ao/Ro/Io/Do/jo
//      predicates, for future use in filters and badges.
//   6. mediaType label dictionary in _v: add `theater: xo._("Theater")`.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:theater-nav*/';
if (c.includes(marker)) {
  console.log('theater nav: already patched');
  process.exit(0);
}

// 1. Menu list (ty): insert {path:"/theater",...} before /youtube entry.
{
  const old = '{path:"/youtube",name:"YouTube"}]},ny=function';
  const fresh = '{path:"/theater",name:xo._("Theater")},{path:"/youtube",name:"YouTube"}]},ny=function';
  if (!c.includes(old)) {
    console.error('theater nav: ty() /youtube anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
}

// 2. Top-nav inclusion filter — add "/theater" before "/youtube".
// Two occurrences of the literal array (same content, different uses).
{
  const old = '["/","/tv","/movies","/games","/books","/youtube"]';
  const fresh = '["/","/tv","/movies","/games","/books","/theater","/youtube"]';
  const occ = c.split(old).length - 1;
  if (occ === 0) {
    console.error('theater nav: top-nav array anchor not found'); process.exit(1);
  }
  c = c.split(old).join(fresh);
  console.log('theater nav: added /theater to top-nav array (' + occ + ' occurrences)');
}

// 3. Routes: add <Q path="/theater" element=ey()> before the /youtube route.
{
  const old = 'r.createElement(Q,{path:"/youtube",element:r.createElement(_YT,null)})';
  const fresh = 'r.createElement(Q,{path:"/theater",element:r.createElement(ey,{key:"/theater",mediaType:"theater"})}),' + old;
  if (!c.includes(old)) {
    console.error('theater nav: /youtube route anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
}

// 4. mediaType label dict in _v card. Anchor on the existing object literal.
{
  const old = 'w={audiobook:xo._("Audiobook"),book:xo._("Book"),movie:xo._("Movie"),tv:xo._("Tv"),video_game:xo._("Video game")}';
  const fresh = 'w={audiobook:xo._("Audiobook"),book:xo._("Book"),movie:xo._("Movie"),tv:xo._("Tv"),video_game:xo._("Video game"),theater:xo._("Theater")}';
  if (!c.includes(old)) {
    console.error('theater nav: _v mediaType dict anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
}

// 5. Tt predicate (mirrors Io/Ao/Ro/Do/jo). Insert right after Io.
{
  const old = 'Io=function(e){return"string"==typeof e?"movie"===e:"movie"===(null==e?void 0:e.mediaType)},';
  const tt = 'Tt=function(e){return"string"==typeof e?"theater"===e:"theater"===(null==e?void 0:e.mediaType)},';
  if (!c.includes(old)) {
    console.error('theater nav: Io predicate anchor not found'); process.exit(1);
  }
  c = c.replace(old, old + tt);
}

c = marker + c;
fs.writeFileSync(bundlePath, c);
console.log('theater nav: complete (menu + top-nav + route + label + predicate)');
