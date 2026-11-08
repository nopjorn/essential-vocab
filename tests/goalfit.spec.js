// Suggestions for my goal on home (1.209.0): sets not added yet + games for settings.goal and a TOEIC exam date.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('no goal → no card', async ({ page }) => {
  const errors = await openApp(page, { settings: { goal: '' } });
  await page.evaluate(() => { S.settings.goal = ''; go('home'); });
  await expect(page.locator('.hero')).toBeVisible();
  await expect(page.locator('#goalFit')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('work goal + TOEIC exam: sets open the preview and disappear once added, games start and get ✓', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { S.settings.goal = 'work'; S.settings.exam = { date: '2099-01-01', name: 'TOEIC' }; go('home'); });
  const card = page.locator('#goalFit');
  await expect(card).toContainText('สอบ TOEIC');
  await expect(card).toContainText('ทำงาน');
  await expect(card.locator('[data-gfp="meeting"]')).toBeVisible();
  await expect(card.locator('[data-gfg="toeicMock"]')).toBeVisible();
  await expect(card.locator('[data-gfg="email"]')).toBeVisible();
  await card.locator('[data-gfp="meeting"]').click();
  await page.locator('.sheet-wrap.open #preAdd').click();
  await expect(page.locator('#dkStudy')).toBeVisible();
  await page.evaluate(() => go('home'));
  await expect(page.locator('#goalFit [data-gfg="email"]')).toBeVisible();
  await expect(page.locator('#goalFit [data-gfp="meeting"]')).toHaveCount(0);
  await page.locator('#goalFit [data-gfg="bizcol"]').click();
  await expect(page.locator('.options .opt')).toHaveCount(4);
  await page.evaluate(() => go('home'));
  await expect(page.locator('#goalFit [data-gfg="bizcol"]')).toContainText('✓');
  expect(errors).toEqual([]);
});
