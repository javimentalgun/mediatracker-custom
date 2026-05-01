const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Wrap the seen-history link with a vertical container:
//   row 1: link  +  green "✓ Completado" badge (if completed)
//   row 2: compact summary "N veces · Última vez DD/MM/YYYY"
const old = 'r.createElement(ie,{to:"/seen-history/".concat(a.id),className:"underline"},jo(a)&&r.createElement(Xe,{id:"Listened history"}),Do(a)&&r.createElement(Xe,{id:"Read history"}),(Io(a)||Ro(a))&&r.createElement(Xe,{id:"Seen history"}),Ao(a)&&r.createElement(Xe,{id:"Played history"}))';

const summaryExpr =
  '(function(){' +
    'var n=(a.seenHistory&&a.seenHistory.length)||0;' +
    'var verb=jo(a)?"Escuchado":Do(a)?"Leído":Ao(a)?"Jugado":"Visto";' +
    'var last=a.lastSeenAt?new Date(a.lastSeenAt).toLocaleDateString("es",{day:"2-digit",month:"2-digit",year:"numeric"}):null;' +
    'if(n===0&&!last)return null;' +
    'var parts=[];' +
    'var isTv=a.mediaType==="tv";' +
    'if(n>0){' +
      'parts.push(verb+" "+n+(n===1?" vez":" veces"));' +
      // For non-tv items, surface re-watches explicitly: visit #1 = first, the rest are re-watches
      'if(!isTv&&n>=2)parts.push((n-1)+" re-vista"+(n-1===1?"":"s"));' +
    '}' +
    'if(last)parts.push("última vez "+last);' +
    // First-watch date (oldest seen entry) for non-tv items with multiple visits
    'if(!isTv&&n>=2&&a.seenHistory){' +
      'var dates=a.seenHistory.map(function(s){return s.date}).filter(Boolean).sort();' +
      'if(dates.length>=2){var first=new Date(dates[0]).toLocaleDateString("es",{day:"2-digit",month:"2-digit",year:"numeric"});parts.push("primera vez "+first)}' +
    '}' +
    'return r.createElement("div",{className:"text-xs text-gray-500 mt-1"},parts.join(" · "))' +
  '})()';

const fresh = 'r.createElement("div",{className:"mt-3"},' +
  'r.createElement("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem"}},' + old +
    ',((a.seen===true)||(a.progress===1)||(a.audioProgress===1))&&r.createElement("span",{style:{background:"#16a34a",color:"white",padding:"0.15rem 0.5rem",borderRadius:"0.25rem",fontSize:"0.75rem",fontWeight:"600"}},"✓ Completado")' +
  '),' + summaryExpr +
')';

if (c.includes('re-vista')) {
  console.log('completed badge: already added (with rewatch info)');
} else if (c.includes('"✓ Completado"')) {
  // Old version was applied; replace it with the new one that includes rewatch info
  const oldFresh = 'r.createElement("div",{className:"mt-3"},r.createElement("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem"}},' + old + ',((a.seen===true)||(a.progress===1)||(a.audioProgress===1))&&r.createElement("span",{style:{background:"#16a34a",color:"white",padding:"0.15rem 0.5rem",borderRadius:"0.25rem",fontSize:"0.75rem",fontWeight:"600"}},"✓ Completado")),(function(){var n=(a.seenHistory&&a.seenHistory.length)||0;var verb=jo(a)?"Escuchado":Do(a)?"Leído":Ao(a)?"Jugado":"Visto";var last=a.lastSeenAt?new Date(a.lastSeenAt).toLocaleDateString("es",{day:"2-digit",month:"2-digit",year:"numeric"}):null;if(n===0&&!last)return null;var parts=[];if(n>0)parts.push(verb+" "+n+(n===1?" vez":" veces"));if(last)parts.push("última vez "+last);return r.createElement("div",{className:"text-xs text-gray-500 mt-1"},parts.join(" · "))})())';
  if (c.includes(oldFresh)) {
    c = c.replace(oldFresh, fresh);
    console.log('completed badge: upgraded to include rewatch info');
  } else {
    console.log('completed badge: legacy version detected but exact pattern mismatch (skipping)');
  }
} else if (!c.includes(old)) {
  console.error('completed badge: anchor not found'); process.exit(1);
} else {
  c = c.replace(old, fresh);
  console.log('completed badge: green badge + rewatch info added');
}

fs.writeFileSync(bundlePath, c);
