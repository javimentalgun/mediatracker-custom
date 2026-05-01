const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

// Strip prior versions for idempotent re-applies
['youtubeOauthStart','youtubeOauthCallback','youtubeOauthStatus','youtubeOauthSync','youtubeOauthDelete'].forEach(name => {
  const re = new RegExp('  ' + name + ' = \\(0, _typescriptRoutesToOpenapiServer\\.createExpressRoute\\)\\(async \\(req, res\\) => \\{[\\s\\S]*?\\}\\);\\n', 'g');
  c = c.replace(re, '');
});

const method = `  youtubeOauthStart = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const userId = Number(req.user);
    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !redirectUri) { res.status(500).json({ error: 'GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI not configured' }); return; }
    if (!global._ytOauthStates) global._ytOauthStates = new Map();
    // GC stale states (>10 min)
    const cutoff = Date.now() - 600000;
    for (const [k, v] of global._ytOauthStates) { if (v.ts < cutoff) global._ytOauthStates.delete(k); }
    const state = require('crypto').randomBytes(16).toString('hex');
    global._ytOauthStates.set(state, { userId: userId, ts: Date.now() });
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' +
      'client_id=' + encodeURIComponent(clientId) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&response_type=code' +
      '&scope=' + encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly') +
      '&access_type=offline' +
      // prompt=consent forces re-consent so we always get a refresh_token even if the user
      // already authorized this app once before (Google only issues refresh_token on first consent otherwise).
      // prompt=select_account shows the account picker so users with multiple Google accounts can pick.
      '&prompt=' + encodeURIComponent('consent select_account') +
      '&state=' + state;
    res.redirect(url);
  });
  youtubeOauthCallback = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs');
    const reqUserId = Number(req.user);
    if (!reqUserId) { res.status(401).send('unauthenticated — log in to MediaTracker first and retry'); return; }
    const code = req.query.code;
    const state = req.query.state;
    const err = req.query.error;
    if (err) { res.status(400).send('Google authorization denied: ' + err); return; }
    if (!code || !state) { res.status(400).send('missing code or state'); return; }
    if (!global._ytOauthStates) global._ytOauthStates = new Map();
    const stateEntry = global._ytOauthStates.get(state);
    if (!stateEntry) { res.status(400).send('invalid or expired state'); return; }
    global._ytOauthStates.delete(state);
    if (Date.now() - stateEntry.ts > 600000) { res.status(400).send('expired state'); return; }
    if (stateEntry.userId !== reqUserId) { res.status(403).send('state user mismatch'); return; }
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenRes.json();
    if (tokens.error) { res.status(400).send('token exchange failed: ' + tokens.error_description || tokens.error); return; }
    let email = null;
    try {
      const u = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + tokens.access_token } });
      const info = await u.json();
      email = info.email || null;
    } catch (_) {}
    const file = '/storage/youtube-' + reqUserId + '.json';
    let data = { channels: [] };
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
    data.auth = {
      accessToken: tokens.access_token,
      // Keep prior refresh_token if Google didn't issue a new one (e.g. re-consent without prompt=consent)
      refreshToken: tokens.refresh_token || (data.auth && data.auth.refreshToken) || null,
      expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
      email: email,
      connectedAt: Date.now()
    };
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    res.redirect('/#/youtube');
  });
  youtubeOauthStatus = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs');
    const userId = Number(req.user);
    const file = '/storage/youtube-' + userId + '.json';
    let data = {};
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
    if (!data.auth || !data.auth.refreshToken) { res.json({ connected: false }); return; }
    res.json({ connected: true, email: data.auth.email || null, connectedAt: data.auth.connectedAt || null });
  });
  youtubeOauthSync = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs');
    const userId = Number(req.user);
    const file = '/storage/youtube-' + userId + '.json';
    let data = { channels: [] };
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
    if (!data.auth || !data.auth.refreshToken) { res.status(400).json({ error: 'not connected' }); return; }
    let accessToken = data.auth.accessToken;
    // Refresh if expired (or about to in <60s)
    if (Date.now() >= (data.auth.expiresAt - 60000)) {
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: data.auth.refreshToken,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token'
        })
      });
      const t = await r.json();
      if (t.error) { res.status(400).json({ error: 'refresh failed: ' + (t.error_description || t.error) }); return; }
      accessToken = t.access_token;
      data.auth.accessToken = accessToken;
      data.auth.expiresAt = Date.now() + (t.expires_in || 3600) * 1000;
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    }
    // Paginate subscriptions (50 per page, cap at 1000 total = 20 pages)
    const subs = [];
    let pageToken = '';
    for (let i = 0; i < 20; i++) {
      const url = 'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50&order=alphabetical' + (pageToken ? '&pageToken=' + pageToken : '');
      const r = await fetch(url, { headers: { Authorization: 'Bearer ' + accessToken } });
      const j = await r.json();
      if (j.error) { res.status(400).json({ error: 'subscriptions: ' + (j.error.message || JSON.stringify(j.error)) }); return; }
      for (const item of (j.items || [])) {
        const channelId = item.snippet && item.snippet.resourceId && item.snippet.resourceId.channelId;
        const name = item.snippet && item.snippet.title;
        if (channelId) subs.push({ id: channelId, name: name });
      }
      if (!j.nextPageToken) break;
      pageToken = j.nextPageToken;
    }
    const existing = new Set((data.channels || []).map(c => c.id));
    let added = 0;
    for (const s of subs) {
      if (!existing.has(s.id)) {
        data.channels.push({ id: s.id, name: s.name || s.id, addedAt: Date.now() });
        added++;
      }
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    res.json({ ok: true, total: subs.length, added: added, skipped: subs.length - added });
  });
  youtubeOauthDelete = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs');
    const userId = Number(req.user);
    const file = '/storage/youtube-' + userId + '.json';
    let data = {};
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
    if (data.auth && data.auth.refreshToken) {
      try { await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(data.auth.refreshToken), { method: 'POST' }); } catch (_) {}
    }
    delete data.auth;
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    res.json({ ok: true });
  });
`;

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('youtube oauth controller: anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('youtube oauth controller: 5 OAuth methods installed');
