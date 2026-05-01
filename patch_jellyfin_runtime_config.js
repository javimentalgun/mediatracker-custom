const fs = require('fs');

// === 1. item.js: install _jfCfg helper, replace env reads, add config GET/PUT methods ===
{
  const p = '/app/build/controllers/item.js';
  let c = fs.readFileSync(p, 'utf8');

  // Replace env reads with helper calls FIRST, then inject the helper. Doing it
  // in the other order would also rewrite `process.env.JELLYFIN_URL` *inside*
  // the helper itself → infinite recursion (the v0.1.7 bug). The helper aliases
  // `process.env` as `_e` so the regex below also can't match its body on re-runs.
  c = c.replace(/process\.env\.JELLYFIN_API_KEY/g, '_jfCfg().apiKey');
  c = c.replace(/process\.env\.JELLYFIN_URL/g, '_jfCfg().url');
  c = c.replace(/process\.env\.JELLYFIN_USER_ID/g, '_jfCfg().userId');
  c = c.replace(/process\.env\.JELLYFIN_PUBLIC_URL/g, '_jfCfg().publicUrl');

  if (!c.includes('function _jfCfg()')) {
    // Sync read of /storage/jellyfin-config.json on each call. File overrides env.
    // No caching — file is tiny and write-frequency is essentially zero.
    const helper =
      "\nfunction _jfCfg() {\n" +
      "  const _e = process.env;\n" +
      "  let f = {};\n" +
      "  try { f = JSON.parse(require('fs').readFileSync('/storage/jellyfin-config.json', 'utf8')); } catch (_) {}\n" +
      "  return {\n" +
      "    url: f.url || _e.JELLYFIN_URL || '',\n" +
      "    apiKey: f.apiKey || _e.JELLYFIN_API_KEY || '',\n" +
      "    userId: f.userId || _e.JELLYFIN_USER_ID || '',\n" +
      "    publicUrl: f.publicUrl || _e.JELLYFIN_PUBLIC_URL || '',\n" +
      "    reverseSync: (f.reverseSync !== undefined ? !!f.reverseSync : _e.JELLYFIN_REVERSE_SYNC === 'true'),\n" +
      "  };\n" +
      "}\n";
    const classAnchor = 'class MediaItemController';
    if (!c.includes(classAnchor)) { console.error('jellyfin runtime config: class anchor not found in item.js'); process.exit(1); }
    c = c.replace(classAnchor, helper + '\n' + classAnchor);
  }

  // Add jellyfinGetConfig / jellyfinSaveConfig methods. Both admin-gated via jellyfinIsAdmin
  // (installed by patch_jellyfin_admin_only.js, which must run before this patch).
  if (!c.includes('jellyfinGetConfig =')) {
    const cfgMethods =
      "  jellyfinGetConfig = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
      "    if (!(await this.jellyfinIsAdmin(req, res))) return;\n" +
      "    const fs = require('fs');\n" +
      "    let f = {};\n" +
      "    try { f = JSON.parse(fs.readFileSync('/storage/jellyfin-config.json', 'utf8')); } catch (_) {}\n" +
      "    res.json({\n" +
      "      url: f.url || '',\n" +
      "      apiKey: '',\n" +
      "      apiKeySet: !!f.apiKey,\n" +
      "      userId: f.userId || '',\n" +
      "      publicUrl: f.publicUrl || '',\n" +
      "      reverseSync: !!f.reverseSync,\n" +
      "      envFallback: { url: !!process.env.JELLYFIN_URL, apiKey: !!process.env.JELLYFIN_API_KEY, userId: !!process.env.JELLYFIN_USER_ID, publicUrl: !!process.env.JELLYFIN_PUBLIC_URL }\n" +
      "    });\n" +
      "  });\n" +
      "  jellyfinSaveConfig = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {\n" +
      "    if (!(await this.jellyfinIsAdmin(req, res))) return;\n" +
      "    const fs = require('fs');\n" +
      "    const body = req.body || {};\n" +
      "    let current = {};\n" +
      "    try { current = JSON.parse(fs.readFileSync('/storage/jellyfin-config.json', 'utf8')); } catch (_) {}\n" +
      "    // apiKey: empty string means 'leave existing'; explicit null means 'clear'.\n" +
      "    const merged = {\n" +
      "      url: body.url !== undefined ? String(body.url || '').trim() : (current.url || ''),\n" +
      "      apiKey: body.apiKey === null ? '' : (body.apiKey ? String(body.apiKey).trim() : (current.apiKey || '')),\n" +
      "      userId: body.userId !== undefined ? String(body.userId || '').trim() : (current.userId || ''),\n" +
      "      publicUrl: body.publicUrl !== undefined ? String(body.publicUrl || '').trim() : (current.publicUrl || ''),\n" +
      "      reverseSync: body.reverseSync !== undefined ? !!body.reverseSync : !!current.reverseSync,\n" +
      "    };\n" +
      "    try { fs.writeFileSync('/storage/jellyfin-config.json', JSON.stringify(merged, null, 2), { mode: 0o600 }); }\n" +
      "    catch (e) { res.status(500).json({ error: e.message }); return; }\n" +
      "    if (global._jfLookupCache) global._jfLookupCache.clear();\n" +
      "    if (global._jfLibCache) global._jfLibCache.clear();\n" +
      "    if (global._jfReverseCache) global._jfReverseCache.clear();\n" +
      "    res.json({ ok: true });\n" +
      "  });\n";
    c = c.replace('  jellyfinFetch = async', cfgMethods + '  jellyfinFetch = async');
  }

  fs.writeFileSync(p, c);
  console.log('jellyfin runtime config: item.js patched');
}

// === 2. seen.js: install _jfCfg helper and replace env reads in reverse-sync path ===
{
  const p = '/app/build/controllers/seen.js';
  let c = fs.readFileSync(p, 'utf8');

  // Same ordering as item.js: rewrite env reads first, then inject the helper
  // (which uses the `_e` alias so its own body never matches the regex).
  c = c.replace("if (process.env.JELLYFIN_REVERSE_SYNC !== 'true') return;", "if (!_jfCfg().reverseSync) return;");
  c = c.replace(/process\.env\.JELLYFIN_API_KEY/g, '_jfCfg().apiKey');
  c = c.replace(/process\.env\.JELLYFIN_URL/g, '_jfCfg().url');
  c = c.replace(/process\.env\.JELLYFIN_USER_ID/g, '_jfCfg().userId');
  c = c.replace(/process\.env\.JELLYFIN_PUBLIC_URL/g, '_jfCfg().publicUrl');

  if (!c.includes('function _jfCfg()')) {
    const helper =
      "\nfunction _jfCfg() {\n" +
      "  const _e = process.env;\n" +
      "  let f = {};\n" +
      "  try { f = JSON.parse(require('fs').readFileSync('/storage/jellyfin-config.json', 'utf8')); } catch (_) {}\n" +
      "  return {\n" +
      "    url: f.url || _e.JELLYFIN_URL || '',\n" +
      "    apiKey: f.apiKey || _e.JELLYFIN_API_KEY || '',\n" +
      "    userId: f.userId || _e.JELLYFIN_USER_ID || '',\n" +
      "    publicUrl: f.publicUrl || _e.JELLYFIN_PUBLIC_URL || '',\n" +
      "    reverseSync: (f.reverseSync !== undefined ? !!f.reverseSync : _e.JELLYFIN_REVERSE_SYNC === 'true'),\n" +
      "  };\n" +
      "}\n";
    const anchor = 'exports.SeenController = void 0;';
    if (!c.includes(anchor)) { console.error('jellyfin runtime config: seen.js anchor not found'); process.exit(1); }
    c = c.replace(anchor, anchor + helper);
  }

  fs.writeFileSync(p, c);
  console.log('jellyfin runtime config: seen.js patched');
}

// === 3. routes.js: register /api/jellyfin/config GET + PUT ===
{
  const p = '/app/build/generated/routes/routes.js';
  let c = fs.readFileSync(p, 'utf8');

  if (c.includes("/api/jellyfin/config'")) {
    console.log('jellyfin runtime config: routes already registered');
  } else {
    const anchor = "router.get('/api/jellyfin/status'";
    if (!c.includes(anchor)) { console.error('jellyfin runtime config: routes anchor not found'); process.exit(1); }
    const route =
      "router.get('/api/jellyfin/config', validatorHandler({}), _MediaItemController.jellyfinGetConfig);\n" +
      "router.put('/api/jellyfin/config', validatorHandler({}), _MediaItemController.jellyfinSaveConfig);\n";
    c = c.replace(anchor, route + anchor);
    fs.writeFileSync(p, c);
    console.log('jellyfin runtime config: routes registered');
  }
}
