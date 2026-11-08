// Ready-made word sets (1.198.0): tiles on the ชุดของฉัน page, preview sheet, add → a set with list words + words of my own.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('add a ready-made set from the ชุดของฉัน page', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => go('decks'));
  await expect(page.locator('.pre-tile')).toHaveCount(17);
  await page.locator('[data-pre="dev"]').click();
  const sheet = page.locator('.sheet-wrap.open');
  await expect(sheet).toContainText('ไอที');
  await expect(sheet.locator('#preWords .wrow')).toHaveCount(await page.evaluate(() => presetN(PRESETS.find((p) => p.id === 'dev'))));
  await sheet.locator('#preWords .wrow', { hasText: 'repository' }).click();
  await expect.poll(() => page.evaluate(() => window.__said.includes('repository'))).toBe(true);
  await sheet.locator('#preAdd').click();
  await expect(page.locator('#dkStudy')).toBeVisible();
  await expect(page.locator('#dkList')).toContainText('repository');
  await expect(page.locator('#dkList')).toContainText('algorithm');
  const st = await readState(page);
  expect(st.decks).toHaveLength(1);
  expect(st.decks[0].pre).toBe('dev');
  expect(st.decks[0].words).toContain('algorithm');
  expect(st.decks[0].own.map((o) => o.w)).toContain('repository');
  // back on the list: the tile shows it was added, the sheet opens the copy instead of adding another
  await page.evaluate(() => go('decks'));
  await expect(page.locator('[data-pre="dev"]')).toContainText('เพิ่มแล้ว');
  await page.locator('[data-pre="dev"]').click();
  await page.locator('.sheet-wrap.open #preOpen').click();
  await expect(page.locator('#dkStudy')).toBeVisible();
  expect((await readState(page)).decks).toHaveLength(1);
  // studying works with the words of my own
  await page.locator('#dkStudy').click();
  await expect(page.locator('#stage')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the pre field survives cleaning and a broken one is dropped', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => cleanDecks([{ id: 'a1', name: 'x', icon: '📚', words: ['airport'], at: 1, pre: 'dev' }, { id: 'b2', name: 'y', icon: '📚', words: ['airport'], at: 1, pre: '<b>' }]).map((d) => d.pre));
  expect(r).toEqual(['dev', undefined]);
  expect(errors).toEqual([]);
});
