// TOEIC Part 5 game (1.183.0): a workplace sentence with one blank, 4 options, the tip after answering, own SRS in S.lex.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('TOEIC Part 5: hint, right answer fills the blank and shows the tip, wrong answer is kept for review', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('games'));
  await expect(page.locator('[data-game="toeic5"]')).toBeVisible();
  await page.locator('[data-game="toeic5"]').click();
  const view = page.locator('#view');
  await expect(view.locator('.p5-s .blank')).toHaveCount(1);
  await expect(view.locator('.opt')).toHaveCount(4);
  await expect(view).toContainText('TOEIC Part 5');

  // hint shows the Thai translation
  await view.locator('#p5Hint').click();
  await expect(view.locator('#p5Th')).toBeVisible();

  // right answer: filled sentence, tip, sentence spoken
  const r = await page.evaluate(() => playQuiz.cur._p5);
  await view.locator(`.opt[data-o="${r.right}"]`).click();
  await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
  await expect(view.locator('#reveal mark')).toHaveText(r.right);
  await expect(view.locator('.p5-tip')).toContainText(r.tip);
  expect(await page.evaluate(() => window.__said.at(-1))).toBe(r.text.replace('___', r.right));
  await view.locator('#nextQ').click();

  // wrong answer: marked, the right one shown
  const r2 = await page.evaluate(() => playQuiz.cur._p5);
  await view.locator(`.opt[data-o="${r2.wrong[0]}"]`).click();
  await expect(view.locator('.opt.wrong')).toHaveCount(1);
  await expect(view.locator('.opt.correct')).toHaveText(r2.right);
  await page.evaluate(() => flushSave());
  const st = await readState(page);
  const keys = Object.entries(st.lex).filter(([k]) => k.startsWith('toeic5:'));
  expect(keys.length).toBe(2);
  expect(keys.some(([, p]) => p.x === 1)).toBe(true);
  expect(errors).toEqual([]);
});
