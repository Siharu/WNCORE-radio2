// WNCORE Radio — Service Worker v10
// Updated for merged bundle — bundle.js replaces 14 separate JS files
const CACHE = 'wncore-v10';
const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/mobile.css',
  '/bundle.js',
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
  const url = e.request.url;

  // Pass-through: API calls, external URLs, and audio streams — never intercept
  if (
    url.includes('/api/') ||
    url.includes('somafm.com') ||
    url.includes('soma.fm') ||
    url.includes('plaza.one') ||
    url.includes('listen.moe') ||
    url.includes('radioking.com') ||
    url.includes('radioparadise.com') ||
    url.includes('bbcmedia.co.uk') ||
    url.includes('nightwave.io') ||
    url.includes('streamguys') ||
    url.includes('monocle.com') ||
    !url.startsWith(self.location.origin)
  ) return;

  // Network-first, fall back to cache for same-origin static assets only
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.status === 200 && e.request.method === 'GET' && r.type !== 'opaque') {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
      }
      return r;
    }).catch(() => caches.match(e.request))
  );
});
