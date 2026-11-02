// 📴 Offline (1.148): the top-bar badge, the settings status box, and — with the real service worker — every app file
// kept on the device, a missing one fetched on request, and the app opening with no network at all.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('offline badge and toast follow the connection; settings explain when the check cannot run', async ({ page, context }) => {
  const errors = await openApp(page);
  await expect(page.locator('#offBadge')).toBeHidden();
  await context.setOffline(true);
  await expect(page.locator('#offBadge')).toBeVisible();
  await expect(page.locator('#toast')).toContainText('ออฟไลน์');
  expect(await page.evaluate(() => document.documentElement.classList.contains('is-offline'))).toBe(true);
  await context.setOffline(false);
  await expect(page.locator('#offBadge')).toBeHidden();
  await expect(page.locator('#toast')).toContainText('กลับมาออนไลน์');
  // no service worker in this test run: the box says so instead of claiming anything
  await page.evaluate(() => { go('settings'); document.querySelector('details[data-g="backup"]').open = true; });
  await expect(page.locator('#offState')).toContainText('ยังตรวจไม่ได้');
  await expect(page.locator('#offGet')).toBeHidden();
  expect(errors).toEqual([]);
});

test.describe('with the service worker', () => {
  test.use({ serviceWorkers: 'allow' });
  test('every file is kept, a missing one comes back on request, the app opens offline', async ({ page, context }) => {
    test.setTimeout(120000);
    await page.addInitScript(() => { localStorage.setItem('o3k.onb', '1'); });
    await page.goto('http://localhost:8765/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // now controlled by the worker
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15000 }).toBe(true);
    let r = await page.evaluate(() => offlineStatus());
    expect(r.miss).toEqual([]);
    expect(r.total).toBeGreaterThan(60);
    expect(r.version).toBe(await page.evaluate(() => 'o3k-' + APP_VERSION));
    // drop one data file and one shell file from the caches: the check names them, the download brings them back
    await page.evaluate(async () => { await (await caches.open('o3k-data')).delete(new URL('data/cases.js', location.href).href); await (await caches.open('o3k-' + APP_VERSION)).delete(new URL('js/tower.js', location.href).href); });
    r = await page.evaluate(() => offlineStatus());
    expect(r.miss.sort()).toEqual(['data/cases.js', 'js/tower.js']);
    r = await page.evaluate(() => offlineStatus(true));
    expect(r.miss).toEqual([]);
    // no network at all: the app still opens from the device
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#offBadge')).toBeVisible();
    await expect(page.locator('#view')).not.toBeEmpty();
    await context.setOffline(false);
  });
});
