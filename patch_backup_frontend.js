const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Backup page (_BK) rendered as a single table:
//   columns: Acción | Descripción | Control
// Each row groups one feature (download/restore/import/cleanup/auto-backup),
// keeping all the existing behavior (file readers, fetch posts, status banner).
// _JF (Jellyfin) and the runtime-refresh button still mount AFTER this table
// via their own patches; they don't fit the row pattern (they have their own
// internal forms).

const compDef = `_BK=function(){` +
  `var _f=r.useState(null),_file=_f[0],_setFile=_f[1];` +
  `var _u=r.useState(null),_status=_u[0],_setStatus=_u[1];` +
  `var _upload=function(){` +
    `if(!_file){return}` +
    `_setStatus({type:"loading",msg:"Subiendo..."});` +
    `fetch("/api/backup/restore",{method:"POST",credentials:"same-origin",body:_file,headers:{"Content-Type":"application/octet-stream"}})` +
      `.then(function(r){return r.json()})` +
      `.then(function(d){` +
        `if(d.ok){_setStatus({type:"success",msg:"Subido OK ("+d.size+" bytes). Reinicia el contenedor: docker compose restart mediatoc (luego el archivo data.db.uploaded sustituirá al actual)."})}` +
        `else{_setStatus({type:"error",msg:d.error||"Error desconocido"})}` +
      `})` +
      `.catch(function(e){_setStatus({type:"error",msg:String(e.message||e)})});` +
  `};` +
  // ----- Cell renderers (kept inline so the table reads top-to-bottom) -----
  `var _btnLink=function(href,label,icon,color){` +
    `return r.createElement("a",{href:href,download:true,className:"inline-flex items-center gap-2 px-3 py-1.5 rounded text-white "+color},` +
      `r.createElement("i",{className:"material-icons text-base"},icon),label` +
    `)` +
  `};` +
  `var _row=function(name,desc,control){` +
    `return r.createElement("tr",{className:"border-t border-slate-300 dark:border-slate-700"},` +
      `r.createElement("td",{className:"py-3 pr-3 align-top font-semibold whitespace-nowrap"},name),` +
      `r.createElement("td",{className:"py-3 pr-3 align-top text-sm text-gray-600 dark:text-gray-300"},desc),` +
      `r.createElement("td",{className:"py-3 align-top whitespace-nowrap"},control)` +
    `)` +
  `};` +
  // ----- File input renderers (Restore + Import JSON) -----
  `var _restoreCtl=r.createElement("div",{className:"flex flex-col gap-2"},` +
    `r.createElement("input",{type:"file",accept:".db",className:"text-sm",onChange:function(e){var f=e.currentTarget.files&&e.currentTarget.files[0];_setFile(f);_setStatus(null)}}),` +
    `_file?r.createElement("button",{onClick:_upload,className:"self-start inline-flex items-center gap-2 px-3 py-1.5 rounded text-white bg-orange-600 hover:bg-orange-700"},` +
      `r.createElement("i",{className:"material-icons text-base"},"file_upload"),xo._("Upload and restore")` +
    `):null` +
  `);` +
  `var _importCtl=r.createElement("div",{className:"flex flex-col gap-2"},` +
    `r.createElement("label",{className:"inline-flex items-center gap-2 text-sm"},` +
      `r.createElement("input",{type:"checkbox",id:"_imp_create",defaultChecked:!0}),` +
      `xo._("Create missing items")` +
    `),` +
    `r.createElement("input",{type:"file",accept:".json",className:"text-sm",onChange:function(e){var f=e.currentTarget.files&&e.currentTarget.files[0];if(!f)return;var createMissing=document.getElementById("_imp_create").checked;_setStatus({type:"loading",msg:"Importando "+f.name+"..."});var rd=new FileReader();rd.onload=function(){var raw=rd.result;try{var obj=JSON.parse(raw);obj.createMissing=createMissing;raw=JSON.stringify(obj)}catch(_){}fetch("/api/backup/import",{method:"POST",credentials:"same-origin",body:raw,headers:{"Content-Type":"application/json"}}).then(function(r){return r.json()}).then(function(d){if(d.error){_setStatus({type:"error",msg:d.error})}else{_setStatus({type:"success",msg:"Items: emparejados "+d.mediaItemsMatched+", creados "+(d.mediaItemsCreated||0)+", no encontrados "+d.mediaItemsMissing+" \\u00b7 Episodios "+d.episodesMatched+" \\u00b7 Listas: "+d.listsCreated+"+/"+d.listsExisting+"= \\u00b7 Visto: +"+d.seenImported+" (saltados "+d.seenSkipped+", sin emparejar "+d.seenMissing+") \\u00b7 Ratings: +"+d.ratingsImported+" \\u00b7 Progreso: +"+d.progressImported})}}).catch(function(e){_setStatus({type:"error",msg:String(e.message||e)})})};rd.readAsText(f)}})` +
  `);` +
  `var _cleanupCtl=r.createElement("button",{onClick:function(){if(confirm(xo._("Delete orphan catalog items?")))fetch("/api/catalog/cleanup",{method:"POST",credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){alert(d.ok?"Eliminados "+d.deleted+" items":"Error: "+(d.error||""))})},className:"inline-flex items-center gap-2 px-3 py-1.5 rounded text-white bg-red-700 hover:bg-red-800"},` +
    `r.createElement("i",{className:"material-icons text-base"},"delete_sweep"),xo._("Purge orphan catalog")` +
  `);` +
  `return r.createElement("div",{className:"mt-8 px-4 max-w-5xl mx-auto"},` +
    `r.createElement("h1",{className:"text-3xl font-bold mb-6"},xo._("Backup heading")),` +
    `r.createElement("table",{className:"w-full"},` +
      `r.createElement("thead",null,` +
        `r.createElement("tr",{className:"text-left text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400"},` +
          `r.createElement("th",{className:"py-2 pr-3 font-semibold w-48"},xo._("Action")),` +
          `r.createElement("th",{className:"py-2 pr-3 font-semibold"},xo._("Description")),` +
          `r.createElement("th",{className:"py-2 font-semibold w-72"},xo._("Control"))` +
        `)` +
      `),` +
      `r.createElement("tbody",null,` +
        `_row(xo._("Download .db (binary)"),xo._("Download backup desc"),` +
          `_btnLink("/api/backup",xo._("Download .db (binary)"),"file_download","bg-blue-600 hover:bg-blue-700"))` +
        `,_row(xo._("Export JSON"),xo._("Export JSON desc"),` +
          `_btnLink("/api/backup/export-json",xo._("Export JSON"),"data_object","bg-emerald-600 hover:bg-emerald-700"))` +
        `,_row(xo._("Letterboxd CSV"),xo._("Letterboxd-importable (movies only)"),` +
          `_btnLink("/api/backup/letterboxd",xo._("Letterboxd CSV"),"movie","bg-orange-500 hover:bg-orange-600"))` +
        `,_row(xo._("Restore"),xo._("Restore desc"),_restoreCtl)` +
        `,_row(xo._("Imports JSON"),xo._("Import JSON desc"),_importCtl)` +
        `,_row(xo._("Catalog cleanup"),xo._("Catalog cleanup desc"),_cleanupCtl)` +
        `,_row(xo._("Automatic backups"),xo._("Auto backups desc"),r.createElement("span",{className:"text-sm text-gray-500"},"\\u2014"))` +
      `)` +
    `),` +
    `_status?r.createElement("div",{className:"mt-4 p-3 rounded text-white "+(_status.type==="success"?"bg-green-700":_status.type==="error"?"bg-red-700":"bg-blue-700")},_status.msg):null` +
  `)` +
`},`;

const cardAnchor = '_v=function(e){';
if (c.includes('_BK=function(){var _f=r.useState')) {
  // Replace any prior _BK definition wholesale (so this patch's table layout
  // wins on rebuild without duplicating the component).
  c = c.replace(/_BK=function\(\)\{var _f=r\.useState[\s\S]*?\}\}\)\)\}\,(?=[\w_])/, compDef);
  console.log('backup frontend: _BK replaced (table layout)');
} else if (!c.includes(cardAnchor)) {
  console.error('backup frontend: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('backup frontend: injected _BK component (table layout)');
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
