/* Machasal service worker
   - Cache names all start with "machasal-" so they never collide with the first app (Mgju-app).
   - On update it deletes ONLY old "machasal-" caches; other apps' caches on this github.io address are left alone.
   - Bump VERSION whenever you upload a new index.html so phones pick up the change. */
const VERSION = 'v2';
const PREFIX  = 'machasal-';
const CACHE   = PREFIX + VERSION;
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Pages: try the network first so updates show up, fall back to the cached copy offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html', {cacheName: CACHE}))
    );
    return;
  }

  // Everything else (icons, fonts, cropper library): cached copy first, then network
  e.respondWith(
    caches.match(req, {cacheName: CACHE}).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
