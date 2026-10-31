// 1.114: weekly adventure - theme rotation, stops, stamps, completion rewards, catch-up, sync merge, home card.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

const base = { placedAt: '2026-01-01', settings: { levels: ['A1', 'A2'] } };

test('adventure: theme rotates through the goal tags, stops open by weekday, theme is the same for the whole week', async ({ page }) => {
  const errors = await openApp(page, base);
  const r = await page.evaluate(() => {
    const m = '2026-11-02', n = '2026-11-09', ids = new Set();
    for (let k = 0; k < TAGS.length; k++) ids.add(advTheme(new Date(Date.parse(m + 'T12:00:00') + k * 7 * DAY).toISOString().slice(0, 10)).id);
    return { same: advTheme(m).id === advTheme(m).id, next: advTheme(m).id !== advTheme(n).id, all: ids.size === TAGS.length, pool: TAGS.every((t) => advPool(t).length >= 12), pick: TAGS.every((t) => advPick(t).length === 5) };
  });
  expect(r).toEqual({ same: true, next: true, all: true, pool: true, pick: true });
  expect(errors).toEqual([]);
});

test('adventure: stop quiz gives a stamp on a pass, none on a fail; 5 stamps complete it once with rewards', async ({ page }) => {
  const errors = await openApp(page, base);
  await page.evaluate(() => { window.advToday = () => 6; go('adv'); }); // pretend it is Sunday: every stop is open
  await expect(page.locator('.adv-stop:not([disabled])')).toHaveCount(7);
  const answerStop = async (good) => {
    for (let i = 0; i < 5; i++) {
      await expect(page.locator('.q-prompt')).toBeVisible();
      const idx = await page.evaluate((good) => {
        const tag = advTheme(advMonday()), prompt = document.querySelector('.q-prompt .word, .q-prompt .th').textContent;
        const w = W.find((x) => (x.w === prompt || x.t === prompt) && hasTag(x, tag.id));
        const opts = [...document.querySelectorAll('.opt')];
        return opts.findIndex((o) => ((o.textContent === w.t || o.textContent === w.w)) === good);
      }, good);
      await page.locator('.opt').nth(idx).click();
      await page.waitForTimeout(good ? 700 : 1500);
    }
  };
  // a failed stop: no stamp
  await page.locator('[data-stop="0"]').click();
  await answerStop(false);
  await expect(page.locator('#advAgain')).toBeVisible();
  expect(await page.evaluate(() => advStamps(advMonday()))).toBe(0);
  // five passes
  for (let k = 0; k < 5; k++) {
    await page.evaluate((k) => runAdvStop(advMonday(), k), k);
    await answerStop(true);
  }
  const st = await page.evaluate(() => ({ n: advStamps(advMonday()), done: S.adv[advMonday()].done, owned: S.owned, xp: S.xp, freeze: S.freeze }));
  expect(st.n).toBe(5); expect(st.done).toBe(true); expect(st.owned).toContain('acc:explorer'); expect(st.freeze).toBeGreaterThanOrEqual(1);
  expect(st.xp).toBeGreaterThanOrEqual(5 * 8 + 60);
  // replaying a stamped stop gives nothing more
  const xp0 = await page.evaluate(() => S.xp);
  await page.evaluate(() => runAdvStop(advMonday(), 0));
  await answerStop(true);
  expect((await page.evaluate(() => S.xp)) - xp0).toBeLessThan(40); // only the usual answer XP, no stamp / completion bonus
  expect(await page.evaluate(() => advDoneCount())).toBe(1);
  expect(await page.evaluate(() => S.ach.adv1 !== undefined || ACH.some((a) => a.id === 'adv1' && a.ok({ advs: 1 })))).toBe(true);
  expect(errors).toEqual([]);
});

test('adventure: home card, locked future stops, passport history, sync merge only adds stamps, bad data is cleaned', async ({ page }) => {
  const mon = '2026-10-19'; // a past week (the app's clock decides which week is current)
  const errors = await openApp(page, { ...base, adv: { [mon]: { t: 'travel', s: '1111100', done: true, perfect: false }, junk: 5, '2026-10-12': { s: 'xx' } } });
  await page.evaluate(() => go('home'));
  await expect(page.locator('.adv-card')).toContainText('ผจญภัยประจำสัปดาห์');
  expect(await page.evaluate(() => Object.keys(S.adv))).toEqual([mon]); // junk entries dropped
  await page.evaluate(() => { window.advToday = () => 1; go('adv'); });
  await expect(page.locator('.adv-stop:not([disabled])')).toHaveCount(2); // Monday + Tuesday open, the rest locked
  await expect(page.locator('.adv-past')).toHaveCount(1);
  await expect(page.locator('.adv-past')).toContainText('5/7');
  const merged = await page.evaluate((mon) => { mergeAdv({ [mon]: { t: 'travel', s: '0000011', done: false, perfect: false }, '2026-11-02': { t: 'work', s: '1000000', done: false, perfect: false } }); return [S.adv[mon].s, S.adv[mon].done, Object.keys(S.adv).length]; }, mon);
  expect(merged).toEqual(['1111111', true, 2]);
  // the mascot items show their unlock hint
  await page.evaluate(() => go('mascot'));
  await expect(page.locator('#view')).toContainText('ผจญภัยสำเร็จ 5 สัปดาห์');
  expect(await page.evaluate(() => ['explorer'].every((h) => mascotSvg({ equip: { head: h } }).length > mascotSvg({}).length + 100) && mascotSvg({ equip: { body: 'compass' } }).length > mascotSvg({}).length + 100)).toBe(true);
  expect(errors).toEqual([]);
});
