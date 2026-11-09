// Role play (1.232.0): scenes from data/roleplay.js as a game (`rplay`, steps of a scene stay together) and a reference page.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('rplay game: their line is spoken, the right reply fills the chat, a wrong one shows the right one; steps stay in order', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => startGame('rplay'));
  const view = page.locator('#view');
  await expect(view.locator('.options .opt')).toHaveCount(3);
  let e = await page.evaluate(() => { const x = playQuiz.cur._rp; return { id: x.d.id, k: x.k, them: x.them, right: x.right, why: x.why }; });
  expect(e.k).toBe(0);
  await expect.poll(() => page.evaluate(() => window.__said.at(-1))).toBe(e.them);
  await view.locator('.opt').filter({ hasText: e.right }).first().click();
  await expect(view.locator('#reveal')).toContainText('ตอบได้เหมาะ');
  await expect(view.locator('#reveal')).toContainText(e.why);
  await expect(view.locator('#rpLog .rp-me').last()).toHaveText(e.right);
  await view.locator('#nextQ').click();
  const e2 = await page.evaluate(() => { const x = playQuiz.cur._rp; return { id: x.d.id, k: x.k, right: x.right }; });
  expect(e2).toMatchObject({ id: e.id, k: 1 });
  await expect(view.locator('#rpLog .rp-me')).toHaveCount(2); // step 0's reply + the gap
  await view.locator('.opt').filter({ hasNotText: e2.right }).first().click();
  await expect(view.locator('#reveal')).toContainText('ควรตอบว่า');
  await page.evaluate(() => flushSave());
  expect(Object.keys((await readState(page)).lex).filter((k) => k.startsWith('rplay:')).length).toBe(2);
  expect(errors).toEqual([]);
});

test('role play page lists every scene, speaks a line and plays one scene', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => go('ref'));
  await page.locator('#toRp').click();
  await expect(page.locator('#rpList .pair-card').first()).toBeVisible();
  const n = await page.evaluate(() => ROLEPLAY.length);
  await expect(page.locator('#rpList .pair-card')).toHaveCount(n);
  await page.locator('#rpList [data-say]').first().click();
  await expect.poll(() => page.evaluate(() => window.__said.length)).toBeGreaterThan(0);
  await page.locator('#rpList [data-rp="hotel"]').click();
  await expect(page.locator('.options .opt')).toHaveCount(3);
  expect(await page.evaluate(() => playQuiz.cur._rp.d.id)).toBe('hotel');
  expect(errors).toEqual([]);
});
