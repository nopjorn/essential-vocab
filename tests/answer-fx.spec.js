// Combo and fast-answer badges (1.168.0): 🔥 at 3, 5, 10 …, ⚡ for a right answer within 2 s on one-tap kinds, each right answer
// in a row plays a step higher; settings.comboFx = false turns it all off.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

async function setup(page, settings = {}) {
  await page.clock.install();
  const errors = await openApp(page, { placedAt: '2026-01-01', seenVer: '9.9.9', settings: { levels: ['A1'], ...settings } });
  await page.evaluate(() => { window.__sfx = []; const real = sfx; window.sfx = (k, up) => { window.__sfx.push([k, up || 0]); return real(k, up); }; gameSource = 'level'; startGame('en2th'); });
  await page.locator('.opt').first().waitFor();
  return errors;
}
const answer = async (page, ok, wait = 0) => {
  await page.locator('.opt:not([disabled])').first().waitFor();
  if (wait) await page.clock.fastForward(wait);
  await page.evaluate((ok) => { const right = document.querySelector(`.opt[data-i="${playQuiz.cur.idx}"]`); (ok ? right : [...document.querySelectorAll('.opt')].find((o) => o !== right)).click(); }, ok);
  const last = await page.evaluate(() => answerFx.last);
  const next = page.locator('#nextQ'); if (await next.count()) await next.click();
  return last;
};

test('combo badges at 3 and 5, ⚡ for quick right answers, the pitch climbs with the combo and resets on a miss', async ({ page }) => {
  const errors = await setup(page);
  const seen = [];
  for (let k = 0; k < 5; k++) seen.push(await answer(page, true));
  expect(seen[0]).toEqual(['⚡ เร็วมาก!']);
  expect(seen[2]).toEqual(['🔥 x3 ติดไฟ!', '⚡ เร็วมาก!']);
  expect(seen[3]).toEqual(['⚡ เร็วมาก!']);
  expect(seen[4][0]).toBe('🔥 x5 ร้อนแรง!');
  expect(await page.evaluate(() => S.counts.fast)).toBe(5);
  // a slow right answer: no ⚡
  expect(await answer(page, true, 2500)).toEqual([]);
  await answer(page, false);
  await answer(page, true);
  const ok = await page.evaluate(() => window.__sfx.filter(([k]) => k === 'ok').map(([, up]) => up));
  expect(ok).toEqual([0, 1, 2, 3, 4, 5, 0]); // the step is the combo before the answer; a miss starts again
  expect(errors).toEqual([]);
});

test('the badge shows over the game for a moment, then goes', async ({ page }) => {
  let errors = await setup(page);
  for (let k = 0; k < 2; k++) await answer(page, true);
  await page.locator('.opt:not([disabled])').first().waitFor();
  await page.evaluate(() => document.querySelector(`.opt[data-i="${playQuiz.cur.idx}"]`).click());
  await expect(page.locator('.ans-fx .c')).toHaveText('🔥 x3 ติดไฟ!');
  await page.clock.fastForward(1200);
  await expect(page.locator('.ans-fx')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('comboFx off: no badges, flat pitch', async ({ page }) => {
  const errors = await setup(page, { comboFx: false });
  for (let k = 0; k < 3; k++) await answer(page, true);
  await expect(page.locator('.ans-fx')).toHaveCount(0);
  expect(await page.evaluate(() => window.__sfx.filter(([k]) => k === 'ok').map(([, up]) => up))).toEqual([0, 0, 0]);
  // the switch lives in settings → effects
  await page.evaluate(() => go('settings'));
  await expect(page.locator('#comboFx')).not.toBeChecked();
  expect(errors).toEqual([]);
});
