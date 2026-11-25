// Cars / driving set: car parts, fuel and electric cars, driving and road rules, parking, licences, insurance, repairs, renting and buying (1.260.0+): words in their own group 'CAR', picked in settings next to TOEIC and academic,
// kept out of the CEFR ladder (survival, tower, placement).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('cars set: own group, settings chip, badge colour, stats row, not on the CEFR ladder', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const info = await page.evaluate(() => ({
    n: W.filter((w) => w.g === 'CAR').length, label: LV_LABEL.CAR, extra: LEVELS_EXTRA,
    cefr: W.filter((w) => w.g === 'CAR').every((w) => ['A1', 'A2', 'B1', 'B2', 'C1'].includes(w.l)),
    ladder: LEVELS_CEFR.includes('CAR'), tower: twPool(55).some((w) => w.g === 'CAR'),
  }));
  expect(info.n).toBeGreaterThanOrEqual(200);
  delete info.n;
  expect(info).toEqual({ label: 'รถยนต์/ขับรถ', extra: ['TOE', 'AWL', 'BIZ', 'IT', 'MED', 'POL', 'COOK', 'FEEL', 'ENV', 'SOC', 'FIT', 'FAM', 'PET', 'STY', 'SPC', 'ENT', 'CRM', 'CAR', 'HOME'], cefr: true, ladder: false, tower: false });

  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('details[data-g="lv"]').open = true; });
  const chip = page.locator('#lvlsX .chip[data-v="CAR"]');
  await expect(chip).toContainText('รถยนต์/ขับรถ · 265 คำ');
  await chip.click();
  await page.locator('#lvls .chip[data-v="A1"]').click();
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['CAR']);

  await page.evaluate(() => go('cards'));
  await expect(page.locator('.fc.lvc-CAR').first()).toBeVisible();
  await page.evaluate(() => go('stats'));
  await expect(page.locator('.lvl-row.lv-CAR')).toHaveCount(1);
  await page.evaluate(() => go('list'));
  await expect(page.locator('.chip.lv-CAR')).toHaveCount(1);
  expect(errors).toEqual([]);
});
