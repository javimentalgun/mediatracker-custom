const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// _JF: Jellyfin section in /backup. Two modes (view / edit). View shows status badge + sync button.
// Edit shows a form with URL, API key, user id, public URL, reverseSync. The form starts open
// when neither file nor env has any config, and is reachable via "Editar configuración" otherwise.
const compDef = '_JF=function(){' +
  // hooks
  'var _s=r.useState(null),st=_s[0],setSt=_s[1];' +
  'var _g=r.useState(null),cfg=_g[0],setCfg=_g[1];' +
  'var _e=r.useState(false),edit=_e[0],setEdit=_e[1];' +
  'var _f=r.useState({url:"",apiKey:"",userId:"",publicUrl:"",reverseSync:false}),form=_f[0],setForm=_f[1];' +
  'var _b=r.useState(false),busy=_b[0],setBusy=_b[1];' +
  'var _m=r.useState(null),msg=_m[0],setMsg=_m[1];' +
  // data loaders
  'var loadStatus=function(){fetch("/api/jellyfin/status",{credentials:"same-origin"}).then(function(r){return r.json()}).then(setSt).catch(function(e){setSt({error:String(e)})})};' +
  'var loadCfg=function(){fetch("/api/jellyfin/config",{credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){' +
    'setCfg(d);' +
    'setForm({url:d.url||"",apiKey:"",userId:d.userId||"",publicUrl:d.publicUrl||"",reverseSync:!!d.reverseSync});' +
    'if(!d.url&&!d.apiKeySet&&!(d.envFallback&&(d.envFallback.url||d.envFallback.apiKey)))setEdit(true);' +
  '}).catch(function(){})};' +
  'r.useEffect(function(){loadStatus();loadCfg()},[]);' +
  // save handler
  'var save=function(){' +
    'setBusy(true);setMsg({type:"loading",text:"Guardando..."});' +
    'fetch("/api/jellyfin/config",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}).then(function(r){return r.json()}).then(function(d){' +
      'setBusy(false);' +
      'if(d.error){setMsg({type:"error",text:"Error: "+d.error});return}' +
      'setMsg({type:"success",text:"Configuraci\\u00f3n guardada"});' +
      'setEdit(false);loadStatus();loadCfg();' +
    '}).catch(function(e){setBusy(false);setMsg({type:"error",text:String(e.message||e)})})};' +
  // sync handler
  'var sync=function(){' +
    'setBusy(true);setMsg({type:"loading",text:"Sincronizando con Jellyfin..."});' +
    'fetch("/api/jellyfin/sync",{method:"POST",credentials:"same-origin"}).then(function(r){return r.json()}).then(function(d){' +
      'setBusy(false);' +
      'if(d.error){setMsg({type:"error",text:"Error: "+d.error})}' +
      'else{setMsg({type:"success",text:"Importados: "+d.lastImported+" | Saltados: "+d.lastSkipped+" | Sin emparejar: "+d.lastUnmatched+" | Total revisados: "+d.lastTotal});loadStatus()}' +
    '}).catch(function(e){setBusy(false);setMsg({type:"error",text:String(e.message||e)})})};' +
  // loading guard
  'if(!st||!cfg)return r.createElement("p",{className:"text-gray-500"},"Cargando estado de Jellyfin...");' +
  // status badge
  'var statusBadge;' +
  'if(st.configured&&st.connected){' +
    'statusBadge=r.createElement("span",{className:"inline-flex items-center px-2 py-1 rounded bg-green-700 text-white text-sm gap-1"},r.createElement("i",{className:"material-icons text-base"},"check_circle"),"Conectado a "+(st.serverName||"Jellyfin")+(st.version?" v"+st.version:""));' +
  '}else if(st.configured){' +
    'statusBadge=r.createElement("span",{className:"inline-flex items-center px-2 py-1 rounded bg-red-700 text-white text-sm gap-1"},r.createElement("i",{className:"material-icons text-base"},"error"),"Sin conexi\\u00f3n: "+(st.error||"desconocido"));' +
  '}else{' +
    'statusBadge=r.createElement("span",{className:"inline-flex items-center px-2 py-1 rounded bg-gray-600 text-white text-sm gap-1"},r.createElement("i",{className:"material-icons text-base"},"info"),"No configurado");' +
  '}' +
  'var lastSync=st.lastSync?r.createElement("p",{className:"text-sm text-gray-600 dark:text-gray-300"},"\\u00daltima sincronizaci\\u00f3n: "+new Date(st.lastSync).toLocaleString("es")+" \\u2014 importados: "+(st.lastImported||0)+", saltados: "+(st.lastSkipped||0)+", sin emparejar: "+(st.lastUnmatched||0)):null;' +
  // build children
  'var children=[statusBadge,lastSync];' +
  'if(edit){' +
    // form helpers (input field generator)
    'var inp=function(label,key,type,placeholder){' +
      'return r.createElement("label",{key:key,className:"flex flex-col text-sm gap-1"},' +
        'r.createElement("span",{className:"text-gray-700 dark:text-gray-300"},label),' +
        'r.createElement("input",{type:type||"text",value:form[key],placeholder:placeholder||"",' +
          'onChange:function(e){var nv={};nv[key]=e.target.value;setForm(Object.assign({},form,nv))},' +
          'className:"px-2 py-1 border rounded bg-white dark:bg-gray-800 dark:border-gray-600"})' +
      ')' +
    '};' +
    'children.push(r.createElement("div",{key:"jfForm",className:"flex flex-col gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded"},' +
      'r.createElement("h3",{className:"font-semibold"},"Configuraci\\u00f3n de Jellyfin"),' +
      'inp("URL del servidor (ej. http://jellyfin:8096)","url","url","http://jellyfin:8096"),' +
      'inp("API key"+(cfg.apiKeySet?" (deja vac\\u00edo para mantener la actual)":""),"apiKey","password",cfg.apiKeySet?"\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022":"API key"),' +
      'inp("User ID (opcional, primer usuario por defecto)","userId","text",""),' +
      'inp("URL p\\u00fablica (para el bot\\u00f3n Reproducir en Jellyfin)","publicUrl","url","https://jellyfin.midominio.com"),' +
      'r.createElement("label",{className:"inline-flex items-center gap-2 mt-1"},' +
        'r.createElement("input",{type:"checkbox",checked:!!form.reverseSync,onChange:function(e){setForm(Object.assign({},form,{reverseSync:e.target.checked}))}}),' +
        'r.createElement("span",null,"Reverse-sync (al marcar visto en MT, marcar reproducido en Jellyfin)")' +
      '),' +
      'r.createElement("div",{className:"flex gap-2 mt-2"},' +
        'r.createElement("button",{onClick:save,disabled:busy,className:"px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-500 text-white rounded inline-flex items-center gap-2"},' +
          'r.createElement("i",{className:"material-icons"},"save"),' +
          'busy?"Guardando...":"Guardar"' +
        '),' +
        '(st.configured||cfg.apiKeySet)?r.createElement("button",{onClick:function(){setEdit(false);setMsg(null);loadCfg()},className:"px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"},"Cancelar"):null' +
      ')' +
    '));' +
  '}else{' +
    'children.push(r.createElement("div",{key:"jfActions",className:"flex gap-2 flex-wrap"},' +
      'r.createElement("button",{onClick:sync,disabled:busy||!st.connected,className:"px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded shadow inline-flex items-center gap-2"},' +
        'r.createElement("i",{className:"material-icons"},busy?"hourglass_top":"sync"),' +
        'busy?"Sincronizando...":"Sincronizar ahora"' +
      '),' +
      'r.createElement("button",{onClick:function(){setEdit(true)},className:"px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded inline-flex items-center gap-2"},' +
        'r.createElement("i",{className:"material-icons text-base"},"edit"),' +
        '"Editar configuraci\\u00f3n"' +
      ')' +
    '));' +
  '}' +
  'if(msg)children.push(r.createElement("div",{key:"jfMsg",className:"p-3 rounded text-white "+(msg.type==="success"?"bg-green-700":msg.type==="error"?"bg-red-700":"bg-blue-700")},msg.text));' +
  'children.push(r.createElement("p",{key:"jfHelp",className:"text-xs text-gray-500 mt-2"},"Empareja por TMDB/IMDB/TVDB id. Pel\\u00edculas vistas y episodios marcados como reproducidos en Jellyfin se importan al hist\\u00f3rico de MediaTracker."));' +
  'return r.createElement("div",{className:"flex flex-col gap-3"},children)' +
'},';

// Replace any prior _JF definition. The previous patch ended _JF=function(){...} with a
// trailing "})," — we use a fence comment to keep this idempotent across revisions.
if (c.includes('_JF=function(){')) {
  // Find the start of _JF and walk braces to find its end (the comma after the closing })
  const start = c.indexOf('_JF=function(){');
  let i = c.indexOf('{', start);
  let depth = 1;
  i++;
  while (i < c.length && depth > 0) {
    const ch = c[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '"' || ch === "'") {
      // Skip string literal
      const q = ch;
      i++;
      while (i < c.length && c[i] !== q) {
        if (c[i] === '\\') i++;
        i++;
      }
    }
    i++;
  }
  // i now points just past the closing }; expect ","
  while (i < c.length && c[i] !== ',') i++;
  if (i < c.length) i++; // consume the comma
  c = c.slice(0, start) + compDef + c.slice(i);
  console.log('jellyfin frontend: replaced existing _JF with config-form variant');
} else {
  const cardAnchor = '_v=function(e){';
  if (!c.includes(cardAnchor)) { console.error('jellyfin frontend: _v anchor not found'); process.exit(1); }
  c = c.replace(cardAnchor, compDef + cardAnchor);
  console.log('jellyfin frontend: injected _JF component (config-form variant)');
}

// Mount _JF inside _BK between Catalog cleanup and Auto-backup. Idempotent.
const bkAnchor = 'r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},xo._("Automatic backups"))';
const bkPatched = 'r.createElement("h2",{className:"text-xl font-bold mt-10 mb-2 self-start"},"Jellyfin"),r.createElement(_JF,null),' + bkAnchor;
if (c.includes('r.createElement(_JF,null)')) {
  console.log('jellyfin frontend: _JF already mounted in _BK');
} else if (!c.includes(bkAnchor)) {
  console.error('jellyfin frontend: _BK anchor (Automatic backups) not found'); process.exit(1);
} else {
  c = c.replace(bkAnchor, bkPatched);
  console.log('jellyfin frontend: mounted _JF inside _BK page');
}

fs.writeFileSync(bundlePath, c);
console.log('jellyfin frontend: complete');
