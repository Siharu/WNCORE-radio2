// WNCORE Radio — Service Worker v5
// Enables iOS background audio entitlements + static asset caching
const CACHE = 'wncore-v5';
const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/mobile.css',
  '/horror_upgrade.css',
  '/main.js',
  '/improvements.js',
  '/wrongness.js',
  '/wncore-upgrades.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Pass-through API calls — never cache them
  if (e.request.url.includes('/api/')) return;
  // Network-first, fall back to cache for static assets
  e.respondWith(
    fetch(e.request).then(r => {
      // Cache successful responses for static assets
      if (r && r.status === 200 && e.request.method === 'GET') {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});
