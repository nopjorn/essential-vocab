// Space / astronomy set: night sky, solar system, stars and galaxies, telescopes, rockets and space missions (1.247.0+): words in their own group 'SPC', picked in settings next to TOEIC and academic,
// kept out of the CEFR ladder (survival, tower, placement).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('space set: own group, settings chip, badge colour, stats row, not on the CEFR ladder', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const info = await page.evaluate(() => ({
    n: W.filter((w) => w.g === 'SPC').length, label: LV_LABEL.SPC, extra: LEVELS_EXTRA,
    cefr: W.filter((w) => w.g === 'SPC').every((w) => ['A1', 'A2', 'B1', 'B2', 'C1'].includes(w.l)),
    ladder: LEVELS_CEFR.includes('SPC'), tower: twPool(55).some((w) => w.g === 'SPC'),
  }));
  expect(info.n).toBeGreaterThanOrEqual(200);
  delete info.n;
  expect(info).toEqual({ label: 'อวกาศ/ดาราศาสตร์', extra: ['TOE', 'AWL', 'BIZ', 'IT', 'MED', 'POL', 'COOK', 'FEEL', 'ENV', 'SOC', 'FIT', 'FAM', 'PET', 'STY', 'SPC'], cefr: true, ladder: false, tower: false });

  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('details[data-g="lv"]').open = true; });
  const chip = page.locator('#lvlsX .chip[data-v="STY"]');
  await expect(chip).toContainText(/อวกาศ\/ดาราศาสตร์ · \d+ คำ/);
  await chip.click();
  await page.locator('#lvls .chip[data-v="A1"]').click();
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['SPC']);

  await page.evaluate(() => go('cards'));
  await expect(page.locator('.fc.lvc-SPC').first()).toBeVisible();
  await page.evaluate(() => go('stats'));
  await expect(page.locator('.lvl-row.lv-SPC')).toHaveCount(1);
  await page.evaluate(() => go('list'));
  await expect(page.locator('.chip.lv-SPC')).toHaveCount(1);
  expect(errors).toEqual([]);
});
