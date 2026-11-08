// Health set (1.215.0+): health / doctor words in their own group 'MED', picked in settings next to TOEIC and academic,
// kept out of the CEFR ladder (survival, tower, placement).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('health set: own group, settings chip, badge colour, stats row, not on the CEFR ladder', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const info = await page.evaluate(() => ({
    n: W.filter((w) => w.g === 'MED').length, label: LV_LABEL.MED, extra: LEVELS_EXTRA,
    cefr: W.filter((w) => w.g === 'MED').every((w) => ['A1', 'A2', 'B1', 'B2', 'C1'].includes(w.l)),
    ladder: LEVELS_CEFR.includes('MED'), tower: twPool(55).some((w) => w.g === 'MED'),
  }));
  expect(info.n).toBeGreaterThanOrEqual(150);
  delete info.n;
  expect(info).toEqual({ label: 'สุขภาพ', extra: ['TOE', 'AWL', 'BIZ', 'IT', 'MED'], cefr: true, ladder: false, tower: false });

  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('details[data-g="lv"]').open = true; });
  const chip = page.locator('#lvlsX .chip[data-v="MED"]');
  await expect(chip).toContainText(/สุขภาพ · \d+ คำ/);
  await chip.click();
  await page.locator('#lvls .chip[data-v="A1"]').click();
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['MED']);

  await page.evaluate(() => go('cards'));
  await expect(page.locator('.fc.lvc-MED').first()).toBeVisible();
  await page.evaluate(() => go('stats'));
  await expect(page.locator('.lvl-row.lv-MED')).toHaveCount(1);
  await page.evaluate(() => go('list'));
  await expect(page.locator('.chip.lv-MED')).toHaveCount(1);
  expect(errors).toEqual([]);
});
