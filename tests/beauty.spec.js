// Beauty / fashion set (1.245.0+): skincare, makeup, hair, nails, clothes and tailoring words in their own group 'STY', picked in settings next to TOEIC and academic,
// kept out of the CEFR ladder (survival, tower, placement).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('beauty set: own group, settings chip, badge colour, stats row, not on the CEFR ladder', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const info = await page.evaluate(() => ({
    n: W.filter((w) => w.g === 'STY').length, label: LV_LABEL.STY, extra: LEVELS_EXTRA,
    cefr: W.filter((w) => w.g === 'STY').every((w) => ['A1', 'A2', 'B1', 'B2', 'C1'].includes(w.l)),
    ladder: LEVELS_CEFR.includes('STY'), tower: twPool(55).some((w) => w.g === 'STY'),
  }));
  expect(info.n).toBeGreaterThanOrEqual(200);
  delete info.n;
  expect(info).toEqual({ label: 'ความงาม/แฟชั่น', extra: ['TOE', 'AWL', 'BIZ', 'IT', 'MED', 'POL', 'COOK', 'FEEL', 'ENV', 'SOC', 'FIT', 'FAM', 'PET', 'STY'], cefr: true, ladder: false, tower: false });

  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('details[data-g="lv"]').open = true; });
  const chip = page.locator('#lvlsX .chip[data-v="STY"]');
  await expect(chip).toContainText(/ความงาม\/แฟชั่น · \d+ คำ/);
  await chip.click();
  await page.locator('#lvls .chip[data-v="A1"]').click();
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['STY']);

  await page.evaluate(() => go('cards'));
  await expect(page.locator('.fc.lvc-STY').first()).toBeVisible();
  await page.evaluate(() => go('stats'));
  await expect(page.locator('.lvl-row.lv-STY')).toHaveCount(1);
  await page.evaluate(() => go('list'));
  await expect(page.locator('.chip.lv-STY')).toHaveCount(1);
  expect(errors).toEqual([]);
});
