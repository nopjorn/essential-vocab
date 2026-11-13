// Crime / scams / police set: theft, scams and fraud, reporting to the police, courts and staying safe (1.249.0+): words in their own group 'CRM', picked in settings next to TOEIC and academic,
// kept out of the CEFR ladder (survival, tower, placement).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('crime set: own group, settings chip, badge colour, stats row, not on the CEFR ladder', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const info = await page.evaluate(() => ({
    n: W.filter((w) => w.g === 'CRM').length, label: LV_LABEL.CRM, extra: LEVELS_EXTRA,
    cefr: W.filter((w) => w.g === 'CRM').every((w) => ['A1', 'A2', 'B1', 'B2', 'C1'].includes(w.l)),
    ladder: LEVELS_CEFR.includes('CRM'), tower: twPool(55).some((w) => w.g === 'CRM'),
  }));
  expect(info.n).toBeGreaterThanOrEqual(200);
  delete info.n;
  expect(info).toEqual({ label: 'ภัยใกล้ตัว/ตำรวจ', extra: ['TOE', 'AWL', 'BIZ', 'IT', 'MED', 'POL', 'COOK', 'FEEL', 'ENV', 'SOC', 'FIT', 'FAM', 'PET', 'STY', 'SPC', 'ENT', 'CRM'], cefr: true, ladder: false, tower: false });

  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('details[data-g="lv"]').open = true; });
  const chip = page.locator('#lvlsX .chip[data-v="STY"]');
  await expect(chip).toContainText(/ภัยใกล้ตัว\/ตำรวจ · \d+ คำ/);
  await chip.click();
  await page.locator('#lvls .chip[data-v="A1"]').click();
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['CRM']);

  await page.evaluate(() => go('cards'));
  await expect(page.locator('.fc.lvc-CRM').first()).toBeVisible();
  await page.evaluate(() => go('stats'));
  await expect(page.locator('.lvl-row.lv-CRM')).toHaveCount(1);
  await page.evaluate(() => go('list'));
  await expect(page.locator('.chip.lv-CRM')).toHaveCount(1);
  expect(errors).toEqual([]);
});
