const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

// Mascot, unlockable items and the daily box (kept in its own file so parallel work on features.spec.js doesn't conflict).
test('mascot + unlockables (1.67): levels unlock items, wardrobe, palette/frame lock, daily box once', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'], newPerDay: 1 }, placedAt: '2026-01-01' });
  await page.evaluate(() => go('home'));
  await expect(page.locator('.mascot-card svg.mascot')).toBeVisible();
  // locked at Lv.1
  const r = await page.evaluate(() => ({ cap: itemOpen('acc:cap'), gold: paletteOpen('gold'), lv: levelOf(S.xp) }));
  expect(r.cap).toBe(false); expect(r.gold).toBe(false);
  await page.evaluate(() => { S.settings.palette = 'gold'; applyTheme(); });
  expect(await page.evaluate(() => document.documentElement.dataset.palette)).toBeUndefined(); // locked → falls back to violet
  // level 10 opens cap, frame, glasses, gold palette
  await page.evaluate(() => { S.xp = levelStart(10); S.settings.palette = 'gold'; applyTheme(); go('mascot'); });
  expect(await page.evaluate(() => document.documentElement.dataset.palette)).toBe('gold');
  await page.locator('[data-eq="head:cap"]').click();
  await page.locator('[data-eq="face:glasses"]').click();
  expect(await page.evaluate(() => JSON.stringify(S.mascot.equip))).toBe('{"head":"cap","face":"glasses","body":""}');
  await expect(page.locator('[data-eq="body:cape"]')).toBeDisabled();
  await page.locator('[data-frame="gold"]').click();
  await page.evaluate(() => { const w = W.filter((x) => x.g === 'A1'); S.daily.fresh = 0; go('cards'); });
  await expect(page.locator('#fc.gold')).toBeVisible();
  // daily box: only when the goal is closed, once a day, gives something
  await page.evaluate(() => { S.settings.frame = ''; S.daily = { date: today(), fresh: 1, reviews: 2 }; go('home'); });
  await expect(page.locator('#boxOpen')).toBeVisible();
  await page.locator('#boxOpen').click();
  await expect(page.locator('.mascot-card')).toContainText('วันนี้ได้');
  expect(await page.evaluate(() => boxReady())).toBe(false);
  // moods
  const moods = await page.evaluate(() => { const t = (n) => new Date(Date.now() - n * DAY).toLocaleDateString('en-CA'); S.daily = { date: today(), fresh: 0, reviews: 0 }; S.hist = { [t(5)]: 3 }; S.streak = { last: t(5), count: 1 }; const a = mascotMood(); S.hist = { [t(1)]: 3 }; S.streak = { last: t(1), count: 1 }; return [a, mascotMood()]; });
  expect(moods).toEqual(['sleepy', 'miss']);
  // every mood x stage renders without error
  expect(await page.evaluate(() => ['happy', 'normal', 'miss', 'sleepy'].every((m) => [0, 1, 2, 3].every((s) => mascotSvg({ mood: m, stage: s, equip: { head: 'crown', face: 'glasses', body: 'cape' } }).includes('<svg'))))).toBe(true);
  expect(errors).toEqual([]);
});
