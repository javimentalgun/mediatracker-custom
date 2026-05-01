const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Inject _BK component (backup page) — comma-separated declarator
const compDef = `_BK=function(){` +
  `var _f=r.useState(null),_file=_f[0],_setFile=_f[1];` +
  `var _u=r.useState(null),_status=_u[0],_setStatus=_u[1];` +
  `var _upload=function(){` +
    `if(!_file){return}` +
    `_setStatus({type:"loading",msg:"Subiendo..."});` +
    `fetch("/api/backup/restore",{method:"POST",credentials:"same-origin",body:_file,headers:{"Content-Type":"application/octet-stream"}})` +
      `.then(function(r){return r.json()})` +
      `.then(function(d){` +
        `if(d.ok){_setStatus({type:"success",msg:"Subido OK ("+d.size+" bytes). Reinicia el contenedor: docker compose restart mediatracker (luego el archivo data.db.uploaded sustituirá al actual)."})}` +
        `else{_setStatus({type:"error",msg:d.error||"Error desconocido"})}` +
      `})` +
      `.catch(function(e){_setStatus({type:"error",msg:String(e.message||e)})});` +
  `};` +
  `return r.createElement("div",{className:"flex flex-col items-center mt-10 px-4 max-w-2xl mx-auto"},` +
    `r.createElement("h1",{className:"text-3xl font-bold mb-6"},xo._("Backup heading")),` +
    // Download section
    `r.createElement("h2",{className:"text-xl font-bold mb-2 self-start"},xo._("Download")),` +
    `r.createElement("p",{className:"mb-4 text-gray-600 dark:text-gray-300"},xo._("Download backup desc")),` +
    `r.createElement("div",{className:"flex flex-wrap gap-2 mb-4"},` +
      `r.createElement("a",{href:"/api/backup",download:true,className:"px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow inline-flex items-center gap-2"},` +
        `r.createElement("i",{className:"material-icons"},"file_download"),` +
        `xo._("Download .db (binary)")` +
      `),` +
      `r.createElement("a",{href:"/api/backup/export-json",download:true,className:"px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow inline-flex items-center gap-2"},` +
        `r.createElement("i",{className:"material-icons"},"data_object"),` +
        `xo._("Export JSON")` +
      `),` +
      `r.createElement("a",{href:"/api/backup/letterboxd",download:true,className:"px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded shadow inline-flex items-center gap-2",title:xo._("Letterboxd-importable (movies only)")},` +
        `r.createElement("i",{className:"material-icons"},"movie"),` +
        `xo._("Letterboxd CSV")` +
      `)` +
    `),` +
    // Restore section
    `r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},xo._("Restore")),` +
    `r.createElement("p",{className:"mb-4 text-gray-600 dark:text-gray-300"},xo._("Restore desc")),` +
    `r.createElement("input",{type:"file",accept:".db",className:"mb-2",onChange:function(e){var f=e.currentTarget.files&&e.currentTarget.files[0];_setFile(f);_setStatus(null)}}),` +
    `_file?r.createElement("button",{onClick:_upload,className:"px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-lg font-semibold rounded-lg shadow inline-flex items-center gap-2"},` +
      `r.createElement("i",{className:"material-icons"},"file_upload"),` +
      `xo._("Upload and restore")` +
    `):null,` +
    `_status?r.createElement("div",{className:"mt-4 p-3 rounded text-white "+(_status.type==="success"?"bg-green-700":_status.type==="error"?"bg-red-700":"bg-blue-700")},_status.msg):null,` +
    // Import JSON section
    `r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},xo._("Imports JSON")),` +
    `r.createElement("p",{className:"mb-4 text-gray-600 dark:text-gray-300"},xo._("Import JSON desc")),` +
    `r.createElement("label",{className:"mb-2 inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"},` +
      `r.createElement("input",{type:"checkbox",id:"_imp_create",defaultChecked:!0}),` +
      `xo._("Create missing items")` +
    `),` +
    `r.createElement("input",{type:"file",accept:".json",className:"mb-2",onChange:function(e){var f=e.currentTarget.files&&e.currentTarget.files[0];if(!f)return;var createMissing=document.getElementById("_imp_create").checked;_setStatus({type:"loading",msg:"Importando "+f.name+"..."});var rd=new FileReader();rd.onload=function(){var raw=rd.result;try{var obj=JSON.parse(raw);obj.createMissing=createMissing;raw=JSON.stringify(obj)}catch(_){}fetch("/api/backup/import",{method:"POST",credentials:"same-origin",body:raw,headers:{"Content-Type":"application/json"}}).then(function(r){return r.json()}).then(function(d){if(d.error){_setStatus({type:"error",msg:d.error})}else{_setStatus({type:"success",msg:"Items: emparejados "+d.mediaItemsMatched+", creados "+(d.mediaItemsCreated||0)+", no encontrados "+d.mediaItemsMissing+" · Episodios "+d.episodesMatched+" · Listas: "+d.listsCreated+"+/"+d.listsExisting+"= · Visto: +"+d.seenImported+" (saltados "+d.seenSkipped+", sin emparejar "+d.seenMissing+") · Ratings: +"+d.ratingsImported+" · Progreso: +"+d.progressImported})}}).catch(function(e){_setStatus({type:"error",msg:String(e.message||e)})})};rd.readAsText(f)}}),` +
    // Catalog cleanup section
    `r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},xo._("Catalog cleanup")),` +
    `r.createElement("p",{className:"mb-4 text-gray-600 dark:text-gray-300"},xo._("Catalog cleanup desc")),` +
    `r.createElement("button",{onClick:function(){if(confirm(xo._("Delete orphan catalog items?")))fetch("/api/catalog/cleanup",{method:"POST",credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){alert(d.ok?"Eliminados "+d.deleted+" items":"Error: "+(d.error||""))})},className:"px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded shadow inline-flex items-center gap-2"},` +
      `r.createElement("i",{className:"material-icons"},"delete_sweep"),` +
      `xo._("Purge orphan catalog")` +
    `),` +
    // Auto-backup info
    `r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},xo._("Automatic backups")),` +
    `r.createElement("p",{className:"text-sm text-gray-500 dark:text-gray-400"},xo._("Auto backups desc"))` +
  `)` +
`},`;

const cardAnchor = '_v=function(e){';
if (c.includes('_BK=function(){var _f=r.useState')) {
  console.log('backup frontend: _BK already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('backup frontend: _v anchor not found'); process.exit(1);
} else {
  // Remove any old _BK definition first (so we can update the patch cleanly across rebuilds via cache-bust)
  c = c.replace(/_BK=function\(\)\{return r\.createElement\("div"[^}]*?\}\}\)\)\)\},/g, '');
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('backup frontend: injected _BK component (with restore upload)');
}

// 2. Add /backup route to React Router
const routeAnchor = 'r.createElement(Q,{path:"/lists",element:r.createElement(SS,{key:"/lists"})})';
const routePatched = 'r.createElement(Q,{path:"/backup",element:r.createElement(_BK,null)}),' + routeAnchor;
if (c.includes('path:"/backup"')) {
  console.log('backup frontend: /backup route already added');
} else if (!c.includes(routeAnchor)) {
  console.error('backup frontend: /lists route anchor not found'); process.exit(1);
} else {
  c = c.replace(routeAnchor, routePatched);
  console.log('backup frontend: added /backup route');
}

// 3. Add Backup menu item
const menuAnchor = '{path:"/lists",name:xo._("Lists")}]';
const menuPatched = '{path:"/lists",name:xo._("Lists")},{path:"/backup",name:xo._("Backup")}]';
if (c.includes('{path:"/backup",name:')) {
  console.log('backup frontend: menu item already added');
} else if (!c.includes(menuAnchor)) {
  console.error('backup frontend: menu anchor not found'); process.exit(1);
} else {
  c = c.replace(menuAnchor, menuPatched);
  console.log('backup frontend: added Backup menu item');
}

fs.writeFileSync(bundlePath, c);
console.log('backup frontend: complete');
