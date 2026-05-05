const fs = require('fs');
const path = '/app/build/controllers/item.js';
let c = fs.readFileSync(path, 'utf8');

// Strip prior versions for idempotent re-applies
['youtubeChannels','youtubeAddChannel','youtubeDeleteChannel','youtubeFeed'].forEach(name => {
  const re = new RegExp('  ' + name + ' = \\(0, _typescriptRoutesToOpenapiServer\\.createExpressRoute\\)\\(async \\(req, res\\) => \\{[\\s\\S]*?\\}\\);\\n', 'g');
  c = c.replace(re, '');
});

const method = `  youtubeChannels = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs').promises;
    const userId = Number(req.user);
    const file = '/storage/youtube-' + userId + '.json';
    let data = { channels: [] };
    try { data = JSON.parse(await fs.readFile(file, 'utf8')); } catch (_) {}
    res.json(data.channels || []);
  });
  youtubeAddChannel = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs').promises;
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
    try { data = JSON.parse(await fs.readFile(file, 'utf8')); } catch (_) {}
    if ((data.channels || []).find(c => c.id === channelId)) { res.json({ ok: true, alreadyAdded: true, channel: { id: channelId, name } }); return; }
    data.channels = [...(data.channels || []), { id: channelId, name: name || channelId, addedAt: Date.now() }];
    // Atomic write — tempfile + rename so a crash mid-write can't corrupt the JSON.
    const tmp = file + '.tmp.' + process.pid;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.rename(tmp, file);
    res.json({ ok: true, channel: data.channels[data.channels.length - 1] });
  });
  youtubeDeleteChannel = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs').promises;
    const userId = Number(req.user);
    const file = '/storage/youtube-' + userId + '.json';
    const id = req.params.id;
    let data = { channels: [] };
    try { data = JSON.parse(await fs.readFile(file, 'utf8')); } catch (_) {}
    const before = (data.channels || []).length;
    data.channels = (data.channels || []).filter(c => c.id !== id);
    const tmp = file + '.tmp.' + process.pid;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.rename(tmp, file);
    res.json({ ok: true, removed: before - data.channels.length });
  });
  youtubeFeed = (0, _typescriptRoutesToOpenapiServer.createExpressRoute)(async (req, res) => {
    const fs = require('fs').promises;
    const userId = Number(req.user);
    const file = '/storage/youtube-' + userId + '.json';
    let data = { channels: [] };
    try { data = JSON.parse(await fs.readFile(file, 'utf8')); } catch (_) {}
    const channels = data.channels || [];
    if (channels.length === 0) { res.json({ videos: [] }); return; }
    // Per-channel cache (5 min TTL). Keyed by channelId — global, shared across users
    // because RSS content is the same for everyone. Adding/removing channels does
    // NOT invalidate the others (vs. the previous "key = sorted list of channels"
    // which caused every channel to be re-fetched on add/remove → if any single
    // RSS hit was rate-limited, that channel's videos vanished from the feed).
    //
    // Persisted to disk (/storage/youtube-feed-cache.json) so it survives container
    // restarts — important because YouTube's RSS endpoint has been throwing 404s
    // for hours at a time since Dec-2025; without persistence, every restart would
    // empty the cache and leave the feed at 0 videos until YouTube recovered.
    const cacheFile = '/storage/youtube-feed-cache.json';
    const CACHE_MAX = 1000;
    const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (!global._ytChannelCache) {
      global._ytChannelCache = new Map();
      try {
        const raw = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
        const cutoff = Date.now() - CACHE_MAX_AGE_MS;
        // Sort entries newest-first so trimming to CACHE_MAX keeps the freshest.
        const sorted = Object.entries(raw || {})
          .filter(([, v]) => v && Array.isArray(v.entries) && typeof v.at === 'number' && v.at >= cutoff)
          .sort((a, b) => b[1].at - a[1].at)
          .slice(0, CACHE_MAX);
        for (const [id, v] of sorted) global._ytChannelCache.set(id, v);
      } catch (_) {}
    }
    const persistCache = async () => {
      try {
        const obj = {};
        for (const [id, v] of global._ytChannelCache) obj[id] = v;
        const tmp = cacheFile + '.tmp.' + process.pid;
        await fs.writeFile(tmp, JSON.stringify(obj));
        await fs.rename(tmp, cacheFile);
      } catch (_) {}
    };
    const TTL = 5 * 60 * 1000;
    const now = Date.now();
    const fresh = req.query && req.query.fresh === '1';
    let cacheDirty = false;
    const fetchChannel = async (ch) => {
      const cached = global._ytChannelCache.get(ch.id);
      if (!fresh && cached && (now - cached.at) < TTL) return cached.entries;
      try {
        const r = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + ch.id, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!r.ok) {
          // Rate-limit / 5xx / YouTube's recurring 404 outage: fall back to last-known-good
          // entries for this channel instead of returning [] (which would make the channel
          // disappear from the feed during the outage).
          return cached ? cached.entries : [];
        }
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
        const sorted = entries.sort((a, b) => new Date(b.published) - new Date(a.published)).slice(0, 4);
        // Only refresh the cache entry if we got something — an empty parse on a
        // 200 response (rare, but happens when YouTube serves an HTML error page
        // with status 200) would otherwise overwrite good data with [].
        if (sorted.length > 0) {
          global._ytChannelCache.set(ch.id, { at: now, entries: sorted });
          // LRU trim: insertion-order Map → drop the oldest when over cap.
          if (global._ytChannelCache.size > CACHE_MAX) {
            global._ytChannelCache.delete(global._ytChannelCache.keys().next().value);
          }
          cacheDirty = true;
          return sorted;
        }
        return cached ? cached.entries : [];
      } catch (e) {
        return cached ? cached.entries : [];
      }
    };
    // Concurrency-limited fan-out: with N channels, only run K=5 in parallel
    // at any moment so we don't fan out 50+ requests against YouTube RSS at
    // once (which sometimes triggers 429s during their flaky-RSS windows).
    // Worker-pool — each of K workers picks the next available channel.
    const _CONCURRENCY = 5;
    const results = new Array(channels.length);
    let _next = 0;
    const _workers = Array.from({ length: Math.min(_CONCURRENCY, channels.length) }, async () => {
      while (_next < channels.length) {
        const idx = _next++;
        results[idx] = await fetchChannel(channels[idx]);
      }
    });
    await Promise.all(_workers);
    if (cacheDirty) await persistCache();
    const videos = [].concat(...results).sort((a, b) => new Date(b.published) - new Date(a.published)).slice(0, 100);
    res.json({ videos });
  });
`;

const anchor = '}\nexports.MediaItemController = MediaItemController;';
if (!c.includes(anchor)) { console.error('youtube controller: anchor not found'); process.exit(1); }
c = c.replace(anchor, method + anchor);
fs.writeFileSync(path, c);
console.log('youtube controller: 4 methods (channels CRUD + feed) installed');
