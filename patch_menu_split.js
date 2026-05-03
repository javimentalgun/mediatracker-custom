const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// User-defined order for the dropdown (NOT the order from ty()). Items not in
// this list are not rendered in the dropdown. patch_downloaded_tab.js and
// patch_abandoned_frontend.js no longer need to extend this list — already here.
const SIDE_PATHS = '["/in-progress","/upcoming","/watchlist","/calendar","/lists","/abandonados","/downloaded"]';
const TOP_PATHS  = '["/","/tv","/movies","/games","/books"]';

// 1. Inject _DD dropdown component (hamburger icon → vertical menu of navigational items)
// /*menu-split-v2*/ marker forces re-injection when the body shape changes (the old
// guard `var _s=r.useState(false)` would match v1 indefinitely). Bump the marker
// when changing _DD's structure.
const compDef = `_DD=function(){/*menu-split-v2*/` +
  `var _s=r.useState(false),_open=_s[0],_setOpen=_s[1];` +
  // Build path→item map from ty(), then render in SIDE_PATHS order (preserves user-chosen ordering).
  `var _byPath={};ty().forEach(function(e){_byPath[e.path]=e});` +
  `var _items=` + SIDE_PATHS + `.map(function(p){return _byPath[p]}).filter(Boolean);` +
  // Per-path tooltip text; resolved through xo._() so patch_i18n_custom can translate.
  `var _tips={` +
    `"/in-progress":xo._("In progress menu desc"),` +
    `"/upcoming":xo._("Upcoming menu desc"),` +
    `"/watchlist":xo._("Watchlist menu desc"),` +
    `"/calendar":xo._("Calendar menu desc"),` +
    `"/lists":xo._("Lists menu desc"),` +
    `"/abandonados":xo._("Dropped menu desc"),` +
    `"/downloaded":xo._("Downloaded menu desc")` +
  `};` +
  `return r.createElement("div",{style:{position:"relative",display:"inline-block",marginRight:"0.5rem"}},` +
    `r.createElement("span",{className:"material-icons cursor-pointer text-2xl",onClick:function(){_setOpen(!_open)}},"menu"),` +
    `_open&&r.createElement("div",{style:{position:"absolute",top:"100%",left:0,zIndex:50,background:"#1e293b",border:"1px solid #475569",borderRadius:"0.25rem",padding:"0.5rem",minWidth:"10rem"},onMouseLeave:function(){_setOpen(false)}},` +
      `_items.map(function(e){` +
        `return r.createElement(oe,{key:e.path,to:e.path,title:_tips[e.path]||"",className:function(o){return Be("block py-1 px-2 text-base whitespace-nowrap text-white hover:bg-slate-700",o.isActive&&"underline font-bold")},onClick:function(){_setOpen(false)}},e.name)` +
      `})` +
    `)` +
  `)` +
`},`;
const cardAnchor = '_v=function(e){';
if (c.includes('/*menu-split-v2*/')) {
  console.log('menu split: _DD v2 already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('menu split: _v anchor for _DD not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('menu split: injected _DD dropdown');
}

// 2. Top nav (ny): render [_DD] + filtered items (Inicio, TV, Pelis, Juegos, Libros)
const oldMap = 'm.filter(function(e){return ["/tv","/movies","/games","/books"].indexOf(e.path)>=0}).map((function(e){return r.createElement("span",{key:e.path,className:"m-1 mr-2 text-xl whitespace-nowrap"},r.createElement(oe,{to:e.path,className:function(e){return Be(e.isActive&&"underline")}},e.name))}))';
const fallbackOldMap = 'm.map((function(e){return r.createElement("span",{key:e.path,className:"m-1 mr-2 text-xl whitespace-nowrap"},r.createElement(oe,{to:e.path,className:function(e){return Be(e.isActive&&"underline")}},e.name))}))';
const newMap = 'r.createElement(r.Fragment,null,r.createElement(_DD,null),m.filter(function(e){return ' + TOP_PATHS + '.indexOf(e.path)>=0}).map((function(e){return r.createElement("span",{key:e.path,className:"m-1 mr-2 text-xl whitespace-nowrap"},r.createElement(oe,{to:e.path,className:function(e){return Be(e.isActive&&"underline")}},e.name))})))';
if (c.includes(newMap)) {
  console.log('menu split: top nav already has _DD + filtered items');
} else if (c.includes(oldMap)) {
  c = c.replace(oldMap, newMap);
  console.log('menu split: top nav -> [_DD] + Inicio/TV/Pelis/Juegos/Libros');
} else if (c.includes(fallbackOldMap)) {
  c = c.replace(fallbackOldMap, newMap);
  console.log('menu split: top nav (from base) -> [_DD] + filtered items');
} else {
  console.error('menu split: top nav anchor not found'); process.exit(1);
}

// 3. Restore TS to original (no sidebar)
const oldTS_withSidebar = 'TS=function(){return r.createElement(r.Fragment,null,r.createElement(ny,null),r.createElement("div",{className:"flex flex-row max-w-7xl m-auto"},r.createElement(_SN,null),r.createElement("div",{className:"flex flex-col items-center flex-grow"},r.createElement("div",{className:"w-full p-2",key:location.pathname},r.createElement($,null)))))}';
const originalTS = 'TS=function(){return r.createElement(r.Fragment,null,r.createElement(ny,null),r.createElement("div",{className:"flex flex-col items-center max-w-5xl m-auto"},r.createElement("div",{className:"w-full p-2",key:location.pathname},r.createElement($,null))))}';
if (c.includes(originalTS)) {
  console.log('menu split: TS already in original layout');
} else if (c.includes(oldTS_withSidebar)) {
  c = c.replace(oldTS_withSidebar, originalTS);
  console.log('menu split: TS reverted to original (no sidebar)');
}

// 4. Rename "Books" menu entry → "Libros/Audiolibros" (literal, bypass i18n)
const oldBook = '{path:"/books",name:xo._("Books")}';
const newBook = '{path:"/books",name:"Libros/Audiolibros"}';
if (c.includes(newBook)) {
  console.log('menu split: books menu already renamed');
} else if (c.includes(oldBook)) {
  c = c.replace(oldBook, newBook);
  console.log('menu split: Books -> Libros/Audiolibros in menu');
}

fs.writeFileSync(bundlePath, c);
console.log('menu split: complete');
