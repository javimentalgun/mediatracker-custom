const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// _LP: list preview component — block clickable, watchlist pinned with bookmark, item poster previews
const compDef = `_LP=function(e){` +
  `var _list=e.list;` +
  `var _u=r.useState([]),_items=_u[0],_setItems=_u[1];` +
  `r.useEffect(function(){` +
    `fetch("/api/list/items?listId="+_list.id,{credentials:"same-origin"})` +
      `.then(function(r){return r.json()})` +
      `.then(function(d){_setItems(Array.isArray(d)?d.slice(0,8):[])})` +
      `.catch(function(){_setItems([])});` +
  `},[_list.id]);` +
  `return r.createElement(ie,{to:"/list/"+_list.id,style:{textDecoration:"none",color:"inherit"}},` +
    `r.createElement("div",{style:{border:"1px solid rgba(148,163,184,0.4)",borderRadius:"0.5rem",padding:"0.75rem",marginBottom:"0.75rem",cursor:"pointer",transition:"background 0.15s"},onMouseEnter:function(e){e.currentTarget.style.background="rgba(148,163,184,0.08)"},onMouseLeave:function(e){e.currentTarget.style.background="transparent"}},` +
      // Title row: bookmark icon (if watchlist) + name + count
      `r.createElement("div",{className:"flex items-center my-1"},` +
        `_list.isWatchlist&&r.createElement("span",{className:"material-icons text-yellow-500 mr-2",title:"Lista de seguimiento"},"bookmark"),` +
        `r.createElement("div",{className:"text-xl font-semibold"},Fo(_list)),` +
        `r.createElement("div",{className:"ml-3 text-sm text-gray-400"},r.createElement(Xe,{id:"{0, plural, one {# item} other {# items}}",values:{0:_list.itemsCount}}))` +
      `),` +
      // Description (rendered at runtime; _o is the bundle-scope helper that returns the list description)
      `_o(_list)&&r.createElement("div",{className:"text-sm text-gray-500 mb-2 overflow-hidden whitespace-nowrap text-ellipsis"},_o(_list)),` +
      `_items.length>0?r.createElement("div",{style:{display:"flex",gap:"0.4rem",overflowX:"auto",marginTop:"0.5rem"}},` +
      `_items.map(function(it,i){` +
        `return r.createElement("div",{key:i,style:{flexShrink:0,width:"4.5rem"}},` +
          `r.createElement(Np,{src:it.posterSmall,itemMediaType:it.mediaType}),` +
          `r.createElement("div",{className:"text-xs mt-1 text-center text-gray-400 overflow-hidden whitespace-nowrap text-ellipsis"},it.title)` +
        `)` +
      `})` +
    `):r.createElement("div",{className:"text-sm text-gray-500 italic"},xo._("(empty)"))` +
    `)` +
  `)` +
`},`;

const cardAnchor = '_v=function(e){';
if (c.includes('_LP=function(e){var _list=e.list')) {
  console.log('lists page: _LP already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('lists page: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('lists page: injected _LP component');
}

// Replace SS body with one that sorts (watchlist first) and uses _LP
const oldSS = 'i.map((function(e){return r.createElement("div",{key:e.id,className:"mb-5"},r.createElement("div",{className:"flex items-center my-1"},r.createElement("div",{className:"text-xl"},r.createElement(ie,{to:"/list/".concat(e.id)},Fo(e))),a&&r.createElement("div",{className:"pl-2 text-xs"},r.createElement(Xp,{list:e}))),r.createElement("div",null,r.createElement(Xe,{id:"{0, plural, one {# item} other {# items}}",values:{0:e.itemsCount}})),r.createElement("div",{className:"overflow-hidden whitespace-nowrap text-ellipsis"},_o(e)))}))';
const newSS = 'i.slice().sort(function(x,y){return (y.isWatchlist?1:0)-(x.isWatchlist?1:0)}).map((function(e){return r.createElement("div",{key:e.id},r.createElement(_LP,{list:e}),a&&r.createElement("div",{className:"text-xs ml-2"},r.createElement(Xp,{list:e})))}))';
if (c.includes(newSS)) {
  console.log('lists page: SS already updated');
} else if (!c.includes(oldSS)) {
  console.error('lists page: SS anchor not found'); process.exit(1);
} else {
  c = c.replace(oldSS, newSS);
  console.log('lists page: SS now uses _LP and sorts watchlist first');
}

fs.writeFileSync(bundlePath, c);
console.log('lists page: complete');
