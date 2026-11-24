const CACHE_NAME = 'peer-fund-v7';
const ASSETS = [
  './',
  './index.html',
  './login.html',
  './register.html',
  './dashboard.html',
  './ledger.html',
  './loans.html',
  './profile.html',
  './settings.html',
  './audit.html',
  './manifest.json',
  './icon.svg',
  './css/style.css',
  './js/firebase-config.js',
  './js/i18n.js',
  './js/utils.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
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
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
