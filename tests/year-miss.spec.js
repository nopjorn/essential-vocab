// Year in review, most forgotten word (1.155.2): wrong answers are also tallied per year (missY, per device). A year counts only
// when it was logged from 1 January; before that the slide shows the all-time count and says so.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const DAY = 864e5;
const card = (x) => ({ b: 1, i: 1, e: 2.5, d: Date.now() + DAY, s: 9, c: 3, x });

test('wrong answers are tallied per year; the slide uses the year once it was logged in full, else all-time with a note', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', hist: { '2026-03-01': 5 }, prog: { apple: card(9), house: card(2) } });
  const y = await page.evaluate(() => {
    const w = (x) => W.find((v) => v.w === x);
    gameResult(w('house'), false); gameResult(w('house'), false); grade(w('house'), 0); grade(w('apple'), 0);
    return { yr: today().slice(0, 4), missY: S.missY, from: S.missYFrom, dev: DEV };
  });
  expect(y.missY[y.yr][y.dev]).toEqual({ house: 3, apple: 1 });
  expect(y.from).toBe(await page.evaluate(() => today()));
  // started this year: all-time counts (apple 9+1 = 10), labelled as such
  let s = await page.evaluate((yr) => { const st = yearStats(+yr); return { top: st.top.map(([w, p]) => [w, p.x]), all: st.topAll, line: yearSlides(st).find((x) => x.e === '🐢').line }; }, y.yr);
  expect(s.top[0]).toEqual(['apple', 10]);
  expect(s.all).toBe(true);
  expect(s.line).toContain('นับตั้งแต่เริ่มเรียน');
  // logged since before 1 January: the year's own tally (house 3 beats apple 1), summed over devices
  s = await page.evaluate((yr) => {
    S.missYFrom = (+yr - 1) + '-12-01';
    S.missY[yr].otherDevice = { apple: 1 };
    const st = yearStats(+yr);
    return { top: st.top.map(([w, p]) => [w, p.x]), all: st.topAll, line: yearSlides(st).find((x) => x.e === '🐢').line };
  }, y.yr);
  expect(s.top).toEqual([['house', 3], ['apple', 2]]);
  expect(s.all).toBe(false);
  expect(s.line).toContain('ในปีนี้ (3 ครั้ง)');
  // merge: per device the larger count, never added twice; the earlier start date wins; odd values are skipped; old years pruned
  const m = await page.evaluate((yr) => {
    mergeBackup({ missY: { [yr]: { otherDevice: { apple: 4, bad: 'x' }, [DEV]: { house: 1 } }, '1999': { x: { a: 1 } }, nope: 1 }, missYFrom: '2020-05-05' });
    const after = JSON.parse(JSON.stringify(S.missY));
    grade(W.find((v) => v.w === 'house'), 0); // a new wrong answer prunes years before last
    return { after, pruned: Object.keys(S.missY), from: S.missYFrom };
  }, y.yr);
  expect(m.after[y.yr].otherDevice).toEqual({ apple: 4 });
  expect(m.after[y.yr][y.dev].house).toBe(3);
  expect(m.pruned).toEqual([y.yr]);
  expect(m.from).toBe('2020-05-05');
  // damaged data in storage is cleaned on load
  expect(await page.evaluate(() => cleanMissY({ 2026: { a: { w: 2, z: -1 }, b: [] }, x: {} }))).toEqual({ 2026: { a: { w: 2 } } });
  expect(errors).toEqual([]);
});
