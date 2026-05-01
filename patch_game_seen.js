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

// Place _SE on game cards in top-center. Anchor uses the rating section start which is
// stable regardless of whether play_circle/check are present or not.
const anchor = ',m&&Wo(t)&&r.createElement("div",{className:"absolute pointer-events-auto bottom-1 left-1"},r.createElement(Yo';
const seenButtonElem = ',Ao(t)&&r.createElement("div",{className:"absolute pointer-events-auto top-1",style:{left:"50%",transform:"translateX(-50%)"}},r.createElement(_SE,{id:t.id,s:t.seen}))';

if (c.includes('r.createElement(_SE,{id:t.id')) {
  console.log('game seen: _SE button already placed');
} else if (!c.includes(anchor)) {
  console.error('game seen: anchor not found'); process.exit(1);
} else {
  c = c.replace(anchor, seenButtonElem + anchor);
  console.log('game seen: added _SE eye button on game cards (top-center)');
}

fs.writeFileSync(bundlePath, c);
console.log('game seen: complete');
