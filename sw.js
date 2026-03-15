// ═══════════════════════════════════════════
//  THE INTERNS HUB — SERVICE WORKER v4.0
// ═══════════════════════════════════════════
const CACHE_NAME = 'interns-hub-v2';
const STATIC_ASSETS = [
  '/interns-hub/',
  '/interns-hub/index.html',
  '/interns-hub/dashboard.html',
  '/interns-hub/interns.html',
  '/interns-hub/messages.html',
  '/interns-hub/announcements.html',
  '/interns-hub/admin.html',
  '/interns-hub/notifications.js',
  '/interns-hub/config.js',
  '/interns-hub/style.css',
  '/interns-hub/manifest.json',
  '/interns-hub/icon-192.png',
  '/interns-hub/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('fonts.googleapis.com')) return;
  if (url.hostname.includes('cdn.jsdelivr.net')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => caches.match('/interns-hub/index.html'));
    })
  );
});
