// TOEIC mock test (1.194.0): 30 questions in test order across all 7 parts, countdown, per-part result, rough score saved in S.mock.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('TOEIC mock: parts in order, sets whole, answers go to each part, result with rough score, saved and shown on stats', async ({ page }) => {
  test.setTimeout(90000);
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => go('games'));
  await page.locator('#gSkill [data-skill="toeic"]').click();
  await page.locator('[data-game="toeicMock"]').click();
  const view = page.locator('#view');
  await expect(view.locator('#mockT')).toContainText(/1[78]:\d\d/);
  const parts = [];
  for (let n = 0; n < 30; n++) {
    const cur = await page.evaluate(() => { const w = playQuiz.cur, r = w._p1 || w._p2 || w._p34 || w._p5 || w._p6 || w._p7; return { part: w._part, right: w._p5 ? w._p5.right : w._p2 ? w._p2.right : w._p1 ? w._p1.right : r.opts[r.a] }; });
    parts.push(cur.part);
    const ok = n % 3 !== 1; // two right, one wrong
    if (ok) await view.locator(`.opt[data-o="${cur.right.replace(/"/g, '\\"')}"]`).click();
    else await view.locator('.opt:not([data-o="' + cur.right.replace(/"/g, '\\"') + '"])').first().click();
    await expect(view.locator('#nextQ')).toBeVisible();
    await view.locator('#nextQ').click();
  }
  // test order: 3 × Part 1, 5 × Part 2, Part 3 set, Part 4 set, 6 × Part 5, Part 6 text, Part 7 texts
  const count = (g) => parts.filter((x) => x === g).length;
  expect(parts.slice(0, 3)).toEqual(['toeic1', 'toeic1', 'toeic1']);
  expect([count('toeic1'), count('toeic2'), count('toeic3'), count('toeic4'), count('toeic5'), count('toeic6'), count('toeic7')]).toEqual([3, 5, 3, 3, 6, 4, 6]);
  expect(parts).toEqual([...parts].sort());
  await expect(view.locator('.mock-res')).toBeVisible();
  await expect(view.locator('.mock-sec')).toContainText('การฟัง');
  await expect(view.locator('.mock-res')).toContainText('ไม่ใช่คะแนนสอบจริง');
  await expect(view.locator('.mock-res .toeic-t tr')).toHaveCount(8);
  await expect(view.locator('.wrong-list .wl')).toHaveCount(10);
  const st = await readState(page);
  expect(st.mock.length).toBe(1);
  const m = st.mock[0];
  expect(m.p.toeic1[1]).toBe(3);
  expect(Object.values(m.p).reduce((a, v) => a + v[0], 0)).toBe(20);
  const l = ['toeic1', 'toeic2', 'toeic3', 'toeic4'].reduce((a, g) => a + m.p[g][0], 0);
  expect(m.L).toBe(Math.round((5 + 490 * l / 14) / 5) * 5);
  // answers went to the parts' own review keys
  expect(Object.keys(st.lex).filter((k) => k.startsWith('toeic5:')).length).toBe(6);
  expect(Object.keys(st.lex).some((k) => k.startsWith('toeicMock:'))).toBe(false);
  // the stats card shows the mock
  await page.evaluate(() => go('stats'));
  await expect(page.locator('#toeicBox .mock-line')).toContainText(String(m.L + m.R));
  expect(errors).toEqual([]);
});

test('TOEIC mock: time running out ends the test with unanswered questions counted', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.clock.install();
  await page.evaluate(() => startGame('toeicMock'));
  await expect(page.locator('#mockT')).toBeVisible();
  await page.clock.runFor(30 * 36 * 1000 + 2000);
  await expect(page.locator('.mock-res')).toBeVisible();
  const st = await readState(page);
  expect(Object.values(st.mock[0].p).reduce((a, v) => a + v[1], 0)).toBe(30);
  expect(st.mock[0].L).toBe(5);
  expect(errors).toEqual([]);
});
