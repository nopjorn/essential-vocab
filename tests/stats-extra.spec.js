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

// 1.256.0: learning details (S.wd / heard / typo / rspd / gq / smiss / mood, act x.dv / x.f) and the deeper stats cards.
test('learning details are logged, cleaned and merged', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const r = await page.evaluate(() => {
    const w = (x) => W.find((y) => y.w === x);
    detLog(w('apple'), 'en2th', true, 2000, false); detLog(w('apple'), 'th2en', false, 9000, false); detLog(w('apple'), 'spell', false, 0, true);
    hintLog(w('apple'));
    heardLog(w('think'), 'sink'); typoLog(w('apple'), 'aple');
    gqLog('en2th', 'd'); gqLog('en2th', 'm');
    rspdLog(150, 90, 3); rspdLog(5, 90, 0); // a too-short text is skipped
    go('games'); actGame = 'en2th'; markActive(true);
    const x = S.act[today()].x;
    mergeBackup({ wd: { apple: [9, 1, 1, 1, 1, 1, 1], bad: [1] }, heard: { think: { sink: 4 } }, gq: { en2th: [5, 0, 0] }, smiss: { zebra: 2, bad: -1 }, mood: { '2026-01-02': 2, x: 1, '2026-01-03': 7 }, rspd: [['2026-01-02', 200, 100, 1], 'x'] });
    flushSave();
    return { wd: S.wd.apple, heard: S.heard, typo: S.typo, gq: S.gq.en2th, rspd: S.rspd, smiss: S.smiss, mood: S.mood, f: x.f, dv: Object.keys(x.dv) };
  });
  expect(r.wd).toEqual([9, 11000, 1, 1, 1, 2, 2]);
  expect(r.heard.think.sink).toBe(4);
  expect(r.typo.apple.aple).toBe(1);
  expect(r.gq).toEqual([5, 1, 1]);
  expect(r.rspd.length).toBe(2);
  expect(r.smiss).toEqual({ zebra: 2 });
  expect(r.mood).toEqual({ '2026-01-02': 2 });
  expect(r.f).toBe('en2th');
  expect(r.dv[0]).toMatch(/^(phone|tablet|desk)-[pl]$/);
  const st = await readState(page);
  expect(st.wd.apple[0]).toBe(9);
  expect(errors).toEqual([]);
});

test('deeper stats cards draw, practise buttons and mood work', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  await page.evaluate(() => {
    const A = W.filter((w) => w.g === 'A1'), now = Date.now();
    A.slice(0, 40).forEach((w, i) => { S.prog[w.w] = { b: 3, i: 10, e: 2.5, d: now + (i % 3 + 1) * 864e5, s: 6, c: 5, x: i < 3 ? 5 : 0, st: 30, df: 5, lr: now - 5 * 864e5, t: now }; });
    S.prog[A[0].w].i = 30; S.prog[A[0].w].d = now + 25 * 864e5;
    A.slice(0, 30).forEach((w, i) => { S.wd[w.w] = [4, i < 2 ? 40000 : 8000, i < 2 ? 4 : 0, 3, 0, 3, i < 3 ? 3 : 0]; });
    S.heard = { [A[0].w]: { zzz: 2 } }; S.typo = { [A[1].w]: { qq: 1 } };
    S.hist['2026-01-02'] = 12; S.rspd = [['2026-01-02', 150, 60, 2]]; S.gq = { en2th: [2, 4, 1] }; S.smiss = { zebra: 3 };
    go('stats');
  });
  for (const id of ['#memNow', '#loadBox', '#spdBox', '#dirBox', '#hrdBox', '#typoBox', '#rspdBox', '#quitBox', '#moodBox', '#smBox', '#jrBox']) await expect(page.locator(id)).toBeVisible();
  await expect(page.locator('#memNow .mf-row')).toHaveCount(4);
  await expect(page.locator('#lwBox [data-wsi]')).toHaveCount(1);
  await expect(page.locator('#jrBox')).toContainText('เริ่มเรียนวันแรก');
  await page.locator('[data-lz="tree"]').scrollIntoViewIfNeeded();
  await expect(page.locator('.tree-c')).toBeVisible();
  await page.click('#moodBox [data-mood="2"]');
  await expect(page.locator('#moodBox [data-mood="2"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => S.mood[today()])).toBe(2);
  await page.click('[data-xgo="recall"]');
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'games');
  expect(errors).toEqual([]);
});
