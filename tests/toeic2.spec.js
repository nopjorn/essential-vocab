// TOEIC Part 2 game (1.186.0): the question and (A) (B) (C) are spoken, text hidden until 📝 or the answer, own SRS in S.lex.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('TOEIC Part 2: question + A/B/C spoken in order, text hidden until asked, right and wrong answers, replay and slow', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('games'));
  await page.locator('[data-game="toeic2"]').click();
  const view = page.locator('#view');
  await expect(view.locator('.p2-opt')).toHaveCount(3);
  const cur = () => page.evaluate(() => ({ ...playQuiz.cur._p2, opts: [...document.querySelectorAll('.p2-opt')].map((b) => b.dataset.o) }));
  let r = await cur();
  // spoken: the question, then A. B. C. in the order of the buttons
  await expect.poll(() => page.evaluate(() => window.__said.slice(-4))).toEqual([r.q, ...r.opts.map((o, k) => 'ABC'[k] + '. ' + o)]);
  await expect(view.locator('#p2Now')).toContainText('เลือกคำตอบ');
  await expect(view.locator('#p2Q')).toBeHidden();
  await expect(view.locator('.p2-t').first()).toBeHidden();
  // 📝 shows the text
  await view.locator('#p2Hint').click();
  await expect(view.locator('#p2Q')).toHaveText(r.q);
  await expect(view.locator('.p2-t').first()).toBeVisible();
  // 🐢 replays slower
  await page.evaluate(() => (window.__rates.length = 0));
  await view.locator('#p2Slow').click();
  await expect.poll(() => page.evaluate(() => window.__rates.length)).toBe(4);
  const rates = await page.evaluate(() => window.__rates);
  expect(Math.max(...rates)).toBeLessThan(0.9);
  // right answer
  await view.locator(`.p2-opt[data-o="${r.right}"]`).click();
  await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
  await expect(view.locator('.p7-why')).toContainText(r.tip);
  await view.locator('#nextQ').click();
  // wrong answer: the text appears, the right letter is named
  r = await cur();
  await expect(view.locator('#p2Q')).toBeHidden();
  await view.locator(`.p2-opt[data-o="${r.wrong[0]}"]`).click();
  await expect(view.locator('.opt.wrong')).toHaveCount(1);
  await expect(view.locator('#reveal')).toContainText(`ที่ถูกคือ ${'ABC'[r.opts.indexOf(r.right)]}`);
  await expect(view.locator('#p2Q')).toBeVisible();
  await expect(view.locator('.p2-t').first()).toBeVisible();
  await page.evaluate(() => flushSave());
  const st = await readState(page);
  const keys = Object.entries(st.lex).filter(([k]) => k.startsWith('toeic2:'));
  expect(keys.length).toBe(2);
  expect(keys.filter(([, p]) => p.x === 1).length).toBe(1);
  expect(errors).toEqual([]);
});
