// TOEIC Part 7 game (1.184.0): a workplace text on top, its questions one by one and kept together in a round, own SRS in S.lex.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('TOEIC Part 7: text + question, questions of a text stay together, right and wrong answers, Thai summary hint', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('games'));
  await page.locator('[data-game="toeic7"]').click();
  const view = page.locator('#view');
  await expect(view.locator('.p7-doc')).toBeVisible();
  await expect(view.locator('.p7-q')).toBeVisible();
  await expect(view.locator('.opt')).toHaveCount(4);

  // grouping: walk the round's questions in order; each text appears as one run, its questions in order
  const runs = [];
  for (let n = 0; n < 4; n++) {
    const cur = await page.evaluate(() => ({ id: playQuiz.cur._p7.d.id, k: playQuiz.cur._p7.k, right: playQuiz.cur._p7.opts[playQuiz.cur._p7.a] }));
    runs.push(cur);
    if (n === 0) { await view.locator('#p7Hint').click(); await expect(view.locator('#p7Th')).toBeVisible(); }
    if (n === 1) {
      const wrong = await page.evaluate(() => { const r = playQuiz.cur._p7; return r.opts.find((o, i) => i !== r.a); });
      await view.locator(`.opt[data-o="${wrong}"]`).click();
      await expect(view.locator('.opt.wrong')).toHaveCount(1);
    } else {
      await view.locator(`.opt[data-o="${cur.right}"]`).click();
      await expect(view.locator('#reveal')).toContainText('ถูกต้อง');
    }
    await expect(view.locator('.p7-why')).toBeVisible();
    await view.locator('#nextQ').click();
  }
  // whole texts: every text starts at its first question and its questions follow in order
  for (let i = 0; i < runs.length; i++) {
    if (i && runs[i].id === runs[i - 1].id) expect(runs[i].k).toBe(runs[i - 1].k + 1);
    else expect(runs[i].k).toBe(0);
  }
  const round = await page.evaluate(() => p7Order(lexPick('toeic7', p7Items(), 10), p7Items()).map((w) => w._p7.d.id + ':' + w._p7.k));
  expect(round.length).toBeGreaterThanOrEqual(10);
  expect(round.length).toBeLessThanOrEqual(12);
  await page.evaluate(() => flushSave());
  const st = await readState(page);
  const keys = Object.entries(st.lex).filter(([k]) => k.startsWith('toeic7:'));
  expect(keys.length).toBe(4);
  expect(keys.filter(([, p]) => p.x === 1).length).toBe(1);
  expect(errors).toEqual([]);
});

test('stats page: 💼 TOEIC card by part — accuracy, due, weakest part, start buttons (1.193.0)', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => {
    const now = Date.now(), d = (g, k, s, c, due) => (S.lex[`${g}:${k}`] = { b: 1, i: 1, e: 2.5, d: due, s, c, x: s - c, t: now });
    for (let k = 0; k < 6; k++) d('toeic2', k, 2, 1, now - 1000); // 50 % over 12 answers, all due
    for (let k = 0; k < 6; k++) d('toeic5', k, 2, 2, now + 864e5 * 5); // 100 %
    S.glast = { toeic2: today(), toeic5: today() };
    go('stats');
  });
  const box = page.locator('#toeicBox');
  await expect(box).toBeVisible();
  await expect(box.locator('tr')).toHaveCount(8); // head + 7 parts
  await expect(box.locator('tr.weak')).toContainText('Part 2');
  await expect(box.locator('tr.weak')).toContainText('50%');
  await expect(box.locator('tr', { hasText: 'Part 5' })).toContainText('100%');
  await expect(box).toContainText('Part 2 (แม่น 50%)');
  await expect(box).toContainText('ไม่ได้ฝึก 7 วันขึ้นไป');
  await box.locator('.btn.primary[data-tgo="toeic2"]').click();
  await expect(page.locator('.p2-card')).toBeVisible();
  expect(errors).toEqual([]);
});
