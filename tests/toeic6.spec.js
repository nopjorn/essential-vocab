// TOEIC Part 6 game (1.185.0): a workplace text with 4 blanks, one question per blank, earlier blanks filled in, own SRS in S.lex.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('TOEIC Part 6: blanks of a text in order, earlier ones filled in, right and wrong answers, Thai summary hint', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('games'));
  await page.locator('[data-game="toeic6"]').click();
  const view = page.locator('#view');
  await expect(view.locator('.p6-doc')).toBeVisible();
  await expect(view.locator('.p6-now')).toHaveCount(1);
  await expect(view.locator('.opt')).toHaveCount(4);

  const runs = [];
  for (let n = 0; n < 5; n++) {
    const cur = await page.evaluate(() => ({ id: playQuiz.cur._p6.d.id, k: playQuiz.cur._p6.k, right: playQuiz.cur._p6.opts[playQuiz.cur._p6.a] }));
    runs.push(cur);
    // blanks before this one are shown filled in, later ones as (n)
    await expect(view.locator('.p6-done')).toHaveCount(cur.k);
    await expect(view.locator('.p6-gap')).toHaveCount(3 - cur.k);
    if (n === 0) { await view.locator('#p6Hint').click(); await expect(view.locator('#p6Th')).toBeVisible(); }
    if (n === 1) {
      const wrong = await page.evaluate(() => { const r = playQuiz.cur._p6; return r.opts.find((o, i) => i !== r.a); });
      await view.locator(`.opt[data-o="${wrong}"]`).click();
      await expect(view.locator('.opt.wrong')).toHaveCount(1);
    } else {
      await view.locator(`.opt[data-o="${cur.right}"]`).click();
      await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
    }
    await expect(view.locator('.p6-doc mark')).toHaveText(cur.right);
    await expect(view.locator('.p7-why')).toBeVisible();
    await view.locator('#nextQ').click();
  }
  for (let i = 0; i < runs.length; i++) {
    if (i && runs[i].id === runs[i - 1].id) expect(runs[i].k).toBe(runs[i - 1].k + 1);
    else expect(runs[i].k).toBe(0);
  }
  expect(runs[4].k).toBe(0); // 4 blanks a text: the fifth question opens the next text
  const round = await page.evaluate(() => setOrder(lexPick('toeic6', p6Items(), 10), p6Items()).length);
  expect(round).toBe(12);
  await page.evaluate(() => flushSave());
  const st = await readState(page);
  const keys = Object.entries(st.lex).filter(([k]) => k.startsWith('toeic6:'));
  expect(keys.length).toBe(5);
  expect(keys.filter(([, p]) => p.x === 1).length).toBe(1);
  expect(errors).toEqual([]);
});
