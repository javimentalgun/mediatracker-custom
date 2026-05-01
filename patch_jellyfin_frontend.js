const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// 1. Inject _JF (Jellyfin section) component before _BK (backup) so _BK can mount it
const compDef = '_JF=function(){' +
  'var _s=r.useState(null),_st=_s[0],_setSt=_s[1];' +
  'var _b=r.useState(false),_busy=_b[0],_setBusy=_b[1];' +
  'var _m=r.useState(null),_msg=_m[0],_setMsg=_m[1];' +
  'var _load=function(){fetch("/api/jellyfin/status",{credentials:"same-origin"}).then(function(r){return r.json()}).then(_setSt).catch(function(e){_setSt({error:String(e)})})};' +
  'r.useEffect(_load,[]);' +
  'var _sync=function(){_setBusy(true);_setMsg({type:"loading",text:"Sincronizando con Jellyfin..."});' +
    'fetch("/api/jellyfin/sync",{method:"POST",credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){' +
      '_setBusy(false);' +
      'if(d.error){_setMsg({type:"error",text:"Error: "+d.error})}' +
      'else{_setMsg({type:"success",text:"Importados: "+d.lastImported+" | Saltados: "+d.lastSkipped+" | Sin emparejar: "+d.lastUnmatched+" | Total revisados: "+d.lastTotal});_load()}' +
    '}).catch(function(e){_setBusy(false);_setMsg({type:"error",text:String(e.message||e)})})};' +
  'if(!_st)return r.createElement("p",{className:"text-gray-500"},"Cargando estado de Jellyfin...");' +
  'if(_st.configured===false)return r.createElement("div",{className:"p-3 bg-yellow-100 dark:bg-yellow-900 rounded text-sm"},' +
    'r.createElement("b",null,"Jellyfin no configurado."),' +
    'r.createElement("p",{className:"mt-1"},"A\\u00f1ade en docker-compose.yml las variables JELLYFIN_URL y JELLYFIN_API_KEY (y opcionalmente JELLYFIN_USER_ID), luego reinicia el contenedor.")' +
  ');' +
  'var _statusBadge=_st.connected?' +
    'r.createElement("span",{className:"inline-flex items-center px-2 py-1 rounded bg-green-700 text-white text-sm gap-1"},r.createElement("i",{className:"material-icons text-base"},"check_circle"),"Conectado a "+(_st.serverName||"Jellyfin")+(_st.version?" v"+_st.version:"")):' +
    'r.createElement("span",{className:"inline-flex items-center px-2 py-1 rounded bg-red-700 text-white text-sm gap-1"},r.createElement("i",{className:"material-icons text-base"},"error"),"Sin conexi\\u00f3n: "+(_st.error||"desconocido"));' +
  'return r.createElement("div",{className:"flex flex-col gap-3"},' +
    '_statusBadge,' +
    '_st.lastSync?r.createElement("p",{className:"text-sm text-gray-600 dark:text-gray-300"},"\\u00daltima sincronizaci\\u00f3n: "+new Date(_st.lastSync).toLocaleString("es")+" \\u2014 importados: "+(_st.lastImported||0)+", saltados: "+(_st.lastSkipped||0)+", sin emparejar: "+(_st.lastUnmatched||0)):r.createElement("p",{className:"text-sm text-gray-500"},"Nunca sincronizado."),' +
    'r.createElement("button",{onClick:_sync,disabled:_busy||!_st.connected,className:"self-start px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded shadow inline-flex items-center gap-2"},' +
      'r.createElement("i",{className:"material-icons"},_busy?"hourglass_top":"sync"),' +
      '_busy?"Sincronizando...":"Sincronizar ahora"' +
    '),' +
    '_msg?r.createElement("div",{className:"p-3 rounded text-white "+(_msg.type==="success"?"bg-green-700":_msg.type==="error"?"bg-red-700":"bg-blue-700")},_msg.text):null,' +
    'r.createElement("p",{className:"text-xs text-gray-500 mt-2"},"Empareja por TMDB/IMDB/TVDB id. Pel\\u00edculas vistas y episodios marcados como reproducidos en Jellyfin se importan al hist\\u00f3rico de MediaTracker.")' +
  ')' +
'},';

const cardAnchor = '_v=function(e){';
if (c.includes('_JF=function(){var _s=r.useState')) {
  console.log('jellyfin frontend: _JF already injected');
} else if (!c.includes(cardAnchor)) {
  console.error('jellyfin frontend: _v anchor not found'); process.exit(1);
} else {
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('jellyfin frontend: injected _JF component');
}

// 2. Inject Jellyfin section into _BK (between Catalog cleanup and Auto-backup info)
const bkAnchor = 'r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},xo._("Automatic backups"))';
const bkPatched = 'r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},"Jellyfin"),r.createElement(_JF,null),' + bkAnchor;
if (c.includes('r.createElement(_JF,null)')) {
  console.log('jellyfin frontend: _JF already mounted in _BK');
} else if (!c.includes(bkAnchor)) {
  console.error('jellyfin frontend: _BK anchor (Backups automáticos) not found'); process.exit(1);
} else {
  c = c.replace(bkAnchor, bkPatched);
  console.log('jellyfin frontend: mounted _JF inside _BK page (above Backups automáticos)');
}

fs.writeFileSync(bundlePath, c);
console.log('jellyfin frontend: complete');
