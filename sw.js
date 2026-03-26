// ═══════════════════════════════════════════
//  THE INTERNS HUB — SERVICE WORKER v5.0
// ═══════════════════════════════════════════
const CACHE_NAME = 'interns-hub-v6';
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
  '/interns-hub/push.js',
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

// ── PUSH: show a native OS notification ─────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'The Interns Hub', body: 'You have a new notification', url: '/interns-hub/', type: 'general' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch(e) {}

  const icon  = '/interns-hub/icon-192.png';
  const badge = '/interns-hub/icon-96.png';

  const options = {
    body:             data.body,
    icon,
    badge,
    tag:              data.type + '-' + Date.now(),   // group by type
    data:             { url: data.url },
    vibrate:          [200, 80, 200],
    requireInteraction: false,
    silent:           false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ── NOTIFICATION CLICK: open or focus the correct page ──────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || '/interns-hub/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('/interns-hub') && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
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