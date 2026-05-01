const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// _DUP page: list duplicate groups with merge buttons
const compDef = '_DUP=function(){' +
  'var _q=r.useState(null),_data=_q[0],_set=_q[1];' +
  'var _b=r.useState(false),_busy=_b[0],_setBusy=_b[1];' +
  'var _load=function(){_set(null);fetch("/api/dupes",{credentials:"same-origin"}).then(function(r){return r.json()}).then(_set).catch(function(e){_set({error:String(e)})})};' +
  'r.useEffect(_load,[]);' +
  'var _merge=function(winnerId,loserId){' +
    'if(!confirm("¿Fusionar item "+loserId+" → "+winnerId+"? Se mueven seen/ratings/progress/listas y se borra el item perdedor."))return;' +
    '_setBusy(true);' +
    'fetch("/api/dupes/merge",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({winnerId:winnerId,loserId:loserId})})' +
      '.then(function(r){return r.json()})' +
      '.then(function(d){_setBusy(false);if(d.error){alert("Error: "+d.error)}else{_load()}})' +
      '.catch(function(e){_setBusy(false);alert(String(e.message||e))})' +
  '};' +
  'if(!_data)return r.createElement("p",{className:"p-4 text-gray-500"},"Buscando duplicados...");' +
  'if(_data.error)return r.createElement("p",{className:"p-4 text-red-500"},"Error: "+_data.error);' +
  'if(!_data.dupes||_data.dupes.length===0)return r.createElement("div",{className:"p-4"},r.createElement("h2",{className:"text-2xl font-bold mb-3"},"Duplicados"),r.createElement("p",{className:"text-green-600"},"No hay duplicados detectados ✓"));' +
  'return r.createElement("div",{className:"p-2"},' +
    'r.createElement("h2",{className:"text-2xl font-bold mb-2 px-2"},"Duplicados ("+_data.count+" grupos)"),' +
    'r.createElement("p",{className:"text-sm text-gray-500 mb-4 px-2"},"Items con mismo título+año+tipo pero IDs externos distintos. Pulsa el ítem que quieras conservar; los demás se fusionan en él."),' +
    '_data.dupes.map(function(g,gi){' +
      'return r.createElement("div",{key:gi,className:"mb-6 p-3 bg-slate-100 dark:bg-slate-800 rounded"},' +
        'r.createElement("div",{className:"font-bold mb-2"},g.items[0].title+" ("+(g.items[0].releaseDate?String(g.items[0].releaseDate).slice(0,4):"?")+", "+g.items[0].mediaType+")"),' +
        'r.createElement("div",{className:"flex flex-col gap-2"},' +
          'g.items.map(function(it,i){' +
            'var ids=[];if(it.tmdbId)ids.push("tmdb:"+it.tmdbId);if(it.imdbId)ids.push("imdb:"+it.imdbId);if(it.tvdbId)ids.push("tvdb:"+it.tvdbId);if(it.igdbId)ids.push("igdb:"+it.igdbId);' +
            'var isWinner=i===0;' +
            'return r.createElement("div",{key:it.id,className:"flex items-center gap-3 p-2 rounded "+(isWinner?"bg-green-100 dark:bg-green-900":"bg-white dark:bg-slate-700")},' +
              'r.createElement("div",{className:"flex-1"},' +
                'r.createElement("a",{href:"#/details/"+it.id,className:"underline text-blue-600 dark:text-blue-400"},"#"+it.id),' +
                'r.createElement("span",{className:"ml-2 text-xs text-gray-500"},ids.join(" · ")||"sin IDs externos"),' +
                'r.createElement("span",{className:"ml-2 text-xs"},"uso: "+it.usage)' +
              '),' +
              '!isWinner?r.createElement("button",{disabled:_busy,onClick:function(){_merge(g.items[0].id,it.id)},className:"px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-500 text-white rounded text-sm"},"Fusionar → #"+g.items[0].id):r.createElement("span",{className:"text-xs px-2 py-1 bg-green-700 text-white rounded"},xo._("WINNER (most use)"))' +
            ')' +
          '})' +
        ')' +
      ')' +
    '})' +
  ')' +
'},';

const cardAnchor = '_v=function(e){';
if (!c.includes(cardAnchor)) { console.error('dupes frontend: _v anchor not found'); process.exit(1); }
if (c.includes('_DUP=function(){var _q=r.useState')) {
  console.log('dupes frontend: _DUP already injected');
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('dupes frontend: injected _DUP component');
}

// Add /dupes route
const routeAnchor = 'r.createElement(Q,{path:"/lists",element:r.createElement(SS,{key:"/lists"})})';
const routePatched = 'r.createElement(Q,{path:"/dupes",element:r.createElement(_DUP,null)}),' + routeAnchor;
if (c.includes('path:"/dupes"')) {
  console.log('dupes frontend: /dupes route already added');
} else if (!c.includes(routeAnchor)) {
  console.error('dupes frontend: route anchor not found'); process.exit(1);
} else {
  c = c.replace(routeAnchor, routePatched);
  console.log('dupes frontend: added /dupes route');
}

// Add link in /backup page (next to catalog cleanup) — keep menu clean, this is rare maintenance.
// backup_frontend uses xo._("Catalog cleanup") (post-i18n), so we anchor on that call.
const bkAnchor = 'r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},xo._("Catalog cleanup")),';
const bkPatched = 'r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},xo._("Detect duplicates")),' +
  'r.createElement("p",{className:"mb-2 text-gray-600 dark:text-gray-300"},xo._("Dupes desc backup")),' +
  'r.createElement("a",{href:"#/dupes",className:"px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded shadow inline-flex items-center gap-2 self-start mb-4"},' +
    'r.createElement("i",{className:"material-icons"},"merge_type"),' +
    'xo._("Find and merge")' +
  '),' + bkAnchor;
if (c.includes('xo._("Detect duplicates"))')) {
  console.log('dupes frontend: backup link already added');
} else if (!c.includes(bkAnchor)) {
  console.log('dupes frontend: backup anchor not found (skipping link)');
} else {
  c = c.replace(bkAnchor, bkPatched);
  console.log('dupes frontend: added "Detect duplicates" link to /backup');
}

fs.writeFileSync(bundlePath, c);
console.log('dupes frontend: complete');
