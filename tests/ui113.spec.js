// 1.113: real-life text game, more goal tags / ready-made sets.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('ready-made sets: the four new goals are offered and fill a set with list words', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => go('decks'));
  for (const id of ['job', 'abroad', 'report', 'shopping']) await expect(page.locator(`[data-from="${id}"]`)).toBeVisible();
  await page.locator('[data-from="job"]').click();
  await expect(page.locator('#view')).toContainText('สมัครงาน');
  const n = await page.evaluate(() => S.decks[0].words.length);
  expect(n).toBeGreaterThan(60);
  expect(await page.evaluate(() => S.decks[0].words.every((w) => !!W.find((x) => x.w === w)))).toBe(true);
  // the goal is also a study filter and a game source
  await page.evaluate(() => { S.settings.goal = 'shopping'; });
  expect(await page.evaluate(() => W.filter((w) => inTopic(w)).length)).toBeGreaterThan(60);
  expect(errors).toEqual([]);
});

test('real-life texts: every kind renders, the hint and the answer reveal work, wrong answer goes to review', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => startGame('real'));
  await expect(page.locator('#view .rt-paper')).toBeVisible();
  await expect(page.locator('#view .opt')).toHaveCount(4);
  await page.locator('#rtHint').click();
  await expect(page.locator('#rtTh')).toBeVisible();
  // the item on screen: same text once whitespace and the blank (any run of _) are normalised
  const right = await page.evaluate(() => { const n = (x) => x.replace(/_+/g, '_').replace(/\s+/g, ''); const t = n(document.querySelector('.rt-paper').textContent); const r = REALTEXT.find((r) => n(r.text) === t); return r && r.right; });
  expect(right).toBeTruthy();
  const wrongBtn = page.locator('#view .opt', { hasNotText: right }).first();
  await wrongBtn.click();
  await expect(page.locator('#reveal')).toContainText('ที่ถูกคือ');
  await expect(page.locator('#reveal .rt-paper mark')).toBeVisible();
  expect(await page.evaluate(() => window.__said.length)).toBeGreaterThan(0); // the whole text is read out
  await page.locator('#nextQ').click();
  const st = await readState(page);
  expect(Object.keys(st.lex).some((k) => k.startsWith('real:'))).toBe(true);
  // every kind has a renderable item
  await page.evaluate(() => { for (const k of Object.keys(RT_KIND)) if (!REALTEXT.some((r) => r.kind === k)) throw new Error('empty kind ' + k); });
  expect(errors).toEqual([]);
});
