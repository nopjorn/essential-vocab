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
  expect(await page.evaluate(() => localStorage.getItem('o3k.qopen'))).toBe('1');
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
