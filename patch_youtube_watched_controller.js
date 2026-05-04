const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

// Per-user "marked as watched" tracking for YouTube videos. Storage extends
// /storage/youtube-<userId>.json with a `watched` array. Each entry has the
// video id, channel id, title, thumbnail, durationSeconds, watchedAt.
//
// Duration comes from YouTube Data API v3 (videos?id=X&part=contentDetails),
// authenticated with the user's OAuth access token (requires the user to have
// connected via Google OAuth — patch_youtube_oauth_controller.js).
//
// Endpoints:
//   POST   /api/youtube/watched           body: {videoId, channelId, channelName, title, thumbnail, url}
//   DELETE /api/youtube/watched/:videoId
//   GET    /api/youtube/watched-stats     → {count, totalSeconds, totalMinutes}

// Strip prior versions so re-applies are idempotent.
['youtubeMarkWatched', 'youtubeUnmarkWatched', 'youtubeWatchedStats', 'youtubeRefreshToken', 'youtubeParseDuration'].forEach(name => {
  const re = new RegExp('  ' + name + ' = (?:\\(0, _typescriptRoutesToOpenapiServer\\.createExpressRoute\\)\\(async \\(req, res\\) => \\{|async (?:\\(\\w*\\) => \\{|function|\\w*\\s*\\([^)]*\\) \\{))[\\s\\S]*?\\n  \\}\\)?;\\n', 'g');
  c = c.replace(re, '');
});
// Also strip the standalone helpers (regex above is conservative — match these explicitly)
c = c.replace(/  _ytParseDuration = [\s\S]*?\n  \};\n/g, '');
c = c.replace(/  _ytRefreshToken = async [\s\S]*?\n  \};\n/g, '');

const method = `  _ytParseDuration = (iso) => {
    // ISO 8601 duration: PT#H#M#S (any field optional). Returns seconds.
    if (!iso || typeof iso !== 'string') return 0;
    const m = iso.match(/^PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?$/);
    if (!m) return 0;
    const h = Number(m[1] || 0), mn = Number(m[2] || 0), s = Number(m[3] || 0);
    return h * 3600 + mn * 60 + s;
  };
  _ytRefreshToken = async (data, file) => {
    // Refresh the OAuth access token if it's expired (or expires in <60s).
    // Mutates and persists \`data.auth\`. Returns the access token.
    const fs = require('fs').promises;
    if (!data.auth || !data.auth.refreshToken) throw new Error('Google OAuth not connected (Settings → YouTube)');
    if (Date.now() < (data.auth.expiresAt - 60000)) return data.auth.accessToken;
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
    if (t.error) throw new Error('refresh failed: ' + (t.error_description || t.error));
    data.auth.accessToken = t.access_token;
    data.auth.expiresAt = Date.now() + (t.expires_in || 3600) * 1000;
    { const _wTmp = file + '.tmp.' + process.pid; await fs.writeFile(_wTmp, JSON.stringify(data, null, 2)); await fs.rename(_wTmp, file); }
    return t.access_token;
  };
  youtubeMarkWatched = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs').promises;
    const userId = Number(req.user);
    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }
    const file = '/storage/youtube-' + userId + '.json';
    const body = req.body || {};
    const videoId = String(body.videoId || '').trim();
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) { res.status(400).json({ error: 'videoId requerido (11 chars)' }); return; }
    let data = { channels: [], watched: [] };
    try { data = JSON.parse(await fs.readFile(file, 'utf8')); } catch (_) {}
    if (!Array.isArray(data.watched)) data.watched = [];
    if (data.watched.find(w => w.videoId === videoId)) {
      res.json({ ok: true, alreadyMarked: true });
      return;
    }
    let durationSeconds = 0;
    // Try OAuth-based YouTube Data API first (more reliable, has rate limits but
    // returns clean ISO 8601 duration). Fall back to scraping the watch page for
    // \`lengthSeconds\` so users without an OAuth-linked Google account can still
    // use the feature.
    let oauthErr = null;
    try {
      const accessToken = await this._ytRefreshToken(data, file);
      const r = await fetch('https://www.googleapis.com/youtube/v3/videos?id=' + encodeURIComponent(videoId) + '&part=contentDetails', {
        headers: { Authorization: 'Bearer ' + accessToken }
      });
      const j = await r.json();
      if (j.error) throw new Error('YouTube API: ' + (j.error.message || JSON.stringify(j.error)));
      const item = (j.items || [])[0];
      if (!item) throw new Error('video no encontrado en YouTube');
      durationSeconds = this._ytParseDuration(item.contentDetails && item.contentDetails.duration);
    } catch (e) {
      oauthErr = e.message;
    }
    if (!durationSeconds) {
      try {
        const r = await fetch('https://www.youtube.com/watch?v=' + encodeURIComponent(videoId), {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' }
        });
        const html = await r.text();
        const m = html.match(/\"lengthSeconds\":\"(\\d+)\"/);
        if (m) durationSeconds = Number(m[1]);
      } catch (_) {}
    }
    if (!durationSeconds) {
      res.status(400).json({ error: 'No se pudo obtener la duraci\\u00f3n del v\\u00eddeo' + (oauthErr ? ' (OAuth: ' + oauthErr + ')' : '') });
      return;
    }
    data.watched.push({
      videoId,
      channelId: body.channelId ? String(body.channelId) : null,
      channelName: body.channelName ? String(body.channelName) : null,
      title: body.title ? String(body.title) : null,
      thumbnail: body.thumbnail ? String(body.thumbnail) : null,
      url: body.url ? String(body.url) : ('https://www.youtube.com/watch?v=' + videoId),
      durationSeconds,
      watchedAt: Date.now()
    });
    try { { const _wTmp = file + '.tmp.' + process.pid; await fs.writeFile(_wTmp, JSON.stringify(data, null, 2)); await fs.rename(_wTmp, file); } }
    catch (e) { res.status(500).json({ error: 'persist failed: ' + e.message }); return; }
    res.json({ ok: true, durationSeconds });
  });
  youtubeUnmarkWatched = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs').promises;
    const userId = Number(req.user);
    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }
    const file = '/storage/youtube-' + userId + '.json';
    const videoId = String(req.params.videoId || '').trim();
    if (!videoId) { res.status(400).json({ error: 'videoId requerido' }); return; }
    let data = { channels: [], watched: [] };
    try { data = JSON.parse(await fs.readFile(file, 'utf8')); } catch (_) {}
    if (!Array.isArray(data.watched)) data.watched = [];
    const before = data.watched.length;
    data.watched = data.watched.filter(w => w.videoId !== videoId);
    if (data.watched.length === before) { res.status(404).json({ error: 'no marcado' }); return; }
    try { { const _wTmp = file + '.tmp.' + process.pid; await fs.writeFile(_wTmp, JSON.stringify(data, null, 2)); await fs.rename(_wTmp, file); } }
    catch (e) { res.status(500).json({ error: e.message }); return; }
    res.json({ ok: true });
  });
  youtubeWatchedStats = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs').promises;
    const userId = Number(req.user);
    if (!userId) { res.status(401).json({ error: 'unauthenticated' }); return; }
    const file = '/storage/youtube-' + userId + '.json';
    let data = { channels: [], watched: [] };
    try { data = JSON.parse(await fs.readFile(file, 'utf8')); } catch (_) {}
    const arr = Array.isArray(data.watched) ? data.watched : [];
    const totalSeconds = arr.reduce((sum, w) => sum + (Number(w.durationSeconds) || 0), 0);
    res.json({ count: arr.length, totalSeconds, totalMinutes: Math.round(totalSeconds / 60), videoIds: arr.map(w => w.videoId) });
  });
`;

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('youtube watched controller: anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('youtube watched controller: added mark/unmark/stats + helpers');
