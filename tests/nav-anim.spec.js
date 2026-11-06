// 1.155.1: the page animation is set up before the new page is drawn (animPrep), so go() no longer lays out the whole new page
// mid-script. The animation must still run on every page change, including going to the same kind of page again.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('page changes still animate (and restart) without the late forced layout', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  const run = (js) => page.evaluate((code) => {
    // count forced layout reads of #view after drawing: offsetWidth is the one the old animView() used
    let reads = 0; const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    Object.defineProperty(view, 'offsetWidth', { configurable: true, get() { if (view.childElementCount && !animPrepped) reads++; return d.get.call(this); } });
    // eslint-disable-next-line no-eval
    (0, eval)(code);
    delete view.offsetWidth;
    const a = view.getAnimations();
    return { cls: [...view.classList].filter((c) => /^vin/.test(c)), anims: a.length, t: a.length ? a[0].currentTime : null, reads, top: view.scrollTop };
  }, js);
  await page.evaluate(() => { view.scrollTop = 300; });
  let r = await run("go('stats')"); // a tab to the right of home
  expect(r.cls).toEqual(['vin-l']);
  expect(r.anims).toBeGreaterThan(0);
  expect(r.reads).toBe(0);
  expect(r.top).toBe(0);
  await page.waitForTimeout(500); // let it finish
  r = await run("go('stats')"); // the same page again: the fade restarts from the start
  expect(r.cls).toEqual(['vin']);
  expect(r.anims).toBeGreaterThan(0);
  expect(r.t).toBeLessThan(100);
  r = await run("go('home')");
  expect(r.cls).toEqual(['vin-r']);
  expect(r.reads).toBe(0);
  expect(errors).toEqual([]);
});
