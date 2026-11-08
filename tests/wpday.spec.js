// Work phrase of the day on home (1.203.0): one phrase per day, › next, 🔊, ดูทั้งหมด → the phrase page; can be hidden like any block.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('home card: phrase of the day, next, speak, open the page', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => go('home'));
  const card = page.locator('#wpDay');
  await expect(card).toContainText('สำนวนทำงานประจำวัน');
  const first = await card.locator('.wp-day').textContent();
  expect(await page.evaluate(() => wpDayRow().plain)).toBe(first.replace('🔊', '').trim());
  await card.locator('[data-wps]').click();
  await expect.poll(() => page.evaluate(() => window.__said.at(-1))).toBe(first.replace('🔊', '').trim());
  await card.locator('[data-wpn]').click();
  await expect(card.locator('.wp-day')).not.toHaveText(first);
  await card.locator('[data-wpall]').click();
  await expect(page.locator('#wpList')).toBeVisible();
  // the same phrase all day: a new visit starts from today's phrase again only after reload; the day pick is stable
  expect(await page.evaluate(() => { wpDayOff = 0; const a = wpDayRow(); return a === wpDayRow(); })).toBe(true);
  expect(errors).toEqual([]);
});

test('home card can be switched off', async ({ page }) => {
  const errors = await openApp(page, { homeCfg: [{ id: 'wpday', on: false, w: 'full' }] });
  await page.evaluate(() => go('home'));
  await expect(page.locator('#qPlay, .hero').first()).toBeVisible();
  await expect(page.locator('#wpDay')).toHaveCount(0);
  expect(errors).toEqual([]);
});
