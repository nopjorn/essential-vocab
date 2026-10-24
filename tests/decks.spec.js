// "ชุดของฉัน" (1.54): word matcher, create/edit/copy/delete, caps, reset, backups, broken data, and sync between two devices.
const { test, expect } = require('@playwright/test');
const { openApp, readState, fakeSupabase, syncOnce } = require('./helpers');

const DAYS = 86400000;
const deck = (id, extra = {}) => ({ id, name: id, icon: '📚', words: ['airport'], at: 1000, used: 1000, ...extra });

test('matchWords: exact, other forms to confirm, misses, numbering, Thai meanings, duplicates, cap', async ({ page }) => {
  const errors = await openApp(page);
  const m = (t) => page.evaluate((t) => matchWords(t), t);
  let r = await m('airport\n1. ticket = ตั๋ว\n  - Hotel\n• passport, taxi; ice cream\nairport\nboarding pass - บัตรโดยสาร');
  expect(r.ok).toEqual(['airport', 'ticket', 'hotel', 'passport', 'taxi', 'ice cream']);
  expect(r.miss).toEqual(['boarding pass']);
  expect(r.guess).toEqual([]);
  r = await m('leaves\nwent\nleave\ncustoms\n123\nสนามบิน');
  expect(r.ok).toEqual(['leave']);
  expect(r.guess).toEqual([{ input: 'customs', word: 'custom' }]); // "leaves" is dropped: leave is already matched exactly
  expect(r.miss).toEqual(['went']);
  r = await m("Apple's, dogs");
  expect(r.ok).toEqual(['apple']);
  expect(r.guess).toEqual([{ input: 'dogs', word: 'dog' }]);
  r = await m(Array(600).fill('airport').join('\n'));
  expect(r.cut).toBe(true); expect(r.ok).toEqual(['airport']);
  r = await m('   \n\n');
  expect(r.ok.length + r.guess.length + r.miss.length).toBe(0);
  expect(errors).toEqual([]);
});

test('create a set from a pasted list, edit it, copy it and delete it', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => go('list'));
  await page.locator('#libSw [data-go="decks"]').click();
  await expect(page.locator('#view')).toContainText('ยังไม่มีชุดคำ');
  await page.locator('#dkNew').click();
  await expect(page.locator('#dkName')).toHaveValue(/^ศัพท์สัปดาห์ /);
  expect((await readState(page)).decks || []).toHaveLength(0); // an empty new set is not stored yet
  await page.locator('#dkText').fill('airport\n1. ticket = ตั๋ว\nleaves\nwent\nboarding pass - บัตร\nairport');
  await page.locator('#dkCheck').click();
  await expect(page.locator('#dkPanel')).toContainText('พบในคลัง 2 คำ');
  await expect(page.locator('#dkPanel')).toContainText('leaves → leave');
  await expect(page.locator('#dkPanel')).toContainText('ไม่พบในคลัง 2 รายการ');
  await expect(page.locator('#dkAdd')).toHaveText('เพิ่ม 2 คำเข้าชุด'); // the guess is unchecked by default
  await page.locator('[data-g="0"]').check();
  await expect(page.locator('#dkAdd')).toHaveText('เพิ่ม 3 คำเข้าชุด');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await page.locator('#dkAdd').click();
  await expect(page.locator('#dkCount')).toHaveText('คำในชุด (3)');
  let st = await readState(page);
  expect(st.decks).toHaveLength(1);
  expect(st.decks[0].words).toEqual(['airport', 'ticket', 'leave']);
  // rename + icon, survives a reload
  await page.locator('#dkName').fill('ศัพท์ครู 1');
  await page.locator('#dkName').press('Tab');
  await page.locator('[data-ic="🎓"]').click();
  await page.reload();
  await page.evaluate(() => go('decks'));
  await expect(page.locator('.deck-card')).toContainText('ศัพท์ครู 1');
  await expect(page.locator('.deck-card')).toContainText('3 คำ');
  await page.locator('.deck-card').click();
  // remove a word, then add by search and by shortcut
  await page.locator('[data-rm="ticket"]').click();
  await expect(page.locator('#dkCount')).toHaveText('คำในชุด (2)');
  await page.locator('#dkTabs [data-v="find"]').click();
  await page.locator('#dkQ').fill('hotel');
  await page.locator('[data-add="hotel"]').click();
  await expect(page.locator('[data-add="hotel"]')).toHaveText('✓');
  await page.locator('#dkTabs [data-v="quick"]').click();
  await page.locator('[data-q="travel"]').click();
  st = await readState(page);
  expect(st.decks[0].name).toBe('ศัพท์ครู 1'); // a non-empty set keeps its name
  expect(st.decks[0].icon).toBe('🎓');
  expect(st.decks[0].words).toEqual(expect.arrayContaining(['airport', 'leave', 'hotel', 'passport']));
  const n = st.decks[0].words.length;
  // copy: new id, " (สำเนา)", same words, no progress
  await page.locator('#dkCopy').click();
  st = await readState(page);
  expect(st.decks).toHaveLength(2);
  const copy = st.decks.find((d) => d.name === 'ศัพท์ครู 1 (สำเนา)');
  expect(copy.words).toHaveLength(n);
  expect(copy.id).not.toBe(st.decks.find((d) => d.name === 'ศัพท์ครู 1').id);
  await expect(page.locator('#dkName')).toHaveValue('ศัพท์ครู 1 (สำเนา)');
  // delete = tombstone, progress dropped
  await page.evaluate((id) => { S.dprog[id] = { airport: { b: 2, i: 3, d: 1, s: 1, c: 1, x: 0 } }; save(); }, copy.id);
  page.once('dialog', (d) => d.accept());
  await page.locator('#dkDel').click();
  st = await readState(page);
  const gone = st.decks.find((d) => d.id === copy.id);
  expect(gone.del).toBe(true); expect(gone.words).toEqual([]);
  expect(st.dprog[copy.id]).toBeUndefined();
  await expect(page.locator('.deck-card')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('shortcuts: empty-state goal sets and starred words; the sets page lights the word-list tab on a phone', async ({ page }) => {
  const errors = await openApp(page, { star: { airport: 1, hotel: 1 } });
  await page.evaluate(() => go('decks'));
  await expect(page.locator('.tabbar [data-tab="list"]')).toHaveClass(/active/);
  await page.locator('[data-from="star"]').click();
  let st = await readState(page);
  expect(st.decks[0].name).toBe('คำติดดาว'); expect(st.decks[0].words.sort()).toEqual(['airport', 'hotel']);
  await page.evaluate(() => go('decks'));
  await expect(page.locator('[data-from]')).toHaveCount(0); // shortcuts only show while there are no sets
  await page.locator('#dkNew').click();
  await page.locator('#dkTabs [data-v="quick"]').click();
  await page.locator('[data-q="travel"]').click(); // empty new set + shortcut → named after the goal
  await expect(page.locator('#dkName')).toHaveValue('ท่องเที่ยว');
  st = await readState(page);
  expect(st.decks.find((d) => d.name === 'ท่องเที่ยว').words.length).toBeGreaterThan(100);
  expect(errors).toEqual([]);
});

test('limits: name length, 500 words per set, 200 sets, paste cap', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    const d = addDeck('x'.repeat(80), '📚', W.slice(0, 700).map((w) => w.w));
    const out = { name: d.name.length, words: d.words.length };
    for (let i = 0; i < 205; i++) addDeck('s' + i, '📚', ['airport']);
    out.decks = liveDecks().length;
    return out;
  });
  expect(r).toEqual({ name: 40, words: 500, decks: 200 });
  await page.evaluate(() => { renderDeckEdit(S.decks.find((d) => d.words.length === 500).id); });
  await page.locator('#dkTabs [data-v="find"]').click();
  await page.locator('#dkQ').fill('zzzz');
  await page.locator('#dkTabs [data-v="quick"]').click();
  await page.locator('[data-q="travel"]').click();
  await expect(page.locator('#toast')).toContainText(/เต็มแล้ว/);
  expect(errors).toEqual([]);
});

test('reset keeps my sets and their progress; backups carry sets and a deleted set stays deleted', async ({ page }) => {
  const errors = await openApp(page, { prog: { apple: { b: 5, i: 20, e: 2.5, d: 1, s: 3, c: 3, x: 0 } }, decks: [deck('d1')], dprog: { d1: { airport: { b: 2, i: 3, e: 2.5, d: 5, s: 1, c: 1, x: 0 } } } });
  page.on('dialog', (d) => d.accept());
  await page.evaluate(() => go('settings'));
  await page.evaluate(() => document.querySelector('#reset').click());
  await expect(page.locator('#toast')).toContainText('ล้างข้อมูลแล้ว');
  const st = await readState(page);
  expect(Object.keys(st.prog)).toEqual([]);
  expect(st.decks.map((d) => d.id)).toEqual(['d1']);
  expect(st.dprog.d1.airport.b).toBe(2);
  // export → wipe → import brings the set back; an old backup does not revive a deleted set
  const backup = await page.evaluate(() => JSON.parse(JSON.stringify(S)));
  await page.evaluate(() => { const d = S.decks[0]; d.del = true; d.words = []; d.at = Date.now() + 1000; delete S.dprog.d1; save(); });
  await page.evaluate((b) => mergeBackup(b), backup);
  expect((await readState(page)).decks[0].del).toBe(true);
  expect(await page.evaluate(() => liveDecks().length)).toBe(0);
  await page.evaluate((b) => { S = defaults(); mergeBackup(b); }, backup);
  expect(await page.evaluate(() => liveDecks().map((d) => d.id))).toEqual(['d1']);
  expect(await page.evaluate(() => S.dprog.d1.airport.b)).toBe(2);
  expect(errors).toEqual([]);
});

test('odd data in storage or in a backup never breaks the app', async ({ page }) => {
  const errors = await openApp(page, { decks: [null, 5, {}, 'x', { id: 'BAD ID' }, { id: 'ok', name: 7, icon: 3, words: [1, null, 'airport', 'airport', 'x'.repeat(99)], at: 'x' }, { id: 'ok', name: 'dup', at: 5 }], dprog: [] });
  for (const r of ['home', 'list', 'decks', 'stats', 'settings']) { await page.evaluate((r) => go(r), r); await expect(page.locator('#view')).not.toBeEmpty(); }
  let live = await page.evaluate(() => liveDecks().map((d) => [d.id, d.name, d.icon, d.words]));
  expect(live).toEqual([['ok', 'dup', '📚', []]]); // the newer duplicate wins; broken fields are repaired
  await page.evaluate(() => renderDeckEdit('ok'));
  await page.evaluate(() => {
    mergeBackup({ prog: {}, decks: 'x', dprog: 5 });
    mergeBackup({ prog: {}, decks: [null, { id: 'a b' }, { id: 'n1', name: 'New', words: ['airport', 5] , at: 9 }], dprog: { n1: { airport: { b: 'x' }, hotel: { b: 1 } }, gone: { a: { b: 1 } }, bad: 3 } });
    mergeBackup({ prog: {}, decks: [], dprog: { ok: [] } });
  });
  live = await page.evaluate(() => liveDecks().map((d) => d.id).sort());
  expect(live).toEqual(['n1', 'ok']);
  expect(await page.evaluate(() => S.dprog)).toEqual({ n1: { hotel: { b: 1 } } });
  await page.evaluate(() => go('decks'));
  await expect(page.locator('.deck-card')).toHaveCount(2);
  expect(errors).toEqual([]);
});

// ---- two devices, one cloud ----
async function device(browser, store, state) {
  const ctx = await browser.newContext({ baseURL: 'http://localhost:8765/', viewport: { width: 440, height: 956 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('dialog', (d) => d.accept());
  await fakeSupabase(page, store);
  await page.addInitScript((st) => { if (st && !sessionStorage.getItem('seeded')) { localStorage.setItem('oxford3000.v1', JSON.stringify(st)); sessionStorage.setItem('seeded', '1'); } }, state ? { seenVer: '99.0.0', ...state } : { seenVer: '99.0.0' });
  await page.goto('index.html');
  await expect(page.locator('#view')).not.toBeEmpty();
  return { ctx, page, errors };
}

test('sync: a set made on one device appears on the other; edits, deletes and old backups merge by newest', async ({ browser }) => {
  const store = { data: null };
  const A = await device(browser, store), B = await device(browser, store);
  const pa = A.page, pb = B.page;
  // create on A → B
  await pa.evaluate(() => { const d = addDeck('Week 1', '🎓', ['airport', 'hotel']); S.dprog[d.id] = { airport: { b: 2, i: 3, e: 2.5, d: 10, s: 1, c: 1, x: 0 } }; save(); });
  expect(await syncOnce(pa)).toBe(true);
  expect(await syncOnce(pb)).toBe(true);
  const id = await pa.evaluate(() => S.decks[0].id);
  expect(await pb.evaluate(() => liveDecks().map((d) => [d.id, d.name, d.words]))).toEqual([[id, 'Week 1', ['airport', 'hotel']]]);
  expect(await pb.evaluate((id) => S.dprog[id].airport.b, id)).toBe(2);
  await pb.evaluate(() => go('decks'));
  await expect(pb.locator('.deck-card')).toContainText('Week 1');
  // progress made on B (further along) and on A (a different word) merge word by word
  await pb.evaluate((id) => { S.dprog[id].airport = { b: 3, i: 7, e: 2.5, d: 20, s: 2, c: 2, x: 0 }; save(); }, id);
  await pa.evaluate((id) => { S.dprog[id].hotel = { b: 1, i: 1, e: 2.5, d: 5, s: 1, c: 1, x: 0 }; save(); }, id);
  await syncOnce(pb); await syncOnce(pa); await syncOnce(pb);
  for (const p of [pa, pb]) expect(await p.evaluate((id) => [S.dprog[id].airport.b, S.dprog[id].hotel.b], id)).toEqual([3, 1]);
  // renamed on both: the later edit wins on both devices
  await pa.evaluate((id) => { const d = deckById(id); d.name = 'from A'; d.at = Date.now() + 1000; save(); }, id);
  await pb.evaluate((id) => { const d = deckById(id); d.name = 'from B'; d.at = Date.now() + 5000; save(); }, id);
  await syncOnce(pa); await syncOnce(pb); await syncOnce(pa);
  for (const p of [pa, pb]) expect(await p.evaluate((id) => deckById(id).name, id)).toBe('from B');
  // an old backup (still holding the set) must not bring back a set deleted afterwards
  const old = await pa.evaluate(() => JSON.parse(JSON.stringify(S)));
  await pa.evaluate((id) => { const d = deckById(id); d.del = true; d.words = []; d.at = Date.now() + 9000; delete S.dprog[id]; save(); }, id);
  await syncOnce(pa); await syncOnce(pb);
  expect(await pb.evaluate(() => liveDecks().length)).toBe(0);
  expect(await pb.evaluate((id) => S.dprog[id], id)).toBeUndefined();
  await pb.evaluate((b) => mergeBackup(b), old);
  await pa.evaluate((b) => mergeBackup(b), old);
  for (const p of [pa, pb]) expect(await p.evaluate(() => liveDecks().length)).toBe(0);
  expect(A.errors).toEqual([]); expect(B.errors).toEqual([]);
  await A.ctx.close(); await B.ctx.close();
});

test('sync: tombstones older than 90 days are dropped, newer ones kept', async ({ browser }) => {
  const now = Date.now();
  const store = { data: { prog: {}, decks: [deck('old', { del: true, words: [], at: now - 100 * DAYS }), deck('new', { del: true, words: [], at: now - 10 * DAYS }), deck('live', { at: now })] } };
  const A = await device(browser, store, { decks: [deck('mine-old', { del: true, words: [], at: now - 120 * DAYS })] });
  await syncOnce(A.page);
  const ids = await A.page.evaluate(() => S.decks.map((d) => d.id).sort());
  expect(ids).toEqual(['live', 'new']);
  expect(A.errors).toEqual([]);
  await A.ctx.close();
});
