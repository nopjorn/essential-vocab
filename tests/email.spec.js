// Build an email (1.206.0): game `email`, the parts of one email stay together, the last part shows the whole email.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('email game: parts in order, filled as you go, wrong part marked, whole email at the end', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => startGame('email'));
  const view = page.locator('#view');
  await expect(view.locator('.em-now')).toHaveCount(1);
  const cur = () => page.evaluate(() => playQuiz.cur._em);
  const first = await cur();
  expect(first.k).toBe(0);
  // wrong first, then the right ones for the rest of the email
  await view.locator('.opt').filter({ hasText: first.wrong[0] }).first().click();
  await expect(view.locator('.opt.correct')).toHaveText(first.right);
  await expect(view.locator('#emPaper .em-done')).toHaveCount(1);
  for (let k = 1; k < first.d.p.length; k++) {
    await view.locator('#nextQ').click();
    const e = await cur();
    expect(e.d.id).toBe(first.d.id); expect(e.k).toBe(k);
    await expect(view.locator('#emPaper .em-done')).toHaveCount(k);
    await view.locator('.opt').filter({ hasText: e.right }).first().click();
    await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
  }
  await expect(view.locator('.em-full')).toContainText(first.d.p[4][1]);
  await view.locator('[data-sayex]').click();
  expect(await page.evaluate(() => window.__said.at(-1))).toContain(first.d.p[0][1]);
  await page.evaluate(() => flushSave());
  const keys = Object.entries((await readState(page)).lex).filter(([k]) => k.startsWith('email:'));
  expect(keys.length).toBe(5);
  expect(keys.filter(([, p]) => p.x === 1)).toHaveLength(1);
  expect(errors).toEqual([]);
});
