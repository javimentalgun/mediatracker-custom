// Self-service TMDB API key management.
//
// MediaTracker's custom features (watchProviders, fetchEpisodeRuntimes) need
// a TMDB API key to call api.themoviedb.org. We support two equivalent ways
// to provide it:
//   1) `TMDB_API_KEY` env var in docker-compose.yml — preferred for prod.
//   2) UI: user pastes key in /settings/application-tokens, persisted to
//      `/storage/tmdb-key.json` (admin-only).
//
// The env var wins if both are set. The two consumer endpoints already chain
// env → file → 503 with a hint pointing at this UI section.
//
// Steps:
//   1. Backend: GET /api/tmdb/key  → { configured, source, masked } (admin-only).
//      Backend: PUT /api/tmdb/key  → set or clear (admin-only).
//   2. Frontend: `_TMDBKEY` React component (input + save + status row).
//      Mounted inside `_AT_EXT` after the YouTube section, wrapped in `my`.
//
// Idempotent: each step checks for a marker before mutating.

const fs = require('fs');
const child = require('child_process');

// === Backend: controller methods + routes =================================
{
  const ctrlPath = '/app/build/controllers/item.js';
  let c = fs.readFileSync(ctrlPath, 'utf8');

  // Strip prior versions for clean re-applies.
  ['tmdbKeyGet', 'tmdbKeyPut'].forEach(name => {
    const re = new RegExp('  ' + name + ' = \\(0, _typescriptRoutesToOpenapiServer\\.createExpressRoute\\)\\(async \\(req, res\\) => \\{[\\s\\S]*?\\}\\);\\n', 'g');
    c = c.replace(re, '');
  });

  const methods = `  tmdbKeyGet = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    if (!(await this.jellyfinIsAdmin(req, res))) return;
    const fs = require('fs');
    const envKey = process.env.TMDB_API_KEY;
    let fileKey = null;
    try { fileKey = (JSON.parse(fs.readFileSync('/storage/tmdb-key.json','utf8')).apiKey || '').trim() || null; } catch(_) {}
    const effective = envKey || fileKey;
    res.json({
      configured: !!effective,
      source: envKey ? 'env' : (fileKey ? 'file' : 'none'),
      masked: effective ? (effective.slice(0, 4) + '…' + effective.slice(-4)) : null,
      hasFileKey: !!fileKey,
    });
  });
  tmdbKeyPut = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    if (!(await this.jellyfinIsAdmin(req, res))) return;
    const fs = require('fs');
    const apiKey = (req.body && typeof req.body.apiKey === 'string') ? req.body.apiKey.trim() : '';
    const file = '/storage/tmdb-key.json';
    if (!apiKey) {
      // Empty body means "clear" — remove the file.
      try { fs.unlinkSync(file); } catch(_) {}
      res.json({ ok: true, cleared: true });
      return;
    }
    if (!/^[a-f0-9]{20,}$/i.test(apiKey)) {
      res.status(400).json({ error: 'Formato de TMDB API key inválido (se esperan ≥20 hex chars).' });
      return;
    }
    fs.writeFileSync(file, JSON.stringify({ apiKey }, null, 2));
    try { fs.chmodSync(file, 0o600); } catch(_) {}
    res.json({ ok: true });
  });
`;

  const anchor = '}\nexports.MediaItemController = MediaItemController;';
  if (!c.includes(anchor)) { console.error('tmdb user key: controller anchor not found'); process.exit(1); }
  c = c.replace(anchor, methods + anchor);
  fs.writeFileSync(ctrlPath, c);
  console.log('tmdb user key: installed tmdbKeyGet + tmdbKeyPut');
}

// === Backend: routes ======================================================
{
  const routesPath = '/app/build/generated/routes/routes.js';
  let c = fs.readFileSync(routesPath, 'utf8');
  const marker = '/* mt-fork: tmdb-user-key-routes */';
  if (c.includes(marker)) {
    console.log('tmdb user key: routes already wired');
  } else {
    const anchor = "router.get('/api/configuration', validatorHandler({}), _ConfigurationController.get);";
    if (!c.includes(anchor)) {
      console.error('tmdb user key: routes anchor not found'); process.exit(1);
    }
    const newRoutes =
      "\n" + marker + "\n" +
      "router.get('/api/tmdb/key', validatorHandler({}), _MediaItemController.tmdbKeyGet);\n" +
      "router.put('/api/tmdb/key', validatorHandler({}), _MediaItemController.tmdbKeyPut);";
    c = c.replace(anchor, anchor + newRoutes);
    fs.writeFileSync(routesPath, c);
    console.log('tmdb user key: wired GET/PUT /api/tmdb/key');
  }
}

// === Frontend: _TMDBKEY component + mount in _AT_EXT ======================
{
  const bundlePath = child.execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
  let c = fs.readFileSync(bundlePath, 'utf8');
  const marker = '/* mt-fork: tmdb-user-key */';
  if (c.includes(marker)) {
    console.log('tmdb user key: frontend already patched');
  } else {
    // Define _TMDBKEY just before the credentials wrapper anchor used by other
    // application-tokens additions.
    const compDef = '_TMDBKEY=function(){' +
      'var _i=r.useState(""),input=_i[0],setInput=_i[1];' +
      'var _b=r.useState(false),busy=_b[0],setBusy=_b[1];' +
      'var _s=r.useState(null),status=_s[0],setStatus=_s[1];' +
      'var _m=r.useState(null),msg=_m[0],setMsg=_m[1];' +
      'var load=function(){fetch("/api/tmdb/key",{credentials:"same-origin"}).then(function(r){return r.json()}).then(setStatus).catch(function(){})};' +
      'r.useEffect(load,[]);' +
      'var save=function(){' +
        'setBusy(true);setMsg(null);' +
        'fetch("/api/tmdb/key",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey:input.trim()})})' +
          '.then(function(r){return r.json()})' +
          '.then(function(d){setBusy(false);if(d.error){setMsg({type:"error",text:d.error})}else{setInput("");setMsg({type:"success",text:d.cleared?xo._("Key deleted."):xo._("Key saved.")});load()}})' +
          '.catch(function(e){setBusy(false);setMsg({type:"error",text:String(e.message||e)})})' +
      '};' +
      'var clearKey=function(){' +
        'if(!confirm(xo._("Confirm delete TMDB key")))return;' +
        'setBusy(true);setMsg(null);' +
        'fetch("/api/tmdb/key",{method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({apiKey:""})})' +
          '.then(function(r){return r.json()}).then(function(){setBusy(false);setMsg({type:"success",text:xo._("Key deleted.")});load()})' +
          '.catch(function(e){setBusy(false);setMsg({type:"error",text:String(e.message||e)})})' +
      '};' +
      'return r.createElement("div",{className:"pb-2"},' +
        'r.createElement("p",{className:"text-sm text-gray-600 dark:text-gray-300 mb-2"},' +
          'xo._("TMDB key info"),' +
          'r.createElement("a",{href:"https://www.themoviedb.org/settings/api",target:"_blank",rel:"noopener noreferrer",className:"underline text-blue-600 dark:text-blue-400"},"themoviedb.org/settings/api"),' +
          'xo._("TMDB key info suffix")' +
        '),' +
        'status?r.createElement("div",{className:"text-sm mb-2"},' +
          'status.configured' +
            '?r.createElement(r.Fragment,null,r.createElement("span",{className:"text-green-700 dark:text-green-400"},xo._("Configured")),' +
              '" \\u00b7 ",xo._("source:")," ",r.createElement("b",null,status.source),' +
              '" \\u00b7 ",r.createElement("code",{className:"px-1 bg-slate-100 dark:bg-slate-700 rounded"},status.masked))' +
            ':r.createElement("span",{className:"text-amber-600 dark:text-amber-400"},xo._("TMDB not configured warning"))' +
        '):null,' +
        'r.createElement("form",{className:"flex gap-2 items-center",onSubmit:function(e){e.preventDefault();save()}},' +
          'r.createElement("input",{type:"password",placeholder:xo._("Paste your TMDB API key"),value:input,onChange:function(e){setInput(e.currentTarget.value)},className:"flex-1 px-3 py-1 rounded border dark:bg-slate-800 dark:border-slate-600 text-sm",autoComplete:"off",spellCheck:"false"}),' +
          'r.createElement("button",{type:"submit",disabled:busy||!input.trim(),className:"px-3 py-1 rounded text-sm text-white bg-purple-700 hover:bg-purple-800 disabled:bg-gray-500 disabled:cursor-not-allowed"},busy?"...":xo._("Save")),' +
          '(status&&status.hasFileKey)?r.createElement("button",{type:"button",onClick:clearKey,disabled:busy,className:"px-3 py-1 rounded text-sm border border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900"},xo._("Delete")):null' +
        '),' +
        'msg?r.createElement("div",{className:"mt-2 text-sm "+(msg.type==="success"?"text-green-700 dark:text-green-400":"text-red-600 dark:text-red-400")},msg.text):null' +
      ')' +
    '},';

    // Inject component definition before _v anchor (same convention).
    const compAnchor = '_v=function(e){';
    if (!c.includes(compAnchor)) { console.error('tmdb user key: _v anchor not found'); process.exit(1); }
    c = c.replace(compAnchor, compDef + compAnchor);

    // Mount it inside _AT_EXT after the YouTube section. The existing tail is
    // `r.createElement(my,{title:"YouTube"},r.createElement(_YTAUTH,null))` —
    // append a sibling for TMDB. Wrapped in `my` for consistent card chrome.
    const mountAnchor = 'r.createElement(my,{title:"YouTube"},r.createElement(_YTAUTH,null))';
    if (!c.includes(mountAnchor)) {
      console.error('tmdb user key: _AT_EXT mount anchor not found (did patch_credentials_to_tokens run first?)');
      process.exit(1);
    }
    const mountReplacement = mountAnchor +
      ',r.createElement("div",{className:"mt-3"}),' +
      'r.createElement(my,{title:xo._("TMDB tokens")},r.createElement(_TMDBKEY,null))';
    c = c.replace(mountAnchor, mountReplacement);

    c = marker + c;
    fs.writeFileSync(bundlePath, c);

    // Invalidate compressed variants so the static server reflects the change.
    const path = require('path');
    for (const ext of ['.br', '.gz']) {
      const p = bundlePath + ext;
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); console.log('  removed stale ' + path.basename(p)); }
        catch (e) { console.error('  could not remove ' + p + ': ' + e.message); }
      }
    }
    console.log('tmdb user key: injected _TMDBKEY and mounted in _AT_EXT');
  }
}
