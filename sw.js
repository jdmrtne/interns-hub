// ═══════════════════════════════════════════
//  THE INTERNS HUB — SERVICE WORKER v5.0
// ═══════════════════════════════════════════
const CACHE_NAME = 'interns-hub-v5';
const STATIC_ASSETS = [
  '/interns-hub/',
  '/interns-hub/index.html',
  '/interns-hub/dashboard.html',
  '/interns-hub/interns.html',
  '/interns-hub/messages.html',
  '/interns-hub/announcements.html',
  '/interns-hub/admin.html',
  '/interns-hub/chat.html',
  '/interns-hub/nav.js',
  '/interns-hub/notifications.js',
  '/interns-hub/config.js',
  '/interns-hub/style.css',
  '/interns-hub/manifest.json',
  '/interns-hub/icon-192.png',
  '/interns-hub/icon-512.png',
];

// ── INSTALL: pre-cache all static assets ────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()) // activate immediately
  );
});

// ── ACTIVATE: wipe old caches, take control of all tabs ─────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim()) // take over all open tabs now
  );
});

// ── FETCH: network-first, fall back to cache if offline ─────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept external/API calls
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('fonts.googleapis.com')) return;
  if (url.hostname.includes('cdn.jsdelivr.net')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Got a fresh response — update the cache and return it
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Offline — serve from cache, fall back to index.html
        return caches.match(event.request)
          .then(cached => cached || caches.match('/interns-hub/index.html'));
      })
  );
});