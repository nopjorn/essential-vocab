// 📦 Storage room (1.210.0): the settings box shows how full localStorage is; near the limit old statistics are
// thinned out (never card progress) and a failed write retries after the trim; past 70 % one toast a week.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('settings show the storage box with a percentage and a bar', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { go('settings'); document.querySelector('details[data-g="backup"]').open = true; });
  await expect(page.locator('#storeUse')).toContainText('%');
  await expect(page.locator('#storeBox')).toHaveClass(/\bok\b/);
  await expect(page.locator('#storeBox .store-bar')).toHaveAttribute('aria-valuenow', /^\d+$/);
  expect(errors).toEqual([]);
});

test('near the limit: old statistics are trimmed, progress stays; a full disk retries after the trim', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    const D = 864e5, now = Date.now();
    S.prog[W[0].w] = { b: 3, i: 10, e: 2.5, d: now + D, s: 5, c: 4, x: 1 };
    S.act = {};
    for (let d = 0; d < 200; d++) S.act[ymd(new Date(now - d * D))] = { card: [5, 60, 5, 4], x: { h: Array(24).fill(1) } };
    S.rev = Array.from({ length: REV_MAX }, (_, i) => [i, 1, 2, 2]);
    S.missY = { '2000': { dev: { a: 1 } }, [String(new Date().getFullYear())]: { dev: { b: 2 } } };
    // a localStorage that refuses anything above the size we have after a trim
    const real = Storage.prototype.setItem; let refused = 0;
    const big = JSON.stringify(S).length;
    Storage.prototype.setItem = function (k, v) { if (k === KEY && v.length >= big) { refused++; throw new DOMException('full', 'QuotaExceededError'); } return real.call(this, k, v); };
    save(); flushSave();
    Storage.prototype.setItem = real;
    const acts = Object.entries(S.act);
    return { refused, saved: saveFailed === false, rev: S.rev.length, missY: Object.keys(S.missY),
      oldX: acts.filter(([k, v]) => k < ymd(new Date(now - STORE_KEEP_ACT * D)) && v.x).length,
      newX: acts.filter(([k, v]) => k >= ymd(new Date(now - 30 * D)) && v.x).length, days: acts.length, trimAt: !!storeTrim.at };
  });
  expect(r.refused).toBe(1);
  expect(r.saved).toBe(true);
  expect(r.trimAt).toBe(true);
  expect(r.rev).toBe(1000);
  expect(r.missY).toEqual([String(new Date().getFullYear())]);
  expect(r.oldX).toBe(0);
  expect(r.newX).toBeGreaterThan(20);
  expect(r.days).toBe(200); // the day rows themselves stay (charts, habits)
  await expect(page.locator('#toast')).toContainText('ย่อสถิติเก่า');
  const st = await readState(page);
  expect(st.prog[await page.evaluate(() => W[0].w)].b).toBe(3);
  expect(st.rev.length).toBe(1000);
  expect(errors).toEqual([]);
});

test('past 70 %: one warning toast, not again within a week; the box turns amber', async ({ page }) => {
  const errors = await openApp(page);
  const n = await page.evaluate(() => {
    localStorage.setItem('o3k.pad', 'x'.repeat(Math.round(STORE_LIMIT * 0.75)));
    storeCheck(STORE_LIMIT); const first = localStorage.getItem('o3k.storeWarn');
    const t1 = document.getElementById('toast').textContent;
    document.getElementById('toast').textContent = '';
    storeCheck(STORE_LIMIT);
    return { first: !!first, t1, t2: document.getElementById('toast').textContent };
  });
  expect(n.first).toBe(true);
  expect(n.t1).toContain('สำรองข้อมูล');
  expect(n.t2).toBe('');
  await page.evaluate(() => { go('settings'); document.querySelector('details[data-g="backup"]').open = true; });
  await expect(page.locator('#storeBox')).toHaveClass(/\bwarn\b/);
  await page.evaluate(() => localStorage.removeItem('o3k.pad'));
  expect(errors).toEqual([]);
});
