// 1.230.0: sw.js fillShell() — a new version asks for each app file with the previous copy's ETag / Last-Modified and reuses
// the unchanged ones (304) instead of downloading all of them. Runs sw.js in a Node vm with fake caches and fetch (no browser:
// Chromium does not let tests change the sw.js an update check sees).
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path'), vm = require('vm');

function loadSW(server) {
  const store = {}; // cache name → Map(url → Response)
  const mk = (name) => { store[name] = store[name] || new Map(); const m = store[name];
    return { match: async (u) => { const r = m.get(String(u).split('?')[0]); return r ? r.clone() : undefined; }, put: async (u, r) => { m.set(String(u), r); } }; };
  const caches = { keys: async () => Object.keys(store), open: async (n) => mk(n), has: async (n) => n in store, delete: async (n) => delete store[n] };
  const calls = [];
  const fetch = async (url, opt = {}) => {
    const f = new URL(url).pathname.slice(1), h = opt.headers || {}, cur = server(f);
    calls.push({ f, etag: h['If-None-Match'] || null });
    if (h['If-None-Match'] && h['If-None-Match'] === cur.etag) return new Response(null, { status: 304 });
    return new Response(cur.body, { status: 200, headers: { ETag: cur.etag } });
  };
  const listeners = {};
  const self = { registration: { scope: 'https://x.test/' }, addEventListener: (t, fn) => { listeners[t] = fn; }, skipWaiting: () => {}, clients: { claim: () => {} } };
  const ctx = vm.createContext({ self, caches, fetch, Response, URL, Promise, JSON, Date, setTimeout, console });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8') + '\n;this.fillShell = fillShell; this.FILES = FILES; this.VERSION = VERSION; this.INSTALL_KEY = INSTALL_KEY;', ctx);
  return { ctx, caches, calls, store };
}

test('first install downloads every app file, the next version reuses the unchanged ones', async () => {
  let changed = new Set();
  const { ctx, caches, calls, store } = loadSW((f) => ({ body: 'v-' + f + (changed.has(f) ? '-new' : ''), etag: '"' + f + (changed.has(f) ? '2' : '1') + '"' }));
  const n = ctx.FILES.length;
  // first install
  await ctx.fillShell(await caches.open(ctx.VERSION));
  let stats = await (await (await caches.open(ctx.VERSION)).match('https://x.test/' + ctx.INSTALL_KEY)).json();
  expect(stats).toMatchObject({ reuse: 0, net: n });
  expect(calls.every((c) => c.etag === null)).toBe(true);
  // the old version's cache keeps its name; the new worker has another VERSION
  store['o3k-0.0.1'] = store[ctx.VERSION]; delete store[ctx.VERSION];
  changed = new Set(['app.js', 'js/home.js']); calls.length = 0;
  await ctx.fillShell(await caches.open(ctx.VERSION));
  stats = await (await (await caches.open(ctx.VERSION)).match('https://x.test/' + ctx.INSTALL_KEY)).json();
  expect(stats).toMatchObject({ reuse: n - 2, net: 2 });
  expect(calls.filter((c) => c.etag).length).toBe(n); // every file asked conditionally
  const c = await caches.open(ctx.VERSION);
  expect(await (await c.match('https://x.test/app.js')).text()).toBe('v-app.js-new');
  expect(await (await c.match('https://x.test/style.css')).text()).toBe('v-style.css');
});

test('a failing app file fails the install (the old version stays)', async () => {
  const bad = loadSW(() => ({ body: '', etag: '' }));
  vm.runInContext('fetch = async () => new Response("no", { status: 500 });', bad.ctx);
  const err = await bad.ctx.fillShell(await bad.caches.open(bad.ctx.VERSION)).then(() => null, (e) => String(e && e.message));
  expect(err).toMatch(/500/);
});
