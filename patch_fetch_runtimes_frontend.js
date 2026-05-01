const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Add a "Cargar duraciones" button in Ay (season detail) — pulls per-episode runtime from TMDB
//    and stores in episode.runtime. Anchor: just before the rating row in the right-hand column.
const oldAy = 'r.createElement("div",{className:"mt-2"},(Wo(a)||!No(n))&&r.createElement(Yo,{mediaItem:n,season:a}))';
const newAy = 'r.createElement("div",{className:"mt-2"},r.createElement("button",{type:"button",className:"text-sm btn-blue",onClick:function(){fetch("/api/episodes/fetch-runtimes?mediaItemId="+n.id,{method:"POST",credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){alert(d.ok?"Duraciones actualizadas: "+d.updated+" episodios":"Error: "+(d.error||"desconocido"));window.location.reload()}).catch(function(e){alert("Error: "+e.message)})}},"Cargar duraciones desde TMDB")),' + oldAy;

if (c.includes('Cargar duraciones desde TMDB')) {
  console.log('fetch-runtimes frontend: button already added');
} else if (!c.includes(oldAy)) {
  console.error('fetch-runtimes frontend: Ay anchor not found'); process.exit(1);
} else {
  c = c.replace(oldAy, newAy);
  console.log('fetch-runtimes frontend: added "Cargar duraciones" button to season page');
}

// 2. Update _EP component to show duration info if episode.runtime is set
const oldLabelSpan = 'r.createElement("span",{className:"text-xs ml-1 text-gray-400",style:{minWidth:"2.5rem"}},_p,"%")';
const newLabelSpan = 'r.createElement("span",{className:"text-xs ml-1 text-gray-400",style:{minWidth:"4rem"}},_ep.runtime?Math.round(_p/100*_ep.runtime)+"/"+_ep.runtime+"min":_p+"%")';
const oldEP = oldLabelSpan;
const newEP = newLabelSpan;

if (c.includes(newEP)) {
  console.log('fetch-runtimes frontend: _EP label already updated');
} else if (!c.includes(oldEP)) {
  console.error('fetch-runtimes frontend: _EP label anchor not found'); process.exit(1);
} else {
  c = c.replace(oldEP, newEP);
  console.log('fetch-runtimes frontend: _EP now shows minutes when runtime is set');
}

fs.writeFileSync(bundlePath, c);
console.log('fetch-runtimes frontend: complete');
