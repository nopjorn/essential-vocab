// Extra word groups load only when used (1.251, js/groups.js + gxNote/gxOpen in app.js): the first start loads every file and
// writes the list of groups in use to localStorage `o3k.gx`; later starts load just those; picking another group restarts with it.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const extraLoaded = (page) => page.evaluate(() => [...new Set(W.map((w) => w.g))].filter((g) => GROUPS_X.some((x) => x.g === g)));

test('extra word files load on demand and stay loaded once used', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1', 'PET'] }, prog: { cat: { b: 1, d: 1, e: 2.5, i: 1 } } });
  expect((await extraLoaded(page)).length).toBe(17); // no list yet: everything
  await page.evaluate(() => { save(); flushSave(); });
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('o3k.gx')))).toEqual(['PET']);

  await page.reload(); await page.waitForFunction(() => typeof go === 'function' && document.querySelector('#view').children.length);
  expect(await extraLoaded(page)).toEqual(['PET']);
  expect(await page.evaluate(() => LEVELS_EXTRA)).toEqual(['PET']);

  // settings still shows every group with its size; picking one that is not loaded restarts with it
  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('details[data-g="lv"]').open = true; });
  expect(await page.locator('#lvlsX .chip').count()).toBe(17);
  await expect(page.locator('#lvlsX .chip[data-v="SPC"]')).toContainText('210 คำ');
  await Promise.all([page.waitForEvent('load'), page.locator('#lvlsX .chip[data-v="SPC"]').click()]);
  await page.waitForFunction(() => typeof W !== 'undefined');
  expect(await extraLoaded(page)).toEqual(['PET', 'SPC']);
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['A1', 'PET', 'SPC']);

  // a learned word from a file that is not loaded (cloud sync, backup): the next start loads everything again
  await page.evaluate(() => { S.prog.mascara = { b: 1, d: 1, e: 2.5, i: 1 }; gxNote.map = null; save(); flushSave(); });
  expect(await page.evaluate(() => localStorage.getItem('o3k.gx'))).toBe(null);
  await page.reload(); await page.waitForFunction(() => typeof W !== 'undefined');
  expect((await extraLoaded(page)).length).toBe(17);
  await page.evaluate(() => { save(); flushSave(); });
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('o3k.gx')))).toEqual(['PET', 'STY', 'SPC']);
  expect(errors).toEqual([]);
});

test('settings lists the extra groups by category, one button turns a whole category on and off (1.252)', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  await page.evaluate(() => go('settings'));
  await page.evaluate(() => { document.querySelector('details[data-g="lv"]').open = true; });
  expect(await page.locator('#lvlsX .lvx-cat').count()).toBe(4);
  expect(await page.locator('#lvlsX .lvx-cat .chip').count()).toBe(17);
  const fun = page.locator('.lvx-all[data-cat="fun"]');
  await expect(fun).toHaveText('เลือกทั้งหมวด');
  await fun.click();
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['A1', 'FIT', 'SPC', 'ENT']);
  await expect(fun).toHaveText('เอาออกทั้งหมวด');
  await expect(page.locator('#lvlsX .chip[data-v="SPC"]')).toHaveClass(/\bon\b/);
  await fun.click();
  expect(await page.evaluate(() => S.settings.levels)).toEqual(['A1']);
  expect(errors).toEqual([]);
});
