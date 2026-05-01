const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Inject _DL component definition before _v card component
// _v lives inside `var Ov,Lv,Hv,_v=function(e){...}` — inject as another comma-separated declarator.
// Style matches the watchlist (Pendiente) button: Fv badge with span.material-icons inside, no inline color.
const componentDef = `_DL=function(e){var _s=r.useState(!!e.d),_t=_s[0],_u=_s[1];r.useEffect(function(){_u(!!e.d)},[e.d]);var _toggle=function(n){n.preventDefault();n.stopPropagation();var a=!_t;_u(a);fetch("/api/downloaded?mediaItemId="+e.id,{method:"PATCH",credentials:"same-origin"}).catch(function(){_u(_t)})};return r.createElement("div",{className:"inline-flex pointer-events-auto hover:cursor-pointer",title:_t?"Descargado":"Marcar como descargado",onClick:_toggle},r.createElement(Fv,null,r.createElement("span",{className:"flex material-icons"},_t?"download_done":"arrow_downward")))},`;

const cardAnchor = '_v=function(e){';
if (!c.includes(cardAnchor)) { console.error('frontend: _v anchor not found'); process.exit(1); }
if (c.includes('_DL=function(e){var _s=r.useState')) { console.log('frontend: _DL already injected'); }
else {
  c = c.replace(cardAnchor, componentDef + cardAnchor);
  console.log('frontend: injected _DL component');
}

// 2. Add download button to card bottom-right corner
const btnAnchor = 'm&&Wo(t)&&r.createElement("div",{className:"absolute pointer-events-auto bottom-1 left-1"},r.createElement(Yo,{mediaItem:t,season:n,episode:a}))';
const btnReplacement = btnAnchor + ',r.createElement("div",{className:"absolute pointer-events-auto bottom-1 right-1"},r.createElement(_DL,{id:t.id,d:t.downloaded}))';

if (c.includes('r.createElement(_DL')) { console.log('frontend: _DL usage already patched'); }
else if (!c.includes(btnAnchor)) { console.error('frontend: bottom-left anchor not found'); process.exit(1); }
else {
  c = c.replace(btnAnchor, btnReplacement);
  console.log('frontend: added download button to card bottom-right');
}

fs.writeFileSync(bundlePath, c);
console.log('frontend: download button patch complete');
