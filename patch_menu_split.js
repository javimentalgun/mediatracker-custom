const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

const SIDE_PATHS = '["/upcoming","/in-progress","/calendar","/lists","/watchlist"]';
const TOP_PATHS  = '["/","/tv","/movies","/games","/books"]';

// 1. Inject _DD dropdown component (hamburger icon → vertical menu of navigational items)
const compDef = `_DD=function(){` +
  `var _s=r.useState(false),_open=_s[0],_setOpen=_s[1];` +
  `var _items=ty().filter(function(e){return ` + SIDE_PATHS + `.indexOf(e.path)>=0});` +
  `return r.createElement("div",{style:{position:"relative",display:"inline-block",marginRight:"0.5rem"}},` +
    `r.createElement("span",{className:"material-icons cursor-pointer text-2xl",onClick:function(){_setOpen(!_open)}},"menu"),` +
    `_open&&r.createElement("div",{style:{position:"absolute",top:"100%",left:0,zIndex:50,background:"#1e293b",border:"1px solid #475569",borderRadius:"0.25rem",padding:"0.5rem",minWidth:"10rem"},onMouseLeave:function(){_setOpen(false)}},` +
      `_items.map(function(e){` +
        `return r.createElement(oe,{key:e.path,to:e.path,className:function(o){return Be("block py-1 px-2 text-base whitespace-nowrap text-white hover:bg-slate-700",o.isActive&&"underline font-bold")},onClick:function(){_setOpen(false)}},e.name)` +
      `})` +
    `)` +
  `)` +
`},`;
const cardAnchor = '_v=function(e){';
if (c.includes('_DD=function(){var _s=r.useState(false)')) {
  console.log('menu split: _DD already injected');
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
