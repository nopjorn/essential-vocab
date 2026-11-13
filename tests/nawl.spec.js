// Academic set (1.180.0+): New Academic Word List words in their own group 'AWL', picked in settings next to TOEIC,
// kept out of the CEFR ladder (survival, tower, placement).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('academic set: own group, settings chip, badge colour, stats row, not on the CEFR ladder', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const info = await page.evaluate(() => ({
    n: W.filter((w) => w.g === 'AWL').length, label: LV_LABEL.AWL, extra: LEVELS_EXTRA,
    cefr: W.filter((w) => w.g === 'AWL').every((w) => ['A1', 'A2', 'B1', 'B2', 'C1'].includes(w.l)),
    ladder: LEVELS_CEFR.includes('AWL'), tower: twPool(55).some((w) => w.g === 'AWL'),
  }));
  expect(info.n).toBeGreaterThanOrEqual(80);
  delete info.n;
  expect(info).toEqual({ label: 'วิชาการ', extra: ['TOE', 'AWL', 'BIZ', 'IT', 'MED', 'POL', 'COOK', 'FEEL', 'ENV', 'SOC', 'FIT', 'FAM', 'PET', 'STY', 'SPC'], cefr: true, ladder: false, tower: false });

  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('details[data-g="lv"]').open = true; });
  const chip = page.locator('#lvlsX .chip[data-v="AWL"]');
  await expect(chip).toContainText(/วิชาการ · \d+ คำ/);
  await chip.click();
  await page.locator('#lvls .chip[data-v="A1"]').click();
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['AWL']);
  await expect(page.locator('.center.small.muted', { hasText: 'New Academic Word List' })).toBeVisible();

  await page.evaluate(() => go('cards'));
  await expect(page.locator('.fc.lvc-AWL').first()).toBeVisible();
  await page.evaluate(() => go('stats'));
  await expect(page.locator('.lvl-row.lv-AWL')).toHaveCount(1);
  await page.evaluate(() => go('list'));
  await expect(page.locator('.chip.lv-AWL')).toHaveCount(1);
  expect(errors).toEqual([]);
});
