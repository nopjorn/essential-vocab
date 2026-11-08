// Stats page jump bar + summary (1.165.0): a sticky chip row jumps to each part and lights the one in view.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const DAY = 864e5;
test('stats jump bar: every part has a chip, a tap scrolls its heading under the bar, scrolling lights the part in view; three numbers on top', async ({ page }) => {
  const prog = {}, hist = {}, snap = {};
  const now = Date.now();
  for (let d = 0; d < 40; d++) { const k = new Date(now - d * DAY).toISOString().slice(0, 10); hist[k] = 20; snap[k] = [300, 100, 300, 100]; }
  const errors = await openApp(page, { placedAt: '2026-01-01', hist, snap });
  await page.evaluate(() => { const now = Date.now(); W.slice(0, 300).forEach((w, i) => { S.prog[w.w] = { b: i % 6, i: 1 + (i % 30), e: 2.5, d: now + ((i % 20) - 5) * 864e5, s: 4, c: 3, x: i % 3, t: now }; }); S.lex['toeic5:a1'] = { b: 1, i: 1, e: 2.5, d: now, s: 2, c: 1, x: 1, t: now }; localStorage.setItem('o3k.mst', '9'); go('stats'); });
  const view = page.locator('#view');
  await expect(view.locator('.st-nav [data-sec]')).toHaveCount(11); // + 💼 TOEIC (1.193.0)
  expect(await view.locator('.st-nav [data-sec][hidden]').count()).toBe(0);
  // summary: remembered (today's snapshot), due today, finish estimate
  const sum = await view.locator('.st-sum > div').allTextContents();
  expect(sum.length).toBe(3);
  expect(sum[1]).toContain(String(await page.evaluate(() => dueList().length)));
  // tap: the calendar heading lands just under the sticky bar, its chip lights up
  await view.locator('.st-nav [data-sec="cal"]').click();
  await expect(view.locator('.st-nav [data-sec="cal"]')).toHaveClass(/on/);
  await expect.poll(() => page.evaluate(() => {
    const nav = document.querySelector('.st-nav').getBoundingClientRect(), h = [...view.querySelectorAll('.h2')].find((x) => x.textContent.includes('ปฏิทินการเล่น')).getBoundingClientRect();
    return Math.round(h.top - nav.bottom);
  })).toBeLessThan(40);
  expect(await page.evaluate(() => { const nav = document.querySelector('.st-nav').getBoundingClientRect(); return nav.top >= view.getBoundingClientRect().top - 10; })).toBe(true); // still stuck on top
  // scrolling by hand: back at the top the first part lights up
  await page.evaluate(() => { view.scrollTop = 0; });
  await expect(view.locator('.st-nav .on')).toHaveAttribute('data-sec', 'today');
  await page.evaluate(() => go('home')); await page.evaluate(() => { view.dispatchEvent(new Event('scroll')); }); // the listener left with the page
  expect(errors).toEqual([]);
});
