const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

// Strip prior versions for idempotent re-applies
['youtubeChannels','youtubeAddChannel','youtubeDeleteChannel','youtubeFeed'].forEach(name => {
  const re = new RegExp('  ' + name + ' = \\(0, _typescriptRoutesToOpenapiServer\\.createExpressRoute\\)\\(async \\(req, res\\) => \\{[\\s\\S]*?\\}\\);\\n', 'g');
  c = c.replace(re, '');
});

const method = `  youtubeChannels = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs');
    const userId = Number(req.user);
    const file = '/storage/youtube-' + userId + '.json';
    let data = { channels: [] };
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
    res.json(data.channels || []);
  });
  youtubeAddChannel = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs');
    const userId = Number(req.user);
    const file = '/storage/youtube-' + userId + '.json';
    const input = (req.body && req.body.input || '').trim();
    if (!input) { res.status(400).json({ error: 'input requerido' }); return; }
    // Resolve to channel ID + name
    let channelId = null, name = null;
    const m = input.match(/(?:channel\\/)?(UC[A-Za-z0-9_-]{20,24})/);
    if (m) channelId = m[1];
    if (!channelId) {
      // Try to resolve @handle or username via fetch.
      // SSRF mitigation: only allow URLs to youtube.com/youtu.be — otherwise an attacker
      // could pivot to internal services on the docker network (http://jellyfin:8096, etc.)
      let url = input;
      if (!url.startsWith('http')) {
        if (url.startsWith('@')) url = 'https://www.youtube.com/' + url;
        else url = 'https://www.youtube.com/@' + url;
      } else {
        try {
          const u = new URL(url);
          const host = u.hostname.toLowerCase();
          const allowed = host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com' || host === 'youtu.be';
          if (!allowed || u.protocol !== 'https:') {
            res.status(400).json({ error: 'Solo se aceptan URLs de youtube.com / youtu.be' }); return;
          }
        } catch (_) {
          res.status(400).json({ error: 'URL inválida' }); return;
        }
      }
      let fetchStatus = null;
      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        fetchStatus = r.status;
        const html = await r.text();
        // Prefer the canonical link (always points to the page's own channel)
        const canon = html.match(/<link rel="canonical" href="https?:\\/\\/www\\.youtube\\.com\\/channel\\/(UC[A-Za-z0-9_-]{20,24})"/);
        if (canon) channelId = canon[1];
        if (!channelId) {
          const cm = html.match(/"externalId":"(UC[A-Za-z0-9_-]{20,24})"/);
          if (cm) channelId = cm[1];
        }
        const tm = html.match(/<title>([^<]+) - YouTube<\\/title>/);
        if (tm) name = tm[1];
      } catch (_) {}
      if (!channelId && fetchStatus === 404) {
        res.status(404).json({ error: 'El canal o el handle no existe en YouTube (404). Comprueba el @handle o pega el ID UCxxxx.' }); return;
      }
    }
    if (!channelId) { res.status(400).json({ error: 'No se pudo resolver el canal. Pega el ID UCxxxx o la URL completa.' }); return; }
    if (!name) {
      // Fetch RSS to get channel title
      try {
        const r = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId);
        const xml = await r.text();
        const tm = xml.match(/<title>([^<]+)<\\/title>/);
        if (tm) name = tm[1];
      } catch (_) {}
    }
    let data = { channels: [] };
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
    if ((data.channels || []).find(c => c.id === channelId)) { res.json({ ok: true, alreadyAdded: true, channel: { id: channelId, name } }); return; }
    data.channels = [...(data.channels || []), { id: channelId, name: name || channelId, addedAt: Date.now() }];
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    res.json({ ok: true, channel: data.channels[data.channels.length - 1] });
  });
  youtubeDeleteChannel = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs');
    const userId = Number(req.user);
    const file = '/storage/youtube-' + userId + '.json';
    const id = req.params.id;
    let data = { channels: [] };
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
    const before = (data.channels || []).length;
    data.channels = (data.channels || []).filter(c => c.id !== id);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    res.json({ ok: true, removed: before - data.channels.length });
  });
  youtubeFeed = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs');
    const userId = Number(req.user);
    const file = '/storage/youtube-' + userId + '.json';
    let data = { channels: [] };
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
    const channels = data.channels || [];
    if (channels.length === 0) { res.json({ videos: [] }); return; }
    // Cache feed in memory (5 min) per-user
    if (!global._ytCache) global._ytCache = new Map();
    const cacheKey = 'u' + userId + ':' + channels.map(c => c.id).sort().join(',');
    const now = Date.now();
    const cached = global._ytCache.get(cacheKey);
    if (cached && (now - cached.at) < 5 * 60 * 1000) { res.json({ videos: cached.videos, cached: true }); return; }
    // Fetch all RSS in parallel
    const results = await Promise.all(channels.map(async ch => {
      try {
        const r = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + ch.id, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!r.ok) return [];
        const xml = await r.text();
        const channelTitleMatch = xml.match(/<title>([^<]+)<\\/title>/);
        const channelTitle = channelTitleMatch ? channelTitleMatch[1] : ch.name;
        const entries = [];
        const re = /<entry>([\\s\\S]*?)<\\/entry>/g;
        let m;
        while ((m = re.exec(xml)) !== null) {
          const block = m[1];
          const idM = block.match(/<yt:videoId>([^<]+)<\\/yt:videoId>/);
          const titleM = block.match(/<title>([^<]+)<\\/title>/);
          const pubM = block.match(/<published>([^<]+)<\\/published>/);
          const thumbM = block.match(/<media:thumbnail url="([^"]+)"/);
          if (idM && titleM && pubM) {
            entries.push({
              videoId: idM[1],
              title: titleM[1].replace(/&amp;/g, '&'),
              published: pubM[1],
              thumbnail: thumbM ? thumbM[1] : 'https://i.ytimg.com/vi/' + idM[1] + '/hqdefault.jpg',
              channelName: channelTitle,
              channelId: ch.id,
              url: 'https://www.youtube.com/watch?v=' + idM[1]
            });
          }
        }
        // Cap per-channel to the 4 most-recent videos so the feed doesn't drown in
        // one prolific channel's uploads.
        return entries.sort((a, b) => new Date(b.published) - new Date(a.published)).slice(0, 4);
      } catch (e) { return []; }
    }));
    const videos = [].concat(...results).sort((a, b) => new Date(b.published) - new Date(a.published)).slice(0, 100);
    global._ytCache.set(cacheKey, { at: now, videos });
    res.json({ videos });
  });
`;

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('youtube controller: anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('youtube controller: 4 methods (channels CRUD + feed) installed');
