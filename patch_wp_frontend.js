const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// _WP component: fetch watch providers and show icons/buttons in detail page
// _v is part of `var Ov,Lv,Hv,_v=function(e){...}` — inject as another comma-separated declarator
const compDef =
`_WP=function(e){` +
  `var t=e.mediaItem;` +
  `var _q=r.useState(null),_ps=_q[0],_sp=_q[1];` +
  `r.useEffect(function(){` +
    `_sp(null);` +
    `fetch("/api/watch-providers?mediaItemId="+t.id,{credentials:"same-origin"})` +
      `.then(function(r){return r.json()})` +
      `.then(function(d){_sp(d)})` +
      `.catch(function(){_sp([])});` +
  `},[t.id]);` +
  `if(!_ps||_ps.length===0)return null;` +
  `var groups={"streaming":"Streaming","gratis":"Gratis","gratis-con-anuncios":"Gratis (con anuncios)","alquiler":"Alquiler","compra":"Compra"};` +
  `var byKind={};` +
  `_ps.forEach(function(p){var k=p.kind||"streaming";if(!byKind[k])byKind[k]=[];byKind[k].push(p)});` +
  `return r.createElement("div",{className:"mt-4"},` +
    `r.createElement("div",{className:"font-bold mb-2"},"Disponible en"),` +
    `Object.keys(groups).filter(function(k){return byKind[k]}).map(function(k){` +
      `return r.createElement("div",{key:k,className:"mb-3"},` +
        `r.createElement("div",{className:"text-xs text-gray-500 mb-1"},groups[k]),` +
        `r.createElement("div",{className:"flex flex-wrap gap-2"},` +
          `byKind[k].map(function(p,i){` +
            `return r.createElement("a",{key:i,href:p.url,target:"_blank",rel:"noopener noreferrer",title:p.name,` +
              `className:"flex items-center gap-1 px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-sm hover:opacity-80"},` +
              `p.logo?r.createElement("img",{src:p.logo,alt:p.name,className:"h-5 w-5 rounded object-cover"})` +
                `:r.createElement("i",{className:"material-icons text-base"},"open_in_new"),` +
              `r.createElement("span",null,p.name)` +
            `)` +
          `})` +
        `)` +
      `)` +
    `})` +
  `)` +
`},`;

const cardAnchor = '_v=function(e){';
if (!c.includes(cardAnchor)) { console.error('wp frontend: _v anchor not found'); process.exit(1); }
if (c.includes('_WP=function(e){var t=e.mediaItem;var _q=r.useState(null)')) { console.log('wp frontend: _WP already injected'); }
else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('wp frontend: injected _WP component');
}

// Add _WP to detail page after links section
const detailAnchor = ',r.createElement(_LK,{mediaItem:a})';
const detailPatched = detailAnchor + ',r.createElement(_WP,{mediaItem:a})';

if (c.includes(detailPatched)) { console.log('wp frontend: detail already patched'); }
else if (!c.includes(detailAnchor)) { console.error('wp frontend: detail anchor (_LK) not found'); process.exit(1); }
else {
  c = c.replace(detailAnchor, detailPatched);
  console.log('wp frontend: added _WP to detail page');
}

fs.writeFileSync(bundlePath, c);
console.log('wp frontend: complete');
