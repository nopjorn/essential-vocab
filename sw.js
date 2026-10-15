// Offline cache for the app shell. Bump VERSION (keep it equal to APP_VERSION in app.js) on every push.
const VERSION = 'o3k-1.15.1';
const FILES = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'config.js',
  'words.js',
  'topics.js',
  'stories/a1.js',
  'stories/a2.js',
  'stories/b1.js',
  'stories/b2.js',
  'stories/c1.js',
  'collocations.js',
  'pairs.js',
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first (so updates show up when online), falling back to the cache offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});

// Daily reminder pushed by the Supabase Edge Function (supabase/functions/daily-reminder).
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'ศัพท์ต้องรู้ 📚', {
    body: d.body || 'ถึงเวลาท่องศัพท์แล้ว',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'daily',
    data: { url: d.url || './' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const c = list.find((x) => x.url.startsWith(self.registration.scope));
    return c ? c.focus() : self.clients.openWindow(url);
  }));
});
