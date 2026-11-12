// Business set (1.195.0+): Business Service List words in their own group 'BIZ', picked in settings next to TOEIC and academic,
// kept out of the CEFR ladder (survival, tower, placement).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('business set: own group, settings chip, badge colour, stats row, not on the CEFR ladder', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const info = await page.evaluate(() => ({
    n: W.filter((w) => w.g === 'BIZ').length, label: LV_LABEL.BIZ, extra: LEVELS_EXTRA,
    cefr: W.filter((w) => w.g === 'BIZ').every((w) => ['A1', 'A2', 'B1', 'B2', 'C1'].includes(w.l)),
    ladder: LEVELS_CEFR.includes('BIZ'), tower: twPool(55).some((w) => w.g === 'BIZ'),
  }));
  expect(info.n).toBeGreaterThanOrEqual(80);
  delete info.n;
  expect(info).toEqual({ label: 'ธุรกิจ', extra: ['TOE', 'AWL', 'BIZ', 'IT', 'MED', 'POL', 'COOK', 'FEEL', 'ENV'], cefr: true, ladder: false, tower: false });

  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('details[data-g="lv"]').open = true; });
  const chip = page.locator('#lvlsX .chip[data-v="BIZ"]');
  await expect(chip).toContainText(/ธุรกิจ · \d+ คำ/);
  await chip.click();
  await page.locator('#lvls .chip[data-v="A1"]').click();
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['BIZ']);
  await expect(page.locator('.center.small.muted', { hasText: 'Business Service List' })).toBeVisible();

  await page.evaluate(() => go('cards'));
  await expect(page.locator('.fc.lvc-BIZ').first()).toBeVisible();
  await page.evaluate(() => go('stats'));
  await expect(page.locator('.lvl-row.lv-BIZ')).toHaveCount(1);
  await page.evaluate(() => go('list'));
  await expect(page.locator('.chip.lv-BIZ')).toHaveCount(1);
  expect(errors).toEqual([]);
});
