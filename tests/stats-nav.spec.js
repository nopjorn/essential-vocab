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

// 1.246: the stats page centres on the 3000 / 5000 lists; the extra word groups fold into one card / one row.
test('stats focus on 3000/5000: ETA cards, what-if columns, 5000 snapshot, extra groups folded', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', snap: { '2026-01-01': [1, 0, 1, 0] } });
  const r = await page.evaluate(async () => {
    const now = Date.now();
    const core = W.filter((w) => LEVELS_3000.includes(w.g) || LEVELS_5000.includes(w.g)).slice(0, 5);
    const extra = W.filter((w) => LEVELS_EXTRA.includes(w.g)).slice(0, 3);
    [...core, ...extra].forEach((w) => { S.prog[w.w] = { b: 5, i: 30, e: 2.5, d: now + 9e8, s: 4, c: 3, x: 0, t: now }; });
    go('stats'); await new Promise((r) => setTimeout(r, 600));
    const sn = S.snap[today()];
    return { sn, five: in5000().size, n3: in3000().size, etas: [...view.querySelectorAll('.card-box b')].map((b) => b.textContent),
      th: [...view.querySelectorAll('.whatif th')].map((t) => t.textContent), ext: !!view.querySelector('.ext-box'),
      lvx: view.querySelector('details.lv-extra summary')?.textContent || '', openExtra: view.querySelectorAll('.card-box > .lvl-row').length,
      merged: (mergeBackup({ snap: { '2020-01-01': [1, 1, 2, 2, 9, 3] } }), S.snap['2020-01-01']) };
  });
  expect(r.sn).toEqual([expect.any(Number), expect.any(Number), 8, 8, 5, 5]);
  expect(r.five).toBeGreaterThan(r.n3);
  expect(r.etas).toEqual(expect.arrayContaining(['ชุด 3000 คำ', 'ชุด 5000 คำ', '📚 ชุดเสริม']));
  expect(r.etas).not.toContain('ครบทุกคำในแอป');
  expect(r.th).toEqual(['คำใหม่/วัน', 'ครบ 3000', 'ครบ 5000', 'ทบทวน/วัน']);
  expect(r.ext).toBe(true);
  expect(r.lvx).toContain('ชุดเสริม');
  expect(r.lvx).toContain('จำได้ 3');
  expect(r.merged).toEqual([1, 1, 2, 2, 9, 3]);
  expect(errors).toEqual([]);
});
