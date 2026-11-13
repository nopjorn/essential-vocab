// Pets set (1.244.0+): dog, cat, fish, bird and small-pet care words in their own group 'PET', picked in settings next to TOEIC and academic,
// kept out of the CEFR ladder (survival, tower, placement).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('pets set: own group, settings chip, badge colour, stats row, not on the CEFR ladder', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const info = await page.evaluate(() => ({
    n: W.filter((w) => w.g === 'PET').length, label: LV_LABEL.PET, extra: LEVELS_EXTRA,
    cefr: W.filter((w) => w.g === 'PET').every((w) => ['A1', 'A2', 'B1', 'B2', 'C1'].includes(w.l)),
    ladder: LEVELS_CEFR.includes('PET'), tower: twPool(55).some((w) => w.g === 'PET'),
  }));
  expect(info.n).toBeGreaterThanOrEqual(150);
  delete info.n;
  expect(info).toEqual({ label: 'สัตว์เลี้ยง', extra: ['TOE', 'AWL', 'BIZ', 'IT', 'MED', 'POL', 'COOK', 'FEEL', 'ENV', 'SOC', 'FIT', 'FAM', 'PET', 'STY', 'SPC', 'ENT', 'CRM'], cefr: true, ladder: false, tower: false });

  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('details[data-g="lv"]').open = true; });
  const chip = page.locator('#lvlsX .chip[data-v="PET"]');
  await expect(chip).toContainText(/สัตว์เลี้ยง · \d+ คำ/);
  await chip.click();
  await page.locator('#lvls .chip[data-v="A1"]').click();
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['PET']);

  await page.evaluate(() => go('cards'));
  await expect(page.locator('.fc.lvc-PET').first()).toBeVisible();
  await page.evaluate(() => go('stats'));
  await expect(page.locator('.lvl-row.lv-PET')).toHaveCount(1);
  await page.evaluate(() => go('list'));
  await expect(page.locator('.chip.lv-PET')).toHaveCount(1);
  expect(errors).toEqual([]);
});
