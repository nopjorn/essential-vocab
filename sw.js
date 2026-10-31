// Offline cache. Bump VERSION (keep it equal to APP_VERSION in app.js) on every push.
const VERSION = 'o3k-1.115.0';
// App shell: replaced as a whole with every version.
const FILES = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'js/home.js',
  'js/cards.js',
  'js/games.js',
  'js/feed.js',
  'js/reading.js',
  'js/words.js',
  'js/lexis.js',
  'js/lexis2.js',
  'js/grammar.js',
  'js/placement.js',
  'js/riddle.js',
  'js/duel.js',
  'js/ear.js',
  'js/map.js',
  'js/wsearch.js',
  'js/stats.js',
  'js/sync.js',
  'js/guide.js',
  'js/settings.js',
  'js/decks.js',
  'js/share.js',
  'js/mascot.js',
  'js/events.js',
  'js/scene.js',
  'js/adventure.js',
  'js/onboard.js',
  'js/search.js',
  'js/boot.js',
  'config.js',
  'data/changelog.js',
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'icons/apple-touch-icon-dark.png',
  'icons/apple-touch-icon-black.png',
  'icons/apple-touch-icon-light.png',
  'icons/apple-touch-icon-ocean.png',
  'icons/apple-touch-icon-sakura.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];
// Word lists and other content: kept in their own cache across versions. Install only re-downloads a file
// the server says has changed (conditional request), so a new version doesn't fetch ~2 MB of unchanged data.
const DATA_CACHE = 'o3k-data';
const DATA = [
  'data/roots.js',
  'data/ukus.js',
  'data/stories/real.js',
  'data/play.js',
  'data/guide.js',
  'data/words/a1.js',
  'data/words/a2.js',
  'data/words/b1.js',
  'data/words/b2.js',
  'data/words/b2plus.js',
  'data/words/c1.js',
  'data/stories/a1.js',
  'data/stories/a2.js',
  'data/stories/b1.js',
  'data/stories/b2.js',
  'data/stories/c1.js',
  'data/stories/c2.js',
  'data/collocations.js',
  'data/pairs.js',
  'data/families.js',
  'data/phrasal.js',
  'data/synonyms.js',
  'data/affixes.js',
  'data/idioms.js',
  'data/irregular.js',
  'data/depprep.js',
  'data/mistakes.js',
  'data/grampat.js',
  'data/realtext.js',
  'data/emoji.js',
  'data/situations.js',
  'data/tags.js',
];
const NAV_TIMEOUT = 2500; // ms to wait for the network on app start before opening the cached copy
const isData = (url) => DATA.includes(url.pathname.slice(new URL(self.registration.scope).pathname.length));
const dataKey = (url) => url.origin + url.pathname; // lazy loads add ?v=<version>; store one copy per file

// Fetch a data file only if it changed since the cached copy (304 → keep it).
async function refreshData(cache, file) {
  const url = new URL(file, self.registration.scope), old = await cache.match(dataKey(url));
  const headers = {};
  if (old && old.headers.get('ETag')) headers['If-None-Match'] = old.headers.get('ETag');
  else if (old && old.headers.get('Last-Modified')) headers['If-Modified-Since'] = old.headers.get('Last-Modified');
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (res.status === 304 && old) return;
  if (!res.ok) throw new Error(file + ' ' + res.status);
  await cache.put(dataKey(url), res);
}

self.addEventListener('install', (e) => {
  e.waitUntil(Promise.all([
    caches.open(VERSION).then((c) => c.addAll(FILES)),
    caches.open(DATA_CACHE).then((c) => Promise.all(DATA.map((f) => refreshData(c, f)))),
  ]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== DATA_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first (so updates show up when online), falling back to the cache offline. On a slow network
// ("lie-fi") the app start waits at most NAV_TIMEOUT, then opens from the cache; the files that page asks
// for next come from the cache too, so it never mixes old and new versions.
let cacheFirstUntil = 0;
const fromCache = (req) => caches.match(req, { ignoreSearch: true });
function network(req) {
  return fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  });
}
async function navigate(e) {
  const net = network(e.request);
  e.waitUntil(net.catch(() => {})); // let a late response still refresh the cache
  const first = await Promise.race([net.catch(() => 'fail'), new Promise((r) => setTimeout(r, NAV_TIMEOUT, 'late'))]);
  if (first !== 'late' && first !== 'fail') { cacheFirstUntil = 0; return first; }
  const cached = (await fromCache(e.request)) || (await fromCache('index.html'));
  if (!cached) return net; // nothing cached yet: keep waiting for the network
  cacheFirstUntil = Date.now() + 15000;
  return cached;
}
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(navigate(e)); return; }
  if (isData(url)) {
    // Content files: cached copy first (install keeps it current). A page newer than this worker
    // (?v= differs) fetches from the network so it never sees older data than it expects.
    const v = url.searchParams.get('v'), newer = v && 'o3k-' + v !== VERSION;
    const net = () => fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(DATA_CACHE).then((c) => c.put(dataKey(url), copy)); }
      return res;
    });
    e.respondWith(newer
      ? net().catch(() => caches.match(dataKey(url)))
      : caches.match(dataKey(url)).then((r) => r || net()));
    return;
  }
  e.respondWith(
    (Date.now() < cacheFirstUntil ? fromCache(req).then((r) => r || network(req)) : network(req).catch(() => fromCache(req)))
      .then((r) => r || fromCache('index.html'))
  );
});

// Daily reminder pushed by the Supabase Edge Function (supabase/functions/daily-reminder).
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  if (d.due != null && self.navigator.setAppBadge) self.navigator.setAppBadge(d.due).catch(() => {});
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
