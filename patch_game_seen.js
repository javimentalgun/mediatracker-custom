const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// _SE: interactive "mark as seen/visto" toggle button — eye icon, shown on game cards.
// Toggles via PUT /api/seen (mark) or DELETE /api/seen/ (unmark).
const compDef = `_SE=function(e){var _s=r.useState(!!e.s),_t=_s[0],_u=_s[1];r.useEffect(function(){_u(!!e.s)},[e.s]);var _toggle=function(n){n.preventDefault();n.stopPropagation();var willBeSeen=!_t;_u(willBeSeen);var url=willBeSeen?"/api/seen?mediaItemId="+e.id+"&lastSeenAt=now":"/api/seen/?mediaItemId="+e.id;var method=willBeSeen?"PUT":"DELETE";fetch(url,{method:method,credentials:"same-origin"}).then(function(){if(typeof HW!=="undefined"){try{HW.refetchQueries(["items"])}catch(_){}try{HW.invalidateQueries(["details",e.id])}catch(_){}}}).catch(function(){_u(_t)})};return r.createElement("div",{className:"inline-flex pointer-events-auto hover:cursor-pointer",title:_t?"Visto":"Marcar como visto",onClick:_toggle},r.createElement(Fv,null,r.createElement("span",{className:"flex material-icons"},_t?"visibility":"visibility_off")))},`;

const cardAnchor = '_v=function(e){';
if (c.includes('_SE=function(e){var _s=r.useState')) {
  console.log('game seen: _SE already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('game seen: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('game seen: injected _SE component');
}

// Eye on game cards REMOVED — moved to a "Marcar como visto" button on the
// detail page (patch_mark_watched_button.js). The card-overlay eye was easy
// to mis-click and confused with "marcar como completado" (which sends
// kind=played). The detail-page button is explicit and shares its style with
// the rest of the action row.

fs.writeFileSync(bundlePath, c);
console.log('game seen: complete');
