// Compact cloud row (1.155.0): the big tables travel gzipped in `z`, the rest stays plain, `prog` is a stub of due times for
// the daily reminder. Round trip, size, reminder text, older app versions, browsers without gzip and a damaged row.
const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');
const { fakeSupabase, syncOnce } = require('./helpers');

const DAY = 864e5;
const APP_VERSION = require('fs').readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8').match(/const APP_VERSION = '([^']+)'/)[1];
async function device(browser, store, state, init) {
  const ctx = await browser.newContext({ baseURL: 'http://localhost:8765/', viewport: { width: 440, height: 956 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await fakeSupabase(page, store);
  if (init) await page.addInitScript(init);
  await page.addInitScript((st) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('oxford3000.v1', JSON.stringify(st)); sessionStorage.setItem('seeded', '1'); } }, { seenVer: APP_VERSION, placedAt: '2026-01-01', ...state });
  await page.goto('index.html');
  await expect(page.locator('#view')).not.toBeEmpty();
  return { ctx, page, errors };
}
const card = (dueIn, extra = {}) => ({ b: 3, i: 7, e: 2.5, st: 7.5, df: 4.2, lr: Date.now() - 7 * DAY, d: Date.now() + dueIn * DAY, s: 5, c: 4, x: 1, t: Date.now() - 7 * DAY, ...extra });

test('round trip: big tables go gzipped, the reminder stub keeps due times, another device gets everything back', async ({ browser }) => {
  const store = {};
  const A = await device(browser, store, {
    prog: { apple: card(-1), house: card(3), water: card(60) }, lex: { 'phrasal:abc': { b: 1, i: 1, e: 2.5, d: Date.now(), s: 1, c: 1, x: 0, t: 1 } },
    rev: [[29000000, 3, 2.5, 2]], snap: { '2026-11-01': [3, 0, 3, 0] }, chist: { '2026-11-01': 4 }, hist: { '2026-11-01': 9 }, settings: { levels: ['A1', 'A2'] },
  });
  expect(await syncOnce(A.page)).toBe(true);
  const row = store.data;
  expect(row.zv).toBe(1);
  expect(typeof row.z).toBe('string');
  expect(Object.keys(row.prog).sort()).toEqual(['apple', 'house']); // water is due in 60 days: past STUB_DAYS (14)
  expect(row.prog.apple).toEqual({ d: expect.any(Number) });
  for (const k of ['lex', 'rev', 'snap', 'chist', 'dprog']) expect(row[k]).toBeUndefined();
  expect(row.hist).toEqual({ '2026-11-01': 9 }); // small tables stay plain (the reminder reads hist, streak, settings)
  expect(row.settings.levels).toEqual(['A1', 'A2']);
  // the reminder text is the same as from the full state
  const { buildMessage } = await import(pathToFileURL(path.join(__dirname, '..', 'supabase', 'functions', 'daily-reminder', 'message.mjs')).href);
  const full = await A.page.evaluate(() => JSON.parse(JSON.stringify(S)));
  expect(buildMessage(row, '2026-11-07', 'main')).toEqual(buildMessage(full, '2026-11-07', 'main'));
  expect(buildMessage(row, '2026-11-07', 'main').due).toBe(1);
  // a new device gets the full cards and tables back
  const B = await device(browser, store, {});
  expect(await syncOnce(B.page)).toBe(true);
  const got = await B.page.evaluate(() => ({ prog: S.prog, lex: Object.keys(S.lex), rev: S.rev, snap: S.snap['2026-11-01'], chist: S.chist['2026-11-01'], levels: S.settings.levels }));
  expect(got.prog.water).toMatchObject({ b: 3, st: 7.5, df: 4.2 });
  expect(Object.keys(got.prog).sort()).toEqual(['apple', 'house', 'water']);
  expect(got).toMatchObject({ lex: ['phrasal:abc'], rev: [[29000000, 3, 2.5, 2]], snap: [3, 0, 3, 0], chist: 4, levels: ['A1', 'A2'] });
  expect([...A.errors, ...B.errors]).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('size: someone who has studied every word sends about a quarter of the plain text', async ({ browser }) => {
  const store = {};
  const A = await device(browser, store, {});
  const r = await A.page.evaluate(async () => {
    const now = Date.now();
    W.forEach((w, i) => { const t = now - (i % 90) * 864e5; S.prog[w.w] = { b: 4, i: 23, e: 2.5, d: now + ((i * 7) % 120 - 3) * 864e5 + i, st: 20 + (i % 70), df: 3 + (i % 6), lr: t, s: 9, c: 8, x: i % 4, t }; }); // studied daily: a few overdue, the rest spread over 4 months
    S.rev = Array.from({ length: 2000 }, (_, i) => [29000000 + i * 9, 10 + (i % 30), 9 + (i % 40), i % 9 ? 2 : 0]);
    const plain = JSON.stringify(S), packed = await cloudPack(plain), o = JSON.parse(packed);
    return { plain: plain.length, packed: packed.length, z: o.z.length, stub: JSON.stringify(o.prog).length, stubN: Object.keys(o.prog).length };
  });
  expect(r.plain).toBeGreaterThan(500000);
  expect(r.packed).toBeLessThan(r.plain * 0.3);
  await A.ctx.close();
});

test('an older app version merges what it can (stub cards are skipped, nothing is damaged)', async ({ browser }) => {
  const store = {};
  const A = await device(browser, store, { prog: { apple: card(-1), house: card(2) } });
  expect(await syncOnce(A.page)).toBe(true);
  // what a 1.154 device does with the row: mergeBackup() straight on it
  const B = await device(browser, store, { prog: { apple: card(5, { b: 2, st: 3 }) }, hist: { '2026-11-02': 3 } });
  await B.page.waitForFunction(() => !syncState.busy);
  const after = await B.page.evaluate(([row, mine]) => { S.prog = { apple: mine }; mergeBackup(row); return { prog: S.prog, hist: S.hist['2026-11-02'] }; }, [store.data, card(5, { b: 2, st: 3 })]); // its own cards again (its boot sync, new code, already merged the row)
  expect(Object.keys(after.prog)).toEqual(['apple']); // house arrived only as a stub: not taken as a card
  expect(after.prog.apple).toMatchObject({ b: 2, st: 3 }); // its own card untouched by the stub
  expect(after.hist).toBe(3);
  await A.ctx.close(); await B.ctx.close();
});

test('a browser without gzip sends the plain state; a damaged row is not overwritten', async ({ browser }) => {
  const store = {};
  const A = await device(browser, store, { prog: { apple: card(-1) } }, () => { delete window.CompressionStream; });
  expect(await syncOnce(A.page)).toBe(true);
  expect(store.data.zv).toBeUndefined();
  expect(store.data.prog.apple.b).toBe(3);
  await A.ctx.close();
  // damaged z: the sync stops with a message and uploads nothing over it
  const C = await device(browser, store, { prog: { pear: card(1) } });
  await C.page.waitForFunction(() => !syncState.busy);
  store.data = { ...store.data, zv: 1, z: 'bm90IGd6aXA=' }; store.at = new Date(Date.now() + 1000).toISOString();
  const writes = store.writes;
  expect(await C.page.evaluate(() => syncNow())).toBe(false);
  expect(await C.page.evaluate(() => syncState.error)).toContain('อ่านข้อมูลจากคลาวด์ไม่ได้');
  expect(store.writes).toBe(writes);
  await C.ctx.close();
});
