const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Inject _LK component definition before _v card component
// _v is part of `var Ov,Lv,Hv,_v=function(e){...}` — inject as another comma-separated declarator
const compDef = `_LK=function(e){` +
  `var t=e.mediaItem;` +
  `var _p=function(){try{return JSON.parse(t.links||"[]")}catch(x){return []}};` +
  `var _q=r.useState(_p()),_ls=_q[0],_sl=_q[1];` +
  `var _a=r.useState(""),_nl=_a[0],_sn=_a[1];` +
  `var _b=r.useState(""),_nu=_b[0],_su=_b[1];` +
  `r.useEffect(function(){_sl(_p())},[t.links]);` +
  `var _sv=function(u){_sl(u);fetch("/api/links?mediaItemId="+t.id,{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({links:u})})};` +
  `var _add=function(ev){ev.preventDefault();if(!_nu)return;var u=[].concat(_ls,[{label:_nl||_nu,url:_nu}]);_sv(u);_sn("");_su("")};` +
  `var _rm=function(i){_sv(_ls.filter(function(_,idx){return idx!==i}))};` +
  `return r.createElement("div",{className:"mt-4"},` +
    `r.createElement("div",{className:"font-bold mb-2"},"Links"),` +
    `_ls.map(function(lk,i){return r.createElement("div",{key:i,className:"flex items-center gap-2 mb-1"},` +
      `r.createElement("a",{href:lk.url,target:"_blank",rel:"noopener noreferrer",className:"underline text-blue-400 truncate"},lk.label),` +
      `r.createElement("i",{className:"material-icons text-sm text-red-400 cursor-pointer select-none",onClick:function(){_rm(i)}},"delete_outline")` +
    `)}),` +
    `r.createElement("form",{onSubmit:_add,className:"flex gap-1 mt-2"},` +
      `r.createElement("input",{type:"text",placeholder:"Etiqueta",value:_nl,onChange:function(ev){_sn(ev.target.value)},className:"border rounded px-1 text-sm w-24 dark:bg-gray-700 dark:border-gray-600"}),` +
      `r.createElement("input",{type:"url",placeholder:"URL",value:_nu,onChange:function(ev){_su(ev.target.value)},required:true,className:"border rounded px-1 text-sm flex-1 dark:bg-gray-700 dark:border-gray-600"}),` +
      `r.createElement("button",{type:"submit",className:"text-sm btn"},"+")` +
    `)` +
  `)` +
`},`;

const cardAnchor = '_v=function(e){';
if (!c.includes(cardAnchor)) { console.error('links frontend: _v anchor not found'); process.exit(1); }
if (c.includes('_LK=function(e){var t=e.mediaItem')) { console.log('links frontend: _LK already injected'); }
else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('links frontend: injected _LK component');
}

// 2. Add _LK to the detail page after the rating section
const detailAnchor = '(Wo(a)||!No(a))&&r.createElement(Zp,{userRating:a.userRating,mediaItem:a})';
const detailPatched = detailAnchor + ',r.createElement(_LK,{mediaItem:a})';

if (c.includes(detailPatched)) { console.log('links frontend: detail already patched'); }
else if (!c.includes(detailAnchor)) { console.error('links frontend: detail anchor not found'); process.exit(1); }
else {
  c = c.replace(detailAnchor, detailPatched);
  console.log('links frontend: added _LK to detail page');
}

fs.writeFileSync(bundlePath, c);
console.log('links frontend: complete');
