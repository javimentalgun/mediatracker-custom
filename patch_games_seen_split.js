// On /games, when the filter dropdown is "Visto" (onlyWatched), replace the
// flat grid with two collapsible sections that together cover *everything*
// the user has seen in any way:
//   - "Solo vistos"       — kind=watched AND NOT kind=played
//   - "Vistos y jugados"  — kind=played (anything completed; if also watched, fine)
//
// User intent (2026-05-02): "en ese desplegable tiene que aparecer todo lo
// jugado y todo lo visto". The earlier scoping of section 2 to the strict
// intersection (kind=watched AND kind=played) hid every game that was only
// marked completed — they had no home in the Visto dropdown.
//
// Implementation: inject a _GVS component before _v that defines the two
// sub-sections (each renders its own Zv with the right args). Then patch
// Zv's render to short-circuit to _GVS when c.mediaType==='video_game' and
// the active filter key is onlyWatched.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:games-seen-split*/';
if (c.includes(marker)) {
  console.log('games-seen-split: already patched');
  process.exit(0);
}

// === 1. _GVS component definition (mirrors _ABS layout) ===
// Defined as part of the comma-chain that holds _AB, _AIP, _v — so it ends in
// a trailing comma and contains no `;`.
const gvsDef =
  '_GVS=function(){' +
    'var _Section=function(props){' +
      "var _key='mt_gvs_'+String(props.label||'');" +
      "var _init=(function(){try{return sessionStorage.getItem(_key)!=='0'}catch(_){return true}})();" +
      'var st=r.useState(_init),open=st[0],_set=st[1];' +
      "var setOpen=function(v){try{sessionStorage.setItem(_key,v?'1':'0')}catch(_){}_set(v)};" +
      'return r.createElement("div",{className:"mb-3 border border-slate-300 dark:border-slate-700 rounded overflow-hidden"},' +
        'r.createElement("button",{onClick:function(){setOpen(!open)},className:"w-full text-left text-xl font-semibold px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2"},' +
          'r.createElement("i",{className:"material-icons"},open?"expand_more":"chevron_right"),' +
          'props.label' +
        '),' +
        'open&&r.createElement("div",{className:"p-2"},' +
          'r.createElement(Zv,{args:Object.assign({orderBy:"title",sortOrder:"asc"},props.args),showSortOrderControls:!1,showSearch:!1,gridItemAppearance:{}})' +
        ')' +
      ')' +
    '};' +
    'return r.createElement("div",{className:"p-2"},' +
      'r.createElement(_Section,{label:xo._("Just watched"),args:{mediaType:"video_game",onlyJustWatched:!0}}),' +
      'r.createElement(_Section,{label:xo._("Watched and played"),args:{mediaType:"video_game",onlyPlayed:!0}})' +
    ')' +
  '},';

// Inject before _v (same anchor used by other custom comma-chain components).
const compAnchor = '_v=function(e){';
if (!c.includes(compAnchor)) {
  console.error('games-seen-split: _v anchor not found'); process.exit(1);
}
c = c.replace(compAnchor, gvsDef + compAnchor);

// === 2. Short-circuit Zv render to _GVS when on /games + filter=Visto ===
// Anchor on the existing items map. The full render fragment is:
//   null===(t=w?H:A)||void 0===t?void 0:t.map((function(e){return r.createElement(_v,...)}))
// Wrap it with a ternary so the split view replaces the grid (and only the grid)
// for the games + onlyWatched case.
const renderAnchor = 'null===(t=w?H:A)||void 0===t?void 0:t.map((function(e){return r.createElement(_v,';
if (!c.includes(renderAnchor)) {
  console.error('games-seen-split: Zv render anchor not found'); process.exit(1);
}
// Gate: switch to split view ONLY for the top-level games grid with filter=Visto
// AND no active search. When the user types in the search box (`w` truthy), fall
// through to the normal grid so search results show. Also bail in any sub-Zv
// instance (args carry onlyJustWatched / onlyPlayed / onlyWatched) to avoid
// recursion — each of those flags is set only by _GVS itself.
c = c.replace(
  renderAnchor,
  '(!w&&c.mediaType==="video_game"&&W&&W.onlyWatched&&!c.onlyJustWatched&&!c.onlyPlayed&&!c.onlyWatched)?r.createElement(_GVS,null):' + renderAnchor
);

c = marker + c;
fs.writeFileSync(bundlePath, c);
console.log('games-seen-split: _GVS injected and Zv render gated on /games filter=Visto');
