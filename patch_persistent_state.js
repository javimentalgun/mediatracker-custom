// Persistence + visibility tweaks across the SPA:
//
//   1. Page title (header `<span>{name}</span>` in ny) was wrapped in
//      `md:hidden` so it only showed on mobile. Make it visible everywhere
//      so the user always sees which section they're on.
//   2. _Section open/closed state on /in-progress, /abandonados, /downloaded
//      is per-mount React state, so it resets every time the user navigates
//      back from a detail/episode page. Persist it in sessionStorage keyed by
//      the section label.
//   3. Zv (the items grid) only persists `page` to URL search params; the
//      sort, filter, and orderBy dropdowns live in component state and reset
//      on back-navigation. Mirror them to URL search params so back/refresh
//      preserves them.

const fs = require('fs');
const child = require('child_process');
const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const marker = '/*mt-fork:persistent-state*/';
if (c.includes(marker)) {
  console.log('persistent-state: already patched');
  process.exit(0);
}

// === 1. Remove the in-nav page-title block entirely ===
// Original mediatracker rendered `<div className="md:hidden">{currentPagePathName}</div>`
// in ny() so on mobile the user could see which page they were on. We removed
// it: on desktop the hamburger menu + URL identifies the section just fine,
// and showing "Abandonados" / "Pendiente" / etc. to the right of the top nav
// items is undesired UX (looks like a top-nav entry).
//
// Anchor structure (upstream): the page-title div is preceded by `,` and
// followed by `,r.createElement("div",{className:"inline-flex ml-auto…"`
// (the user dropdown / theme toggle column). Slice from the comma before
// `r.createElement("div",{className:"md:hidden"}` through the matching close
// of that createElement.
{
  const startMarker = ',r.createElement("div",{className:"md:hidden"},r.createElement("div",{className:"flex flex-col md:flex-row"},m.filter((function(e){return e.path===c.pathname';
  const startIdx = c.indexOf(startMarker);
  if (startIdx < 0) {
    console.error('persistent-state: page title md:hidden anchor not found'); process.exit(1);
  }
  // Block ends with `e.name)})))` followed by a top-level `,r.createElement(`
  // (the next sibling — the user dropdown column).
  const endMarker = 'e.name)}))))';
  const endIdx = c.indexOf(endMarker, startIdx);
  if (endIdx < 0) {
    console.error('persistent-state: page title end marker not found'); process.exit(1);
  }
  c = c.slice(0, startIdx) + c.slice(endIdx + endMarker.length);
  console.log('persistent-state: removed in-nav page-title block (no more "Abandonados" right of YouTube)');
}

// === 2. _Section open/closed in sessionStorage ===
// All 3 sectioned pages (_IPS, _ABS, _DLP) define _Section the same way:
//   var st=r.useState(false),open=st[0],setOpen=st[1];
// Replace with a wrapper that reads/writes sessionStorage per section label.
//
// Caveat: this useState pattern also appears inside `_GamesSection` (the
// "Juegos" wrapper in _IPS), which is declared as `function()` — no `props`
// arg. A naive `props.label` reference there throws ReferenceError on every
// render of /in-progress, blanking the page. Use a typeof-guarded fallback so
// the same replacement is safe whether or not `props` is in scope.
{
  const old = 'var st=r.useState(false),open=st[0],setOpen=st[1];';
  const fresh =
    "var _secKey='mt_sec_'+String((typeof props!=='undefined'&&props&&props.label)||'_section');" +
    "var _secInit=(function(){try{return sessionStorage.getItem(_secKey)==='1'}catch(_){return false}})();" +
    "var st=r.useState(_secInit),open=st[0],_secSetOpen=st[1];" +
    "var setOpen=function(v){try{sessionStorage.setItem(_secKey,v?'1':'0')}catch(_){}_secSetOpen(v)};";
  const occurrences = c.split(old).length - 1;
  if (occurrences === 0) {
    console.error('persistent-state: _Section useState anchor not found'); process.exit(1);
  }
  c = c.split(old).join(fresh);
  console.log('persistent-state: persisted ' + occurrences + ' _Section open states in sessionStorage');
}

// === 3. Zv: sort / order / filter / page persisted in URL ===
// SUB-ZV BAILOUT: when Zv is rendered as a sub-grid (e.g. inside _GVS for the
// games "Visto" split view) it carries marker args (onlyJustWatched, or both
// onlyWatched+onlyPlayed). Such instances must NOT read from or write to the
// URL — the parent page already owns those params, and inheriting them would
// cause page-out-of-range errors and filter recursion. `_subZv` factors out
// that condition for reuse below.
//
// We declare _subZv inline as a comma-list element next to the existing var
// chain so it lives in Zv's scope.

// 3a. Initial sortOrder reads from URL (skipped for sub-Zv).
{
  const old = '(0,r.useState)(e.sortOrder)';
  const fresh = "(0,r.useState)(((e&&(e.onlyJustWatched||e.onlyPlayed||e.onlyWatched))?null:(g&&g.get&&g.get('sortOrder')))||e.sortOrder)";
  if (!c.includes(old)) {
    console.error('persistent-state: Zv sortOrder useState anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
  console.log('persistent-state: Zv sortOrder reads from URL (sub-Zv exempt)');
}

// 3b. Initial orderBy (lookup in `o` dict).
{
  const old = 'Gv({values:l,initialSelection:o[e.orderBy]})';
  const fresh = "Gv({values:l,initialSelection:o[((e&&(e.onlyJustWatched||e.onlyPlayed||e.onlyWatched))?null:(g&&g.get&&g.get('orderBy')))]||o[e.orderBy]})";
  if (!c.includes(old)) {
    console.error('persistent-state: Zv orderBy Gv anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
  console.log('persistent-state: Zv orderBy reads from URL (sub-Zv exempt)');
}

// 3c. Initial filter (lookup in `a` dict).
{
  const old = 'Gv({values:Object.values(a),initialSelection:a.all})';
  const fresh = "Gv({values:Object.values(a),initialSelection:a[((c&&(c.onlyJustWatched||c.onlyPlayed||c.onlyWatched))?null:(g&&g.get&&g.get('filter')))]||a.all})";
  if (!c.includes(old)) {
    console.error('persistent-state: Zv filter Gv anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
  console.log('persistent-state: Zv filter reads from URL (sub-Zv exempt)');
}

// 3d. Page useState — sub-Zv MUST start at 1 to avoid "Invalid page number"
//     when the parent's URL says ?page=N but the sub-list has fewer pages.
{
  const old = 'r.useState)(Number(null==g?void 0:g.get("page"))||1)';
  const fresh = 'r.useState)((c&&(c.onlyJustWatched||c.onlyPlayed||c.onlyWatched))?1:(Number(null==g?void 0:g.get("page"))||1))';
  if (!c.includes(old)) {
    console.error('persistent-state: Zv page useState anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
  console.log('persistent-state: Zv page reads from URL (sub-Zv starts at 1)');
}

// 3e. Mirror state changes to URL via the existing useEffect that fires on
//     [S, x, JSON.stringify(W)]. {replace:true} so changing filter/sort
//     replaces the current history entry. Sub-Zv skip the write entirely.
{
  const old = '(0,r.useEffect)((function(){1!==E&&D(1)}),[S,x,JSON.stringify(W)])';
  const fresh =
    '(0,r.useEffect)((function(){' +
      '1!==E&&D(1);' +
      'if(c&&(c.onlyJustWatched||c.onlyPlayed||c.onlyWatched))return;' +
      'try{' +
        'var cur=Object.fromEntries(g.entries());' +
        'if(S)cur.orderBy=S;else delete cur.orderBy;' +
        'if(x)cur.sortOrder=x;else delete cur.sortOrder;' +
        "var fk=Object.keys(W).find(function(k){return W[k]});" +
        "if(fk&&fk!=='all')cur.filter=fk;else delete cur.filter;" +
        'v(cur,{replace:true});' +
      '}catch(_){}' +
    '}),[S,x,JSON.stringify(W)])';
  if (!c.includes(old)) {
    console.error('persistent-state: Zv useEffect anchor not found'); process.exit(1);
  }
  c = c.replace(old, fresh);
  console.log('persistent-state: Zv state changes mirrored to URL (sub-Zv exempt, replace not push)');
}

// Place the marker at the start so the idempotency check works on rebuilds.
c = marker + c;
fs.writeFileSync(bundlePath, c);
console.log('persistent-state: complete');
