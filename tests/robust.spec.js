// Robustness of the stored state (1.151.1): odd backup / cloud rows must not break a merge halfway, and story scores
// from before 1.151.0 (3 questions a story) must not beat or block a score on today's longer quiz.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('merge: null / odd entries in a backup are skipped, the rest of the merge still happens', async ({ page }) => {
  const errors = await openApp(page, {
    mtest: { '2026-10': { r: 20, n: 30, at: 1 } }, ltest: { A1: { r: 6, n: 8, at: 1 } },
    readScore: { a1_01: [2, 5] }, snap: { '2026-10-01': [1, 2, 3, 4] }, hist: { '2026-10-01': 5 },
  });
  const out = await page.evaluate(() => {
    let err = '';
    try {
      mergeBackup({
        prog: { apple: { b: 2, i: 3, e: 2.5, d: Date.now(), s: 2, c: 2, x: 0 }, banana: { b: NaN }, cat: { b: 1, s: 1, c: 1, x: 0 } },
        mtest: { '2026-10': null, '2026-09': { r: 'x' } }, ltest: { A1: null, A2: { r: 3, n: 0 } },
        readScore: { a1_01: null, a1_02: 'bad', a1_03: [4, 5] }, snap: { '2026-10-01': null, '2026-10-02': [5, 6, 7, 8] },
        hist: { '2026-10-01': 'lots', '2026-10-02': 7 }, chist: { '2026-10-02': null }, best: { en2th: '9x' },
        xp: 100, star: { apple: 1 },
      });
    } catch (e) { err = String(e); }
    flushSave();
    return { err, S: JSON.parse(localStorage.getItem('oxford3000.v1')) };
  });
  expect(out.err).toBe('');
  const s = out.S;
  expect(s.prog.apple.b).toBe(2);
  expect(s.prog.banana).toBeUndefined(); // b is not a real number
  expect(typeof s.prog.cat.d).toBe('number'); // a card without a due time gets one (else it is never due again)
  expect(s.mtest['2026-10']).toEqual({ r: 20, n: 30, at: 1 });
  expect(s.mtest['2026-09']).toBeUndefined();
  expect(s.ltest.A1).toEqual({ r: 6, n: 8, at: 1 });
  expect(s.ltest.A2).toBeUndefined();
  expect(s.readScore.a1_01).toEqual([2, 5]);
  expect(s.readScore.a1_02).toBeUndefined();
  expect(s.readScore.a1_03).toEqual([4, 5]);
  expect(s.snap['2026-10-01']).toEqual([1, 2, 3, 4]);
  expect(s.snap['2026-10-02']).toEqual([5, 6, 7, 8]);
  expect(s.hist['2026-10-01']).toBe(5);
  expect(s.hist['2026-10-02']).toBe(7);
  expect(s.chist['2026-10-02']).toBeUndefined();
  expect(s.xp).toBeGreaterThanOrEqual(100);
  expect(s.star.apple).toBe(1);
  expect(errors).toEqual([]);
});

test('story scores: a score on the longer quiz replaces an old 3-question one, merges prefer the longer quiz', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => [
    storyBetter([3, 3], [4, 5]), // old full marks on 3 questions vs today's 5-question quiz: the new quiz counts
    storyBetter([4, 5], [3, 3]), // an old-version copy from another device must not undo it
    storyBetter([4, 5], [3, 5]), storyBetter([3, 5], [4, 5]), storyBetter(null, [1, 5]),
  ]);
  expect(r).toEqual([true, false, false, true, true]);
  await page.evaluate(() => { S.readScore = { a1_01: [4, 5] }; mergeBackup({ prog: {}, readScore: { a1_01: [3, 3] } }); });
  expect(await page.evaluate(() => S.readScore.a1_01)).toEqual([4, 5]);
  expect(errors).toEqual([]);
});

test('games (1.152.0): a due card answered right counts as a "hard" review, a just-missed or not-yet-due card does not move', async ({ page }) => {
  const DAY = 864e5, now = Date.now();
  const errors = await openApp(page, { prog: {
    apple: { b: 3, i: 7, e: 2.5, d: now - DAY, s: 4, c: 4, x: 0 },     // due
    house: { b: 3, i: 7, e: 2.5, d: now + 3 * DAY, s: 4, c: 4, x: 0 }, // not due yet
    water: { b: 0, i: 0, e: 2.3, d: now - 1000, s: 3, c: 2, x: 1 },     // just missed
  } });
  const r = await page.evaluate(() => {
    const w = (x) => W.find((y) => y.w === x), before = S.daily.reviews;
    ['apple', 'house', 'water'].forEach((x) => gameResult(w(x), true));
    return { reviews: S.daily.reviews - before, apple: S.prog.apple, house: S.prog.house, water: S.prog.water, due: dueList().map((x) => x.w) };
  });
  expect(r.reviews).toBe(1);
  expect(r.apple.i).toBeGreaterThanOrEqual(7);
  expect(r.apple.d).toBeGreaterThan(now + 6 * DAY);
  expect([r.apple.s, r.apple.c]).toEqual([5, 5]);
  expect(r.house.i).toBe(7);
  expect(r.house.c).toBe(5);
  expect(r.water.i).toBe(0);
  expect(r.due).toEqual(['water']);
  expect(errors).toEqual([]);
});
