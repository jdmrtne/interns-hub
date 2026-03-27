// ═══════════════════════════════════════════════════════
//  THE INTERNS HUB — SERVICE WORKER v6
//  Handles OS-level push notifications (lock screen,
//  Windows notification centre, macOS banners)
// ═══════════════════════════════════════════════════════
const CACHE_NAME = 'interns-hub-v7';
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

// ── PUSH — show native OS notification ───────────────────
self.addEventListener('push', event => {
  // Default values if payload is missing or malformed
  let data = {
    title: 'The Interns Hub',
    body:  'You have a new notification',
    url:   '/interns-hub/',
    type:  'general',
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch(e) {
    console.warn('[SW] Could not parse push payload:', e);
  }

  const icon  = '/interns-hub/icon-192.png';
  const badge = '/interns-hub/icon-96.png'; // small monochrome icon shown in Android status bar

  // Actions appear as buttons below the notification on Android/desktop
  const actions = data.type === 'message'
    ? [
        { action: 'open',  title: '💬 Open Chat' },
        { action: 'close', title: 'Dismiss' },
      ]
    : [
        { action: 'open',  title: '📣 Read Now' },
        { action: 'close', title: 'Dismiss' },
      ];

  const options = {
    body:    data.body,
    icon,
    badge,
    // tag groups same-type notifications — new ones replace old ones
    // (same behaviour as WhatsApp grouping messages from same person)
    tag:     data.type === 'message'
               ? 'msg-' + (data.senderId || 'general')
               : 'ann-' + Date.now(),
    // renotify: true means the notification sound/vibrate fires even
    // when replacing a grouped notification
    renotify: true,
    data:    { url: data.url },
    vibrate: [200, 80, 200],
    requireInteraction: false, // auto-dismiss after OS timeout
    silent:  false,
    actions,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── NOTIFICATION CLICK ───────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  // 'close' action button = just dismiss, don't navigate
  if (event.action === 'close') return;

  const target = event.notification.data?.url || '/interns-hub/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // If the app is already open, navigate that tab
      for (const client of list) {
        if (client.url.includes('/interns-hub') && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      // Otherwise open a new tab
      return clients.openWindow(target);
    })
  );
});

// ── FETCH — network-first, cache fallback ────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept external/API calls
  if (url.hostname.includes('supabase.co'))        return;
  if (url.hostname.includes('fonts.googleapis.com')) return;
  if (url.hostname.includes('cdn.jsdelivr.net'))    return;

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
