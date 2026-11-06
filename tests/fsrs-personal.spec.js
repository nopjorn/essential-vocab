// Personal FSRS (1.153.0): flashcard reviews are logged, fsFit() finds how long this learner's memories last compared with the
// default model (K), the stats page offers it, and once used the schedule stretches / shrinks by K.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

const DAY = 864e5;
const seen = (extra = {}) => ({ b: 3, i: 7, e: 2.5, st: 7, df: 5, lr: Date.now() - 7 * DAY, d: Date.now() - DAY, s: 4, c: 4, x: 0, ...extra });

test('reviews of seen cards are logged (not new cards, same-day looks or a set), kept on reload and merged from a backup', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] }, prog: { apple: seen(), house: seen({ lr: Date.now() - 3600e3 }) } });
  const log = await page.evaluate(() => {
    const w = (x) => W.find((y) => y.w === x);
    grade(w('apple'), 2);      // 7 days since the last review: logged
    grade(w('house'), 0);      // an hour ago: not logged
    grade(w('banana'), 2);     // never seen: not logged
    grade(w('apple'), 3, {});  // a set's own table: not logged
    flushSave();
    return S.rev;
  });
  expect(log.length).toBe(1);
  expect(log[0][1]).toBeCloseTo(7, 0);
  expect(log[0][2]).toBe(7);
  expect(log[0][3]).toBe(2);
  expect((await readState(page)).rev.length).toBe(1);
  // merge: the same review once, odd rows skipped, oldest first
  const merged = await page.evaluate(() => {
    const mine = S.rev[0];
    mergeBackup({ rev: [mine, [mine[0] - 5000, 3, 2.5, 0], null, [1, 'x', 2, 2], [mine[0] - 9000, 2, 0, 2]] });
    return S.rev.map((r) => r[0]);
  });
  expect(merged.length).toBe(2);
  expect(merged[0]).toBeLessThan(merged[1]);
  // a damaged log in storage does not break start-up
  const loaded = await page.evaluate(() => { flushSave(); const d = JSON.parse(localStorage.getItem('oxford3000.v1')); d.rev = [[1, 2, 3, 9], 'x', [5, 1, 2, 1]]; localStorage.setItem('oxford3000.v1', JSON.stringify(d)); return load().rev; });
  expect(loaded).toEqual([[5, 1, 2, 1]]);
  expect(errors).toEqual([]);
});

test('fsFit finds K from simulated reviews: a learner who remembers longer gets K > 1, one who forgets sooner K < 1', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  const fits = await page.evaluate(() => {
    // reviews drawn from the FSRS curve with stability × trueK (fixed pseudo-random numbers, so the test is stable)
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const sim = (trueK, n) => Array.from({ length: n }, (_, i) => {
      const s = 1 + rnd() * 30, t = s * (0.5 + rnd() * 2);
      return [i, Math.round(t * 10) / 10, Math.round(s * 100) / 100, rnd() < fsRetr(t, s * trueK) ? 2 : 0];
    });
    return { few: fsFit(sim(1.5, 100)), longer: fsFit(sim(1.6, 1500)), sooner: fsFit(sim(0.6, 1500)), avg: fsFit(sim(1, 1500)) };
  });
  expect(fits.few).toBeNull();
  expect(fits.longer.k).toBeGreaterThan(1.35);
  expect(fits.longer.k).toBeLessThan(1.9);
  expect(fits.sooner.k).toBeGreaterThan(0.5);
  expect(fits.sooner.k).toBeLessThan(0.72);
  expect(Math.abs(fits.avg.k - 1)).toBeLessThan(0.12);
  expect(fits.longer.actual).toBeGreaterThan(fits.longer.pred); // remembered more than the default model said
  expect(errors).toEqual([]);
});

test('stats page: progress until enough reviews, then K with a button; using it stretches the gaps, the default button undoes it', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] }, ret: [[40, 38], [0, 0], [0, 0], [0, 0]], prog: { apple: seen() } });
  await page.evaluate(() => go('stats'));
  await expect(page.locator('#fskBox')).toContainText(`0/150`);
  // a learner who remembers well: every review at 1.5× the stability still remembered (9 in 10)
  await page.evaluate(() => { S.rev = Array.from({ length: 400 }, (_, i) => [i, 15, 10, i % 10 ? 2 : 0]); go('stats'); });
  await expect(page.locator('#fskBox')).toContainText('จำได้นานกว่าค่ามาตรฐาน');
  const btn = page.locator('#fskBox [data-fsk]');
  await expect(btn).toHaveCount(1);
  const k = +(await btn.getAttribute('data-fsk'));
  expect(k).toBeGreaterThan(1.2);
  const before = await page.evaluate(() => [sched(null, 3).i, sched(S.prog.apple, 2).i]);
  await btn.click();
  await expect(page.locator('#fskBox')).toContainText('ตอนนี้ใช้');
  expect(await page.evaluate(() => S.settings.fsk)).toBe(k);
  const after = await page.evaluate(() => [sched(null, 3).i, sched(S.prog.apple, 2).i]);
  expect(Math.abs(after[0] - before[0] * k)).toBeLessThanOrEqual(1); // a new card's first gap: exactly × K
  // a card already scheduled the default way stretches less this time (the review was easier than K expects), but still grows
  expect(after[1]).toBeGreaterThan(before[1]);
  // the settings page mentions it; SM-2 ignores it
  await page.evaluate(() => go('settings'));
  await expect(page.locator('#view')).toContainText('ใช้ตารางเฉพาะตัว');
  expect(await page.evaluate(() => { S.settings.scheduler = 'sm2'; const k0 = fsK(); S.settings.scheduler = 'fsrs'; return k0; })).toBe(1);
  // back to the default
  await page.evaluate(() => go('stats'));
  await page.locator('#fskBox [data-fsk="1"]').click();
  expect(await page.evaluate(() => S.settings.fsk)).toBe(1);
  expect(await page.evaluate(() => [sched(null, 3).i, sched(S.prog.apple, 2).i])).toEqual(before);
  expect(errors).toEqual([]);
});
