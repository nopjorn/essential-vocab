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

  // 1.152.1: an app start reads sw.js from the network first. Same version → the app files come from the device (no request each);
  // no answer → network first as before, then the device. sw.js reports how the last start went (settings → offline box).
  test('app files come from the device while no new version is out', async ({ page, context }) => {
    test.setTimeout(120000);
    await page.addInitScript(() => { localStorage.setItem('o3k.onb', '1'); });
    await page.goto('http://localhost:8765/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15000 }).toBe(true);
    // (the first start under the worker; a quick reload after it would take the files from Chromium's memory cache instead)
    let st = (await page.evaluate(() => offlineStatus())).start;
    expect(st.same).toBe(true);
    expect(st.net).toBe(0);
    expect(st.cache).toBeGreaterThan(40); // style.css, app.js, config.js and every js/ file
    expect(await page.evaluate((x) => startText(x), st)).toContain('มาจากในเครื่อง'); // the line in settings → offline box (real config here = login screen)
    // the text for the other cases (each case itself runs for real in the next test)
    expect(await page.evaluate(() => startText({ same: false, cache: 0, net: 45 }))).toContain('เวอร์ชันใหม่');
    expect(await page.evaluate(() => startText({ same: null, cache: 0, net: 45 }))).toContain('45 ไฟล์จากเน็ต');
    expect(await page.evaluate(() => startText({ same: null, cache: 0, net: 0 }))).toBe('');
  });

  // 1.154.1 (Playwright 1.63 sees the worker's own requests): the three other ways an app start can go, for real.
  test('a new release, no network and a slow network each load the right way', async ({ context }) => {
    test.setTimeout(120000);
    await context.addInitScript(() => { localStorage.setItem('o3k.onb', '1'); });
    const fresh = async () => { const p = await context.newPage(); await p.goto('http://localhost:8765/'); await expect(p.locator('#view')).not.toBeEmpty(); return p; };
    let p = await fresh();
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.close();
    p = await fresh();
    await expect.poll(() => p.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15000 }).toBe(true);
    await p.close();
    // what the worker asks the network for, and a switch that makes its version check see a release / answer late
    const net = [];
    let mode = 'same';
    await context.route('**/*', async (route) => {
      const r = route.request();
      if (!r.serviceWorker()) return route.continue();
      const path = new URL(r.url()).pathname.replace(/^\//, '');
      net.push(path);
      const probe = path === 'sw.js' && !r.headers()['service-worker']; // the browser's own update check carries "Service-Worker: script"
      if (probe && mode === 'release') {
        const res = await route.fetch();
        return route.fulfill({ response: res, body: (await res.text()).replace(/const VERSION = '[^']+'/, "const VERSION = 'o3k-9.9.9'") });
      }
      if (probe && mode === 'slow') await new Promise((ok) => setTimeout(ok, 8000)); // far longer than NAV_TIMEOUT (2.5 s)
      return route.continue();
    });
    // same version: only the check goes out
    p = await fresh();
    let st = (await p.evaluate(() => offlineStatus())).start;
    expect(st).toMatchObject({ same: true, net: 0 });
    expect(net.filter((u) => /^(app\.js|style\.css|js\/|index\.html|$)/.test(u))).toEqual([]);
    await p.close();
    // a release is out: the page and its files come from the network
    net.length = 0; mode = 'release';
    p = await fresh();
    st = (await p.evaluate(() => offlineStatus())).start;
    expect(st.same).toBe(false);
    expect(st.net).toBeGreaterThan(40);
    expect(net).toEqual(expect.arrayContaining(['', 'app.js', 'js/boot.js', 'style.css']));
    expect(await p.evaluate((x) => startText(x), st)).toContain('เวอร์ชันใหม่');
    await p.close();
    // slow network: after NAV_TIMEOUT the app opens from the device without waiting for the check
    net.length = 0; mode = 'slow';
    const t0 = Date.now();
    p = await fresh();
    expect(Date.now() - t0).toBeLessThan(6500); // opened without waiting the 8 s for the check (2.5 s + load time, tests run 4 at once)
    st = (await p.evaluate(() => offlineStatus())).start;
    expect(st).toMatchObject({ same: null, net: 0 }); // no answer yet, every file from the device
    await p.close();
    // no network: the check fails at once, the files are tried and then come from the device
    mode = 'same';
    await context.setOffline(true);
    p = await fresh();
    st = (await p.evaluate(() => offlineStatus())).start;
    expect(st.same).not.toBe(true);
    expect(st.cache + st.net).toBeGreaterThan(40);
    await expect(p.locator('#offBadge')).toBeVisible();
    await context.setOffline(false);
  });
});
