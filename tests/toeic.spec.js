// TOEIC set (1.179.0+): extra TSL words in their own group 'TOE', picked in settings, shown in stats and the word list,
// kept out of the CEFR ladder (survival, tower, placement).
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('TOEIC: group of TSL words, settings chip turns it on, new cards come from it', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const info = await page.evaluate(() => ({
    n: W.filter((w) => w.g === 'TOE').length, label: LV_LABEL.TOE,
    cefr: W.filter((w) => w.g === 'TOE').every((w) => ['A1', 'A2', 'B1', 'B2', 'C1'].includes(w.l)),
    ladder: LEVELS_CEFR.includes('TOE'), tower: twPool(55).some((w) => w.g === 'TOE'),
  }));
  expect(info.n).toBeGreaterThanOrEqual(200);
  delete info.n;
  expect(info).toEqual({ label: 'TOEIC', cefr: true, ladder: false, tower: false });

  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('details[data-g="lv"]').open = true; });
  const chip = page.locator('#lvlsX .chip[data-v="TOE"]');
  await expect(chip).toContainText(/TOEIC · \d+ คำ/);
  await chip.click();
  await expect(chip).toHaveClass(/\bon\b/);
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['A1', 'TOE']);
  await page.locator('#lvls .chip[data-v="A1"]').click();
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['TOE']);
  expect(await page.evaluate(() => pool().every((w) => w.g === 'TOE') && pool().length === W.filter((w) => w.g === 'TOE').length)).toBe(true);
  await expect(page.locator('.center.small.muted', { hasText: 'CC BY-SA 4.0' })).toBeVisible();

  // a flashcard round shows a TOEIC word with its badge colour
  await page.evaluate(() => go('cards'));
  await expect(page.locator('.fc.lvc-TOE').first()).toBeVisible();

  // stats: its own progress row; word list: its own filter chip
  await page.evaluate(() => go('stats'));
  await expect(page.locator('.lvl-row.lv-TOE')).toHaveCount(1);
  await page.evaluate(() => go('list'));
  await expect(page.locator('.chip.lv-TOE')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('TOEIC: placement skips the set', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['TOE'] } });
  expect(await page.evaluate(() => { renderPlacement(); return view.textContent.includes('TOEIC'); })).toBe(false);
  expect(errors).toEqual([]);
});
