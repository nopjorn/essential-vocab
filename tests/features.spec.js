// Features added in 1.32+: slow speech, shadowing, phrasal verbs, synonyms, word parts, year heatmap, monthly test, export, a11y.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('slow speech: 🔊 twice plays slower, 🐢 buttons, setting turns repeat-slow off', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'], rate: 0.9 } });
  await page.evaluate(() => { speak('apple'); speak('apple'); speak('apple'); speak('pear'); });
  let rates = await page.evaluate(() => window.__rates);
  expect(rates[0]).toBe(0.9); expect(rates[1]).toBeLessThan(0.7); expect(rates[2]).toBe(0.9); expect(rates[3]).toBe(0.9);
  // 🐢 button in the listening game
  await page.evaluate(() => go('games'));
  await page.locator('[data-game="listen"]').click();
  await page.locator('.slow-btn').click();
  rates = await page.evaluate(() => window.__rates);
  expect(rates[rates.length - 1]).toBeLessThan(0.7);
  // setting off → repeats stay at normal speed
  await page.evaluate(() => { S.settings.slowRepeat = false; window.__rates = []; speak('dog'); speak('dog'); });
  expect(await page.evaluate(() => window.__rates)).toEqual([0.9, 0.9]);
  await page.evaluate(() => go('settings'));
  await expect(page.locator('#slowRep')).not.toBeChecked();
  expect(errors).toEqual([]);
});

test('story reader: slow toggle and shadowing mode (play, next, prev, hide, back)', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  await page.evaluate(() => loadStories().then(() => go('read', STORIES[0].id)));
  await expect(page.locator('#rShadow')).toBeVisible();
  await page.locator('#rSlow').click();
  await expect(page.locator('#rSlow')).toHaveClass(/on/);
  await page.locator('#rShadow').click();
  await expect(page.locator('#shN')).toContainText('ประโยค 1/');
  await expect(page.locator('#shSlow')).toHaveClass(/on/);
  await page.locator('#shPlay').click();
  await expect(page.locator('#shState')).toContainText('ตาคุณ');
  const first = await page.locator('#shEn').textContent();
  expect(await page.evaluate(() => window.__said)).toContain(first);
  await expect(page.locator('#shN')).toContainText('ประโยค 2/', { timeout: 8000 }); // auto-advances after the pause
  await page.locator('#shPrev').click();
  await expect(page.locator('#shN')).toContainText('ประโยค 1/');
  await page.locator('#shNext').click();
  await expect(page.locator('#shN')).toContainText('ประโยค 2/');
  await page.locator('#shHide').click();
  await expect(page.locator('#shEn')).toHaveClass(/hid/);
  await page.locator('#shThBtn').click();
  await expect(page.locator('#shTh')).toBeVisible();
  await page.locator('#topBack').click();
  await expect(page.locator('#rShadow')).toBeVisible();
  // shadowing again, jump to the last sentence and let it finish
  await page.locator('#rShadow').click();
  const n = await page.evaluate(() => storySentences(STORIES[0]).length);
  for (let k = 1; k < n; k++) await page.locator('#shNext').click();
  await page.locator('#shPlay').click();
  await expect(page.locator('#shState')).toContainText('ครบทั้งเรื่อง', { timeout: 8000 });
  expect(errors).toEqual([]);
});
