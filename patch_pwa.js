const fs = require('fs');
const path = require('path');

const crypto = require('crypto');
const pubDir = '/app/public';
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js | grep -v "\\.LICENSE\\|\\.map"').toString().trim();
const bundleName = path.basename(bundlePath);
// Hash the bundle CONTENTS (post-patches) so each rebuild that actually changes
// the bundle invalidates the SW cache. Using just the filename meant that our
// patches were silently served from stale cache after rebuilds.
const bundleHash = crypto.createHash('sha1').update(fs.readFileSync(bundlePath)).digest('hex').slice(0, 12);

// ---------- 1. manifest.json ----------
const manifest = {
  name: "MediaTracker",
  short_name: "MediaTracker",
  description: "Self-hosted media tracker (películas, series, libros, juegos)",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#0f172a",
  theme_color: "#0f172a",
  lang: "es",
  icons: [
    { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { src: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" }
  ]
};
fs.writeFileSync(path.join(pubDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('pwa: wrote manifest.json');

// ---------- 2. sw.js (service worker) ----------
// Cache version is tied to the bundle filename — when the bundle hash changes, a new SW
// activates and old caches are evicted. No manual bumping needed.
const swCode = `// MediaTracker service worker — generated at build time
const VERSION = ${JSON.stringify(bundleName + '-' + bundleHash + '-' + Date.now())};
const STATIC_CACHE = 'mt-static-' + VERSION;
const RUNTIME_CACHE = 'mt-runtime-' + VERSION;
const IMAGE_CACHE = 'mt-images-' + VERSION;
const API_CACHE = 'mt-api-' + VERSION;

const PRECACHE = [
  '/',
  '/' + ${JSON.stringify(bundleName)},
  '/manifest.json',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => {
        if (![STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE, API_CACHE].includes(k)) {
          return caches.delete(k);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return /\\.(js|css|woff2?|ttf|otf|eot)$/i.test(url.pathname);
}
function isImage(url) {
  return /\\.(png|jpe?g|gif|svg|webp|ico|avif)$/i.test(url.pathname);
}
function isApi(url) {
  return url.pathname.startsWith('/api/');
}
function isNavigation(req) {
  return req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'));
}

// Cache-first: try cache, fallback to network, store on miss
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    if (resp && resp.ok) cache.put(req, resp.clone());
    return resp;
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
}

// Stale-while-revalidate: return cache immediately, update in background
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((resp) => {
    if (resp && resp.ok) cache.put(req, resp.clone());
    return resp;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// Network-first: try network, fallback to cache (used for API + navigation)
async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(req);
    if (resp && resp.ok && req.method === 'GET') cache.put(req, resp.clone());
    return resp;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
  } else if (isImage(url)) {
    event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE));
  } else if (isApi(url)) {
    event.respondWith(networkFirst(req, API_CACHE));
  } else if (isNavigation(req)) {
    event.respondWith(
      networkFirst(req, RUNTIME_CACHE).catch(() => caches.match('/'))
    );
  }
});
`;
fs.writeFileSync(path.join(pubDir, 'sw.js'), swCode);
// Pre-compress: the static handler swaps /sw.js → /sw.js.br|.gz based on Accept-Encoding;
// without these variants the swap targets a missing file and the request 401s through auth.
const zlib = require('zlib');
fs.writeFileSync(path.join(pubDir, 'sw.js.gz'), zlib.gzipSync(Buffer.from(swCode), { level: 9 }));
fs.writeFileSync(path.join(pubDir, 'sw.js.br'), zlib.brotliCompressSync(Buffer.from(swCode)));
console.log('pwa: wrote sw.js (cache version = ' + bundleName + ') + .gz + .br');

// ---------- 3. Patch index.html ----------
const idxPath = path.join(pubDir, 'index.html');
let idx = fs.readFileSync(idxPath, 'utf8');
let idxChanged = false;

if (!idx.includes('rel="manifest"')) {
  idx = idx.replace('</head>', '  <link rel="manifest" href="/manifest.json">\n  <meta name="theme-color" content="#0f172a">\n  </head>');
  idxChanged = true;
  console.log('pwa: linked manifest.json in index.html');
} else {
  console.log('pwa: manifest link already present');
}

const swReg = '<script>if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(e){console.warn("SW registration failed",e)})})}</script>';
if (!idx.includes('navigator.serviceWorker.register')) {
  idx = idx.replace('</body>', '  ' + swReg + '\n</body>');
  idxChanged = true;
  console.log('pwa: injected service worker registration');
} else {
  console.log('pwa: SW registration already present');
}

if (idxChanged) fs.writeFileSync(idxPath, idx);
console.log('pwa: complete');
