// Stats charts (1.110): drawn at the real width of their box (text keeps its size), numbers in the legend, range buttons.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const snap = {};
for (let i = 59; i >= 0; i--) {
  const d = new Date(Date.now() - i * 864e5).toLocaleDateString('en-CA');
  const l = 600 + (59 - i) * 10;
  snap[d] = [Math.round(l / 2), Math.round(l / 4), l, Math.round(l * 0.7)];
}

for (const [w, h] of [[440, 956], [1210, 834], [1376, 1032]]) {
  test(`charts keep their real size at ${w}×${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    const errors = await openApp(page, { placedAt: '2026-01-01', snap });
    await page.evaluate(() => go('stats'));
    await page.waitForSelector('[data-chart="trend"] svg', { timeout: 5000 });
    await page.waitForTimeout(400);
    for (const kind of ['act', 'trend']) {
      const r = await page.evaluate((k) => {
        const host = document.querySelector(`[data-chart="${k}"]`); host.scrollIntoView();
        const svg = host.querySelector('svg'), vb = svg.viewBox.baseVal;
        return { scale: svg.getBoundingClientRect().width / vb.width, fits: svg.getBoundingClientRect().right <= host.getBoundingClientRect().right + 1 };
      }, kind);
      expect(r.scale, `${kind} text scale`).toBeGreaterThan(0.97);
      expect(r.scale, `${kind} text scale`).toBeLessThan(1.03);
      expect(r.fits).toBe(true);
    }
    const leg = await page.locator('.trend-leg').innerText();
    expect(leg).toContain('เรียนแล้ว');
    const now = await page.evaluate(() => S.snap[today()]);
    expect(leg.replace(/\s+/g, ' ')).toContain(`เรียนแล้ว ${now[2].toLocaleString()}`);
    expect(errors).toEqual([]);
  });
}

test('trend range buttons redraw the chart', async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1210 });
  const errors = await openApp(page, { placedAt: '2026-01-01', snap });
  await page.evaluate(() => go('stats'));
  await page.waitForSelector('[data-chart="trend"] svg', { timeout: 5000 });
  const pts = () => page.evaluate(() => document.querySelector('[data-chart="trend"] .ln-l').getAttribute('points').split(' ').length);
  const all = await pts();
  expect(await page.locator('[data-range]').allInnerTexts()).toEqual(['7 วัน', '14 วัน', '30 วัน', 'ทั้งหมด']);
  await page.click('[data-range="7"]');
  const m7 = await pts();
  expect(m7).toBeLessThanOrEqual(7);
  await page.click('[data-range="30"]');
  const m30 = await pts();
  expect(m30).toBeLessThan(all);
  expect(m30).toBeLessThanOrEqual(30);
  expect(m30).toBeGreaterThan(m7);
  await expect(page.locator('[data-range="30"]')).toHaveAttribute('aria-pressed', 'true');
  await page.click('[data-range="all"]');
  expect(await pts()).toBe(all);
  expect(errors).toEqual([]);
});
