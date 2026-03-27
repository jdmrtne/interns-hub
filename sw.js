// ═══════════════════════════════════════════════════════
//  THE INTERNS HUB — SERVICE WORKER v7
//  Always shows OS notifications — even when site is open
// ═══════════════════════════════════════════════════════
const CACHE_NAME = 'interns-hub-v8';
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

// ── INSTALL ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── PUSH — always show OS notification ───────────────────
self.addEventListener('push', event => {
  let data = {
    title: 'The Interns Hub',
    body:  'You have a new notification',
    url:   '/interns-hub/',
    type:  'general',
  };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch(e) {}

  const icon  = '/interns-hub/icon-192.png';
  const badge = '/interns-hub/icon-96.png';

  const actions = data.type === 'message'
    ? [{ action: 'open', title: 'Open Chat' }, { action: 'close', title: 'Dismiss' }]
    : [{ action: 'open', title: 'Read Now'  }, { action: 'close', title: 'Dismiss' }];

  const options = {
    body:               data.body,
    icon,
    badge,
    tag:                data.type === 'message' ? 'msg-' + (data.senderId || 'x') : 'ann-' + Date.now(),
    renotify:           true,
    data:               { url: data.url },
    vibrate:            [200, 80, 200],
    requireInteraction: false,
    silent:             false,
    actions,
  };

  // KEY FIX: always show the OS notification regardless of whether
  // the site tab is open. We also ping any open tabs so they update
  // their in-app UI (bell badge, message list) at the same time.
  event.waitUntil(
    Promise.all([
      // 1. Always show the native OS notification
      self.registration.showNotification(data.title, options),

      // 2. Tell any open tabs to refresh their UI
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(openClients => {
          for (const client of openClients) {
            client.postMessage({
              type:       'PUSH_RECEIVED',
              pushType:   data.type,
              senderName: data.title,
              body:       data.body,
              url:        data.url,
            });
          }
        }),
    ])
  );
});

// ── NOTIFICATION CLICK ───────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;

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

// ── FETCH — network-first, cache fallback ────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co'))         return;
  if (url.hostname.includes('fonts.googleapis.com')) return;
  if (url.hostname.includes('cdn.jsdelivr.net'))     return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request)
          .then(cached => cached || caches.match('/interns-hub/index.html'))
      )
  );
});
