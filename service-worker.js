// IMPORTANT: bump this version string EVERY time you deploy a change to
// index.html (or any cached asset). Changing this string changes the file
// content of service-worker.js itself, which is what makes browsers notice
// there's an update and re-fetch everything. If you forget to bump this,
// devices that already installed the app will keep serving the old cached
// version forever, even after you redeploy.
const CACHE_VERSION = 'v2'; // <-- change this on every deploy (v3, v4, ...)
const CACHE_NAME = 'training-report-app-' + CACHE_VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never touch cross-origin requests, non-GET requests, or Netlify function
  // calls (EmailJS, our serverless function, Google Sheets) — always go
  // straight to network for those.
  if (url.origin !== self.location.origin || event.request.method !== 'GET' || url.pathname.startsWith('/.netlify/')) {
    return;
  }

  // Network-first for the HTML shell (navigation requests + index.html):
  // always try to get the freshest copy first, and only fall back to the
  // cached copy if the device is offline. This is what actually fixes the
  // "old version on other devices" problem.
  const isHTML = event.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');
  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else (icons, manifest, etc.) — these rarely
  // change and it's fine to serve them instantly from cache.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
