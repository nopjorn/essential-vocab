// Flashcard tab start screen and the pages around a session (1.169 on).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const DAY = 864e5;
const due = (k) => ({ b: 2, i: 3, e: 2.5, d: Date.now() - (k + 1) * 3600e3, s: 3, c: 2, x: 0 });
const DUE = ['apple', 'house', 'water', 'bread', 'dog'];
const state = () => ({ placedAt: '2026-01-01', settings: { levels: ['A1'], newPerDay: 5 }, prog: Object.fromEntries(DUE.map((w, k) => [w, due(k)])) });

test('1.169: the flashcard tab opens a start screen with today\'s numbers and study modes', async ({ page }) => {
  const errors = await openApp(page, state());
  await page.click('#tabbar > button[data-tab="cards"]');
  await expect(page.locator('#hubStart')).toContainText('10 ใบ');
  await expect(page.locator('.ch-stats')).toContainText('ทบทวน');
  await expect(page.locator('[data-hub="short"]')).toBeVisible();
  // ▶︎ starts today's session; ✕ comes back to the start screen
  await page.click('#hubStart');
  await expect(page.locator('#fc')).toBeVisible();
  await expect(page.locator('#pcount')).toHaveText('0/10');
  await page.click('#quit');
  await expect(page.locator('#hubStart')).toBeVisible();
  // reviews only / new words only
  await page.click('[data-hub="rev"]');
  await expect(page.locator('#pcount')).toHaveText('0/5');
  expect(DUE).toContain(await page.locator('#fc .word').first().textContent());
  await page.click('#quit');
  await page.click('[data-hub="new"]');
  await expect(page.locator('#pcount')).toHaveText('0/5');
  expect(DUE).not.toContain(await page.locator('#fc .word').first().textContent());
  // other ways in still start right away and ✕ goes home
  await page.evaluate(() => go('cards'));
  await expect(page.locator('#fc')).toBeVisible();
  await page.click('#quit');
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'home');
  expect(errors).toEqual([]);
});

test('1.169: with nothing left today the tab shows the done page', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'], newPerDay: 0 }, prog: { apple: { ...due(0), d: Date.now() + 3 * DAY } } });
  await page.click('#tabbar > button[data-tab="cards"]');
  await expect(page.locator('#view')).toContainText('วันนี้ทำครบแล้ว');
  expect(errors).toEqual([]);
});

test('what-next menu: three groups, one recommended button, the same menu under the start screen', async ({ page }) => {
  const leech = { b: 0, i: 1, e: 2.5, d: Date.now() + 3 * DAY, s: 9, c: 2, x: 6 };
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'], newPerDay: 0 }, prog: { apple: leech, house: leech, water: leech, bread: { ...leech, x: 0 } } });
  await page.evaluate(() => go('cards'));
  await expect(page.locator('#view')).toContainText('วันนี้ทำครบแล้ว');
  await expect(page.locator('.ns-grp')).toHaveCount(3);
  await expect(page.locator('.quick-btn.rec')).toHaveCount(1);
  await expect(page.locator('.quick-btn.rec')).toHaveAttribute('data-ns', 'leech');
  // start screen: the menu is there (no recommendation of its own) and a session from it comes back with ✕
  await page.evaluate(() => { S.settings.newPerDay = 5; go('cards', 'hub'); });
  await expect(page.locator('#hubStart')).toBeVisible();
  await expect(page.locator('.ns-grp')).toHaveCount(3);
  await expect(page.locator('.quick-btn.rec')).toHaveCount(0);
  await page.click('[data-ns="leech"]');
  await expect(page.locator('#fc')).toBeVisible();
  await page.click('#quit');
  await expect(page.locator('#hubStart')).toBeVisible();
  expect(errors).toEqual([]);
});

test('round summary: cards, % remembered, XP, time, forgotten words to practise again or put in a set', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'], newPerDay: 0, autoSpeak: false }, prog: { apple: due(0), house: due(1), water: due(2) } });
  await page.evaluate(() => go('cards'));
  let forgot = null;
  for (let k = 0; k < 12 && !(await page.locator('.rsum').count()); k++) {
    await page.click('#fc');
    if (!forgot) forgot = await page.locator('#fc .word').first().textContent();
    await page.click(`[data-g="${(await page.locator('#fc .word').first().textContent()) === forgot && k === 0 ? 0 : 2}"]`);
  }
  await expect(page.locator('.rsum')).toContainText('3');
  await expect(page.locator('.rsum')).toContainText('75%'); // 3 remembered, 1 ลืม
  await expect(page.locator('.rsum')).toContainText('XP');
  await expect(page.locator('.rsum-miss .wl')).toHaveCount(1);
  await expect(page.locator('.rsum-miss')).toContainText(forgot);
  await page.click('.rsum-miss .wl-say');
  expect(await page.evaluate(() => window.__said.slice(-1)[0])).toBe(forgot);
  await page.click('#sumDeck');
  await page.click('.sheet [data-pd="new"]');
  await expect(page.locator('.sheet-wrap')).toHaveCount(0);
  expect(await page.evaluate(() => liveDecks().map((d) => d.words))).toEqual([[forgot]]);
  await page.click('#sumAgain');
  await expect(page.locator('#pcount')).toHaveText('0/1');
  await expect(page.locator('#fc .word').first()).toHaveText(forgot);
  expect(errors).toEqual([]);
});

test('start screen: the front-side switch saves settings.front and the next card follows it', async ({ page }) => {
  const errors = await openApp(page, state());
  await page.evaluate(() => go('cards', 'hub'));
  await expect(page.locator('[data-front="en"]')).toHaveClass(/on/);
  await page.click('[data-front="th"]');
  await expect(page.locator('[data-front="th"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-front="en"]')).not.toHaveClass(/on/);
  expect(await page.evaluate(() => S.settings.front)).toBe('th');
  await page.click('#hubStart');
  await expect(page.locator('#fc .front .th')).toBeVisible();
  await expect(page.locator('#fc .front .word')).toHaveCount(0);
  await page.click('#quit');
  await page.click('[data-front="mix"]');
  expect(await page.evaluate(() => S.settings.front)).toBe('mix');
  expect(errors).toEqual([]);
});

test('start screen: review one level and/or topic, soonest due first, choice remembered', async ({ page }) => {
  const errors = await openApp(page, state());
  await page.evaluate(() => go('cards', 'hub'));
  const info = await page.evaluate(() => { const f = W.find((w) => w.w === 'bread'); return { lv: f.g, tp: f.tp, n: W.filter((w) => S.prog[w.w] && w.tp === f.tp).length }; });
  await page.selectOption('#hubTp', info.tp);
  await expect(page.locator('#hubPickGo')).toContainText(`ทบทวน ${info.n} ใบ`);
  expect(await page.evaluate(() => S.settings.cardPick.tp)).toBe(info.tp);
  await page.click('#hubPickGo');
  await expect(page.locator('#pcount')).toHaveText(`0/${info.n}`);
  // a level with no learned words is not offered; an empty group cannot start
  await page.click('#quit');
  await expect(page.locator('#hubTp')).toHaveValue(info.tp);
  const opts = await page.locator('#hubLv option').evaluateAll((os) => os.map((o) => o.value));
  expect(opts).toEqual(['', 'A1']);
  expect(await page.evaluate(() => hubPick('A1', 'x-none').length)).toBe(0);
  expect(await page.evaluate(() => hubPick('', '').map((w) => w.w))).toEqual(['dog', 'bread', 'water', 'house', 'apple']); // most overdue first
  expect(errors).toEqual([]);
});
