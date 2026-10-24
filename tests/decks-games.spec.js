// "ชุดของฉัน" 1.56: games from a set (one set = its own progress, several = practice), the home box.
const { test, expect } = require('@playwright/test');
const { openApp, readState, playRound } = require('./helpers');

const mk = (id, name, extra = {}) => ({ id, name, icon: '📚', words: [], at: 1000, used: 1000, ...extra });
// 400 words from the list (A1/A2) so every pool game finds enough of what it needs
async function setup(page, extra = {}) {
  const errors = await openApp(page, { placedAt: '2026-01-01', decks: [mk('d1', 'ชุดใหญ่'), mk('d2', 'ชุดสอง', { used: 5 })], ...extra });
  await page.evaluate(() => {
    const ws = W.filter((w) => w.g === 'A1' || w.g === 'A2').map((w) => w.w);
    S.decks[0].words = ws.slice(0, 400); S.decks[1].words = ws.slice(400, 600);
    W.filter((w) => w.g === 'A1').slice(0, 12).forEach((w) => (S.prog[w.w] = { b: 1, i: 1, e: 2.5, d: Date.now(), s: 2, c: 1, x: 2 }));
    save();
  });
  return errors;
}
const lock = (page) => page.evaluate(() => { flushSave(); return JSON.stringify([S.prog, S.daily, S.snap, S.miss, S.stk]); });

for (const id of ['en2th', 'th2en', 'listen', 'cloze', 'colloc', 'emoji', 'spell', 'dict', 'order', 'speak']) {
  test(`set game ${id}: one set, right and wrong answers; its progress changes, the main statistics do not`, async ({ page }) => {
    const errors = await setup(page);
    await page.evaluate(() => { Math.random = () => 0.3; gameSource = 'deck'; gameDecks = ['d1']; go('games'); });
    const before = await lock(page);
    const hist0 = await page.evaluate(() => [S.xp, S.hist[today()] || 0]);
    await page.evaluate((id) => startGame(id), id);
    const seen = await playRound(page, id);
    expect(seen.ok + seen.bad).toBeGreaterThan(0);
    expect(await lock(page)).toBe(before);
    const st = await readState(page);
    const inDeck = new Set(st.decks[0].words);
    if (id !== 'order' && id !== 'speak') expect(Object.keys(st.dprog.d1 || {}).length, 'set progress').toBeGreaterThan(0); // order/speak: wrong answers are soft
    expect(Object.keys(st.dprog.d1 || {}).every((w) => inDeck.has(w))).toBe(true);
    expect(st.dprog.d2).toBeUndefined();
    expect(st.xp).toBeGreaterThan(hist0[0]);
    expect(st.hist[await page.evaluate(() => today())]).toBeGreaterThan(hist0[1]);
    expect(errors).toEqual([]);
  });
}

test('set game match: right and wrong pairs go to the set only', async ({ page }) => {
  const errors = await setup(page);
  await page.evaluate(() => { gameSource = 'deck'; gameDecks = ['d1']; go('games'); });
  const before = await lock(page);
  await page.evaluate(() => startGame('match'));
  const grid = page.locator('.match-grid');
  const ids = await grid.locator('[data-k="en"]').evaluateAll((els) => els.map((e) => e.dataset.i));
  await grid.locator(`[data-k="en"][data-i="${ids[0]}"]`).click();
  await grid.locator(`[data-k="th"][data-i="${ids[1]}"]`).click();
  for (const i of ids) { await grid.locator(`[data-k="en"][data-i="${i}"]`).click(); await grid.locator(`[data-k="th"][data-i="${i}"]`).click(); }
  expect(await lock(page)).toBe(before);
  expect(Object.keys((await readState(page)).dprog.d1).length).toBe(6);
  expect(errors).toEqual([]);
});

test('several sets = practice: no set progress and no main progress, but XP and history grow', async ({ page }) => {
  const errors = await setup(page);
  await page.evaluate(() => { Math.random = () => 0.3; gameSource = 'deck'; gameDecks = ['d1', 'd2']; go('games'); });
  await expect(page.locator('#view')).toContainText('โหมดซ้อม');
  const before = await lock(page), dp = await page.evaluate(() => JSON.stringify(S.dprog));
  const x0 = await page.evaluate(() => S.xp);
  await page.evaluate(() => startGame('en2th'));
  const seen = await playRound(page, 'en2th');
  expect(seen.ok).toBeGreaterThan(0); expect(seen.bad).toBeGreaterThan(0);
  expect(await lock(page)).toBe(before);
  expect(await page.evaluate(() => JSON.stringify(S.dprog))).toBe(dp);
  expect(await page.evaluate(() => S.xp)).toBeGreaterThan(x0);
  await page.evaluate(() => { go('games'); startGame('match'); });
  const grid = page.locator('.match-grid');
  for (const i of await grid.locator('[data-k="en"]').evaluateAll((els) => els.map((e) => e.dataset.i))) { await grid.locator(`[data-k="en"][data-i="${i}"]`).click(); await grid.locator(`[data-k="th"][data-i="${i}"]`).click(); }
  expect(await page.evaluate(() => JSON.stringify(S.dprog))).toBe(dp);
  expect(errors).toEqual([]);
});

test('small sets and filtered games explain themselves; a deleted set drops out; no leak to games started elsewhere', async ({ page }) => {
  const errors = await setup(page);
  await page.evaluate(() => { S.decks[1].words = ['airport', 'hotel', 'ticket', 'taxi', 'visa']; gameSource = 'deck'; gameDecks = ['d2']; go('games'); });
  await page.evaluate(() => startGame('match'));
  await expect(page.locator('#toast')).toContainText('ไม่ถึง 6 คำ');
  await expect(page.locator('#view .match-grid')).toHaveCount(0);
  await page.evaluate(() => { S.decks[1].words = W.filter((w) => !hasCloze(w)).slice(0, 8).map((w) => w.w); startGame('cloze'); });
  await expect(page.locator('#toast')).toContainText('ประโยคตัวอย่าง');
  // set deleted (e.g. by another device) while still selected
  await page.evaluate(() => { const d = S.decks[1]; d.del = true; d.words = []; d.at = Date.now(); save(); go('games'); });
  expect(await page.evaluate(() => gameSource)).toBe('level');
  await page.evaluate(() => { gameSource = 'deck'; gameDecks = ['d1']; go('home'); });
  const dp = await page.evaluate(() => JSON.stringify(S.dprog));
  await page.evaluate(() => startGame('en2th')); // e.g. the home quest button: stale set source must not apply
  expect(await page.evaluate(() => gameSource)).toBe('level');
  await page.locator('#quit').click().catch(() => {});
  expect(await page.evaluate(() => JSON.stringify(S.dprog))).toBe(dp);
  expect(errors).toEqual([]);
});

test('set page → 🎮 and the source chooser in the games menu', async ({ page }) => {
  const errors = await setup(page);
  await page.evaluate(() => go('decks', 'd1'));
  await page.locator('#dkPlay').click();
  await expect(page.locator('#src')).toBeHidden();
  await expect(page.locator('#srcBtn')).toContainText('ชุดใหญ่');
  await expect(page.locator('#gDecks .chip.on')).toHaveCount(1);
  await page.locator('#gDecks [data-d="d1"]').click(); // the last selected set can't be switched off
  await expect(page.locator('#gDecks .chip.on')).toHaveCount(1);
  await page.locator('#gDecks [data-d="d2"]').click();
  await expect(page.locator('#srcBtn')).toContainText('2 ชุด');
  await expect(page.locator('#view')).toContainText('โหมดซ้อม');
  await page.locator('#srcBtn').click();
  await page.locator('#src [data-s="level"]').click();
  await page.locator('#srcBtn').click();
  await page.locator('#src [data-s="deck"]').click();
  await expect(page.locator('#gDecks .chip.on').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('home box: hidden without sets, newest 3 with due counts, study button, reorderable, odd data safe', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await expect(page.locator('[data-hb="decks"]')).toHaveCount(0);
  await page.evaluate(() => {
    ['a', 'b', 'c', 'd'].forEach((n, i) => { const d = addDeck('ชุด ' + n, '📚', ['airport', 'hotel', 'ticket']); d.used = 100 + i; });
    const first = S.decks.find((d) => d.name === 'ชุด d'); S.dprog[first.id] = { airport: { b: 1, i: 1, e: 2.5, d: 1, s: 1, c: 1, x: 0 } };
    go('home');
  });
  await expect(page.locator('[data-hb="decks"] .dk-home')).toHaveCount(3);
  await expect(page.locator('[data-hb="decks"] .dk-home').first()).toContainText('ชุด d');
  await expect(page.locator('[data-hb="decks"] .dk-home').first()).toContainText('ครบกำหนด 1');
  await page.locator('[data-hb="decks"] [data-dkgo]').first().click();
  await expect(page.locator('#pcount')).toBeVisible();
  await page.locator('#quit').click();
  await expect(page.locator('#dkStudy')).toBeVisible();
  // a layout saved before 1.56 gets the box appended at the end; the arrange page lists and toggles it
  await page.evaluate(() => { S.homeCfg = [{ id: 'hero', on: true, w: 'full' }, { id: 'prog', on: true, w: 'full' }]; go('home'); });
  const ids = await page.locator('.hb').evaluateAll((els) => els.map((e) => e.dataset.hb));
  expect(ids.slice(0, 2)).toEqual(['hero', 'prog']); expect(ids).toContain('decks');
  await page.evaluate(() => go('homeset'));
  await expect(page.locator('#view')).toContainText('ชุดของฉัน');
  await page.evaluate(() => { const c = homeBlocks().map((b) => ({ id: b.id, on: b.id === 'decks' ? false : b.on, w: b.w })); S.homeCfg = c; save(); go('home'); });
  await expect(page.locator('[data-hb="decks"]')).toHaveCount(0);
  await page.evaluate(() => { S.decks = 'oops'; go('home'); });
  await expect(page.locator('#view')).not.toBeEmpty();
  expect(errors).toEqual([]);
});
