// Business collocations (1.200.0): reference page (group chips, tap to speak) and game `bizcol` (also on the 💼 TOEIC chip).
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('the collocation page lists every pair, filters by group and speaks a tapped one', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => go('ref'));
  await page.locator('#toBc').click();
  await expect(page.locator('#bcList .pair-ex').first()).toBeVisible();
  const n = await page.evaluate(() => BIZCOL.length);
  await expect(page.locator('#bcList .pair-ex')).toHaveCount(n);
  await page.locator('#bcGrps [data-g="p"]').click();
  await expect(page.locator('#bcList .pair-card')).toHaveCount(1);
  await expect(page.locator('#bcList')).toContainText('on schedule');
  await page.locator('#bcList .pair-ex').first().click();
  await expect.poll(() => page.evaluate(() => window.__said.length)).toBeGreaterThan(0);
  await page.locator('#bcPlay').click();
  await expect(page.locator('.options .opt')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('bizcol game from the TOEIC chip: hint, right answer shows the collocation, wrong answer is graded', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('games'));
  await page.locator('#gSkill [data-skill="toeic"]').click();
  await page.locator('[data-game="bizcol"]').click();
  const view = page.locator('#view');
  await expect(view.locator('.p5-s .blank')).toHaveCount(1);
  await view.locator('#bcHint').click();
  await expect(view.locator('#bcTh')).toBeVisible();
  const r = await page.evaluate(() => playQuiz.cur._bc);
  await view.locator(`.opt[data-o="${r.ans}"]`).click();
  await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
  await expect(view.locator('.bc-col')).toContainText(r.th);
  expect(await page.evaluate(() => window.__said.at(-1))).toBe(r.full);
  await view.locator('#nextQ').click();
  const r2 = await page.evaluate(() => playQuiz.cur._bc);
  await view.locator(`.opt[data-o="${r2.wrong[0]}"]`).click();
  await expect(view.locator('.opt.wrong')).toHaveCount(1);
  await expect(view.locator('.opt.correct')).toHaveText(r2.ans);
  await page.evaluate(() => flushSave());
  const keys = Object.entries((await readState(page)).lex).filter(([k]) => k.startsWith('bizcol:'));
  expect(keys.length).toBe(2);
  expect(keys.some(([, p]) => p.x === 1)).toBe(true);
  expect(errors).toEqual([]);
});
