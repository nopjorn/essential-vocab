// Stats extras (1.255.0): accuracy by hour (S.act x.hj / x.hr), words mastered this month (S.mday), accuracy by topic / part
// of speech, word pairs mixed up (S.conf), skill mix, activity chart length, and hiding / moving stats parts.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('new stats data is logged, cleaned and merged from a backup', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const r = await page.evaluate(() => {
    const w = (x) => W.find((y) => y.w === x);
    go('games'); actGame = 'en2th';
    markActive(true); markActive(false); markActive();
    confLog(w('apple'), w('house')); confLog(w('apple'), w('house')); confLog(w('apple'), w('apple'));
    masteredMoment(w('dog'));
    const x = S.act[today()].x;
    mergeBackup({ conf: { apple: { house: 5, bad: 'x' }, cat: 'no' }, mday: { book: '2026-01-02', bad: 'nope' } });
    flushSave();
    return { hj: x.hj.reduce((a, b) => a + b, 0), hr: x.hr.reduce((a, b) => a + b, 0), conf: S.conf, mday: S.mday };
  });
  expect(r.hj).toBe(2); // markActive() without ok is not judged
  expect(r.hr).toBe(1);
  expect(r.conf).toEqual({ apple: { house: 5 } });
  expect(Object.keys(r.mday).sort()).toEqual(['book', 'dog']);
  const st = await readState(page);
  expect(st.conf.apple.house).toBe(5);
  expect(st.mday.book).toBe('2026-01-02');
  expect(errors).toEqual([]);
});

test('stats page shows the new cards, the chart length switch and the layout panel', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  await page.evaluate(() => {
    const t = today(), A = W.filter((w) => w.g === 'A1');
    A.slice(0, 60).forEach((w, i) => { S.prog[w.w] = { b: 3, i: 10, e: 2.5, d: Date.now() + 9e8, s: 6, c: i % 3 ? 5 : 2, x: i % 3 ? 1 : 4, t: Date.now() }; });
    const hj = Array(24).fill(0), hr = Array(24).fill(0);
    hj[7] = 40; hr[7] = 36; hj[20] = 40; hr[20] = 24;
    S.act[t] = { game: [80, 600, 80, 60], x: { g: { en2th: [60, 400, 60, 50], listen: [20, 200, 20, 10] }, hj, hr } };
    S.conf = { [A[0].w]: { [A[1].w]: 3 }, [A[1].w]: { [A[0].w]: 2 } };
    S.mday = { [A[2].w]: t };
    go('stats');
  });
  await expect(page.locator('#hourBox')).toContainText('แม่นกว่า');
  await expect(page.locator('#mastBox [data-wsi]')).toHaveCount(1);
  await expect(page.locator('#tpAcc .act-row').first()).toBeVisible();
  await expect(page.locator('#confBox .cf-row')).toHaveCount(1);
  await expect(page.locator('#confBox .cf-row')).toContainText('5 ครั้ง');
  await expect(page.locator('#skillBox')).toContainText('ฟังและเสียง');

  // chart length
  await page.click('[data-chart="act"] [data-ad="60"]');
  await expect(page.locator('[data-chart="act"] svg .hit')).toHaveCount(60);

  // layout: hide the mix-up part, move the second part to the top
  await page.click('#stLay');
  await expect(page.locator('#stLayBox')).toBeVisible();
  const key = 'คู่คำที่ชอบสับสน';
  const box = page.locator('#stLayBox .lay-row', { hasText: key }).locator('input');
  await box.uncheck();
  await expect(page.locator('#confBox')).toBeHidden();
  const keys = await page.evaluate(() => statUnits().map((u) => u.key));
  await page.click('#stLayBox [data-lu="1"]');
  const after = await page.evaluate(() => statUnits().map((u) => u.key));
  expect(after[0]).toBe(keys[1]);
  const st = await readState(page);
  expect(st.settings.statHide.some((k) => k.includes(key))).toBe(true);
  expect(st.settings.statOrder[0]).toBe(keys[1]);

  // kept after reopening the page; reset brings everything back
  await page.evaluate(() => go('stats'));
  await expect(page.locator('#confBox')).toBeHidden();
  await page.click('#stLay');
  await page.click('#layReset');
  await expect(page.locator('#confBox')).toBeVisible();
  expect(await page.evaluate(() => statUnits()[0].key)).toBe(keys[0]);

  // practise the mixed-up pairs
  await page.click('#confGo');
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'games');
  expect(errors).toEqual([]);
});
