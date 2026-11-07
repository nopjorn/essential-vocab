// Home screen polish (1.179.5 → 1.18x): time on the today card, notices under it, play strip, folded quests, progress rings, streak nudge.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

const seed = () => {
  const prog = {};
  W.slice(0, 60).forEach((w, i) => { prog[w.w] = { b: i % 6, i: [0, 1, 3, 7, 16, 35][i % 6], e: 2.5, d: Date.now() - 86400000, s: 3, c: 2, x: 0 }; });
  return prog;
};

test('today card shows minutes, notices sit under it, play strip and folded quests', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate((f) => { S.prog = (0, eval)(f)(); S.placedAt = null; go('home'); }, `(${seed})`);
  await expect(page.locator('.hero .hero-min')).toContainText('นาที');
  // notices block comes right after the today card
  const ids = await page.locator('.hb').evaluateAll((els) => els.map((e) => e.dataset.hb));
  if (ids.includes('notices')) expect(ids[ids.indexOf('hero') + 1]).toBe('notices');
  // the small play blocks share one strip
  await expect(page.locator('[data-hb="strip"] .ds-tile')).toHaveCount(await page.evaluate(() => homeBlocks().filter((b) => b.on && STRIP_IDS.includes(b.id) && (b.id !== 'event' || eventOn())).length));
  await expect(page.locator('[data-hb="riddle"]')).toHaveCount(0);
  await page.locator('#qRiddle').click();
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'riddle');
  await page.evaluate(() => go('home'));
  // quests: folded, the next one is a button, ▾ opens every row and is remembered
  await expect(page.locator('.qrow').first()).toBeHidden();
  await expect(page.locator('.q-next')).toBeVisible();
  await page.locator('#qFold summary').click();
  await expect(page.locator('.qrow').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('o3k.qopen'))).toBe('1'); // the toggle event fires after the click
  await page.evaluate(() => go('home'));
  await expect(page.locator('.qrow').first()).toBeVisible();
  // progress card: two rings with a percent each
  await expect(page.locator('.prog-card .pr-item')).toHaveCount(2);
  await expect(page.locator('.prog-card .pr-pc').first()).toContainText('%');
  expect(errors).toEqual([]);
});

test('evening streak nudge: only after 18:00 with a streak and nothing done today', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    S.streak = { last: '2000-01-01', count: 5 }; S.freeze = 0;
    const y = new Date(Date.now() - 86400000), k = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    S.streak.last = k(y);
    const at = (h) => { const d = new Date(); d.setHours(h, 0, 0, 0); return streakRisk(d); };
    const out = [at(10), at(19)];
    S.streak.last = today(); out.push(at(19));
    return out;
  });
  expect(r).toEqual([0, 5, 0]);
  await page.evaluate(() => { S.streak.last = '2000-01-01'; window.streakRisk = () => 7; go('home'); });
  await expect(page.locator('#qRisk')).toContainText('7');
  await page.locator('#qRisk').click();
  await expect(page.locator('#view')).not.toHaveAttribute('data-route', 'home');
  expect(errors).toEqual([]);
});

test('main button says what comes next: reviews, new words, then the weekly boss or stubborn words', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => [nextStep(4, 10).text, nextStep(4, 0).text, nextStep(0, 10).text]);
  expect(r[0]).toContain('ทวน 4 ใบ + คำใหม่ 10'); expect(r[1]).toContain('ทวน 4 ใบ'); expect(r[2]).toContain('เรียนคำใหม่ 10');
  // a fresh learner has nothing to fight or drill yet
  expect(await page.evaluate(() => nextStep(0, 0).id)).toBe('hub');
  // learned words with misses → the boss (until beaten this week), then stubborn words
  await page.evaluate(() => { W.slice(0, 12).forEach((w) => { S.prog[w.w] = { b: 1, i: 1, e: 2.5, d: Date.now() + 9e8, s: 6, c: 1, x: 5 }; }); });
  expect(await page.evaluate(() => nextStep(0, 0).id)).toBe('wboss');
  await page.evaluate(() => { S.wboss = { ...wbThisWeek(), win: true }; });
  expect(await page.evaluate(() => nextStep(0, 0).id)).toBe('leech');
  await page.evaluate(() => { S.wboss = { ...wbThisWeek(), win: false }; window.nextStep = () => ({ id: 'wboss', text: 'x' }); go('home'); });
  await page.locator('#startBtn').click();
  await expect(page.locator('#view')).toHaveAttribute('data-route', 'wboss');
  expect(errors).toEqual([]);
});

test('edit home in place: move, hide, show again, done; long press opens it; leaving ends it', async ({ page }) => {
  const errors = await openApp(page);
  await page.locator('#heGo').click();
  await expect(page.locator('.he-bar')).toBeVisible();
  const order = () => page.locator('.hb').evaluateAll((els) => els.map((e) => e.dataset.hb));
  const before = await order();
  expect(before).not.toContain('strip'); // each block on its own while editing
  const second = before[1];
  await page.locator(`[data-hb="${second}"] [data-he="up"]`).click();
  expect((await order())[0]).toBe(second);
  expect(await page.evaluate(() => S.homeCfg.filter((b) => b.on)[0].id)).toBe((await order())[0]);
  await page.locator(`[data-hb="${second}"] [data-he="hide"]`).click();
  await expect(page.locator(`[data-hb="${second}"]`)).toHaveCount(0);
  await page.locator(`.he-hidden [data-id="${second}"]`).click();
  await expect(page.locator(`[data-hb="${second}"]`)).toHaveCount(1);
  await page.locator('#heDone').click();
  await expect(page.locator('.he-bar')).toHaveCount(0);
  await expect(page.locator('#heGo')).toBeVisible();
  // leaving the page ends the edit mode
  await page.locator('#heGo').click();
  await page.evaluate(() => { go('stats'); go('home'); });
  await expect(page.locator('.he-bar')).toHaveCount(0);
  // a long finger press on a block opens it
  await page.evaluate(() => {
    const el = document.querySelector('[data-hb="prog"]'), r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: r.left + 10, clientY: r.top + 10 }));
  });
  await expect(page.locator('.he-bar')).toBeVisible({ timeout: 2000 });
  expect(errors).toEqual([]);
});

test('iPad landscape: ไถศัพท์ + เล่นด่วน share one cell as two tiles side by side', async ({ page }) => {
  await page.setViewportSize({ width: 1376, height: 1032 });
  const errors = await openApp(page);
  const pair = page.locator('.home-grid.home-cols > .hb-pair');
  await expect(pair).toHaveCount(1);
  const a = await pair.locator('[data-hb="feed"]').boundingBox(), b = await pair.locator('[data-hb="play"]').boundingBox();
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  expect(b.x).toBeGreaterThan(a.x + a.width - 1);
  expect(errors).toEqual([]);
});
