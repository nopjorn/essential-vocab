// Formal ↔ casual (1.205.0): reference page and game `regi` (two items per row: to a client = formal, to a teammate = casual).
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('the register page lists every row with three lines and speaks a tapped one', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => go('ref'));
  await page.locator('#toRg').click();
  await expect(page.locator('#rgList .pair-card').first()).toBeVisible();
  const n = await page.evaluate(() => REGISTER.length);
  await expect(page.locator('#rgList .pair-card')).toHaveCount(n);
  await page.locator('#rgList [data-say]').first().click();
  await expect.poll(() => page.evaluate(() => window.__said.length)).toBeGreaterThan(0);
  await page.locator('#rgPlay').click();
  await expect(page.locator('.options .opt')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('regi game: right line for the reader, then the blunt line is wrong; both registers get their own key', async ({ page }) => {
  const errors = await openApp(page);
  expect(await page.evaluate(async () => { await loadRegister(); return rgItems().length === REGISTER.length * 2; })).toBe(true);
  await page.evaluate(() => startGame('regi'));
  const view = page.locator('#view');
  const cur = () => page.evaluate(() => ({ r: playQuiz.cur._rg, to: playQuiz.cur._to }));
  let { r, to } = await cur();
  await expect(view.locator('.rg-to')).toContainText(to === 'f' ? 'ลูกค้า' : 'เพื่อนร่วมทีม');
  await view.locator('.opt').filter({ hasText: r[to] }).first().click();
  await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
  await expect(view.locator('.rg-ex')).toContainText(r.tip);
  expect(await page.evaluate(() => window.__said.at(-1))).toBe(r[to]);
  await view.locator('#nextQ').click();
  ({ r, to } = await cur());
  await view.locator('.opt').filter({ hasText: r.b }).first().click();
  await expect(view.locator('#reveal')).toContainText('ห้วนเกินไป');
  await expect(view.locator('.opt.correct')).toHaveText(r[to]);
  await page.evaluate(() => flushSave());
  const keys = Object.entries((await readState(page)).lex).filter(([k]) => k.startsWith('regi:'));
  expect(keys.length).toBe(2);
  expect(keys.some(([, p]) => p.x === 1)).toBe(true);
  expect(errors).toEqual([]);
});
