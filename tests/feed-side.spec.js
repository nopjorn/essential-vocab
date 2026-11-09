// 1.217.0: ไถศัพท์ on the iPad in landscape shows this round's numbers in a panel beside the cards (hidden on phones).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('feed side panel: right / wrong / total / % / time, missed words open the word sheet; hidden on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 1210, height: 834 });
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  await page.evaluate(() => go('feed'));
  const side = page.locator('#fSide');
  await expect(side).toBeVisible();
  await expect(side).toContainText('ข้อทั้งหมด');
  // 11" landscape: no room for prompt | answers beside the panel, so the answers sit under the prompt
  const below = await page.evaluate(() => { const b = [...document.querySelectorAll('.f-body')].find((x) => x.querySelector(':scope > .options')); return b.querySelector(':scope > .options').getBoundingClientRect().top > b.querySelector(':scope > .f-tag').getBoundingClientRect().bottom; });
  expect(below).toBe(true);
  // answer quiz cards with their first option until at least one was wrong (a 2- or 4-option card: wrong ≥ half the time)
  for (let t = 0; t < 12; t++) {
    const k = await page.evaluate(() => [...document.querySelectorAll('.fcard')].findIndex((c) => c.querySelector('[data-o]') && !c.matches('.ok, .bad')));
    const card = page.locator('.fcard').nth(k);
    await card.scrollIntoViewIfNeeded();
    await card.locator('[data-o]').first().click();
    await expect(card).toHaveClass(/\b(ok|bad)\b/);
    if (t >= 1 && await page.locator('.fcard.bad').count()) break;
  }
  const [ok, bad, all] = (await side.locator('.ss-grid').first().locator('b').allTextContents()).map(Number);
  expect(bad).toBe(await page.locator('.fcard.bad').count());
  expect(ok).toBe(await page.locator('.fcard.ok').count());
  expect(all).toBe(ok + bad);
  expect(bad).toBeGreaterThan(0);
  await expect(side.locator('.ss-big b')).toHaveText(`${Math.round(ok / all * 100)}%`);
  await expect(side.locator('.fs-dots i')).toHaveCount(all);
  await expect(side.locator('.fs-dots i.bad')).toHaveCount(bad);
  if (await side.locator('[data-fsw]').count()) { // a missed list word (special cards are not listed)
    await side.locator('[data-fsw]').first().click();
    await expect(page.locator('.sheet-word')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await expect(side.locator('#fsClock')).toHaveText(/^\d+:\d\d$/);
  await page.setViewportSize({ width: 440, height: 956 });
  await expect(side).toBeHidden();
  expect(errors).toEqual([]);
});

test('1.218.0 feed panel side: swap button moves it left and back, the setting can switch it off', async ({ page }) => {
  await page.setViewportSize({ width: 1376, height: 1032 });
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  await page.evaluate(() => go('feed'));
  const side = page.locator('#fSide'), x = async (sel) => (await page.locator(sel).boundingBox()).x;
  expect(await x('#fSide')).toBeGreaterThan(await x('#feed'));
  await side.locator('[data-fsswap]').click();
  await expect(side).toHaveClass(/fs-left/);
  expect(await x('#fSide')).toBeLessThan(await x('#feed'));
  expect(await page.evaluate(() => S.settings.feedSide)).toBe('left');
  await page.evaluate(() => go('feed')); // remembered
  await expect(page.locator('#fSide')).toHaveClass(/fs-left/);
  await side.locator('[data-fsswap]').click();
  expect(await page.evaluate(() => S.settings.feedSide)).toBe('right');
  await page.evaluate(() => { go('settings'); document.querySelector('#feedSide').closest('details').open = true; });
  await page.locator('#feedSide').selectOption('off');
  await page.evaluate(() => go('feed'));
  await expect(page.locator('.fcard').first()).toBeVisible();
  await expect(page.locator('#fSide')).toHaveCount(0);
  expect(errors).toEqual([]);
});
