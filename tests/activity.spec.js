// Activity by kind (1.158.0): every answer is logged under what was being used (S.act: day → kind → [answers, seconds]),
// survives reload / merges from a backup, and the stats page draws it as stacked bars + the "ใช้เวลากับอะไรบ้าง" box.
const { test, expect } = require('@playwright/test');
const { openApp, readState } = require('./helpers');

test('answers are logged by kind with a rough time, kept on reload, cleaned and merged from a backup', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01', settings: { levels: ['A1'] } });
  const act = await page.evaluate(() => {
    const w = (x) => W.find((y) => y.w === x);
    go('cards'); grade(w('apple'), 2);
    go('feed'); gameResult(w('house'), true);
    go('games'); actGame = 'phrasal'; markActive();
    actGame = 'en2th'; markActive();
    go('tower'); markActive();
    go('mtest'); markActive();
    flushSave();
    return S.act[today()];
  });
  expect(Object.keys(act).sort()).toEqual(['card', 'feed', 'fun', 'game', 'other', 'skill']);
  for (const v of Object.values(act)) { expect(v[0]).toBe(1); expect(v[1]).toBeGreaterThan(0); }
  expect((await readState(page)).act).toBeTruthy();
  const merged = await page.evaluate(() => {
    const t = today();
    mergeBackup({ act: { [t]: { card: [5, 100], read: [2, 30], bogus: [1, 1] }, '2020-01-01': { game: [3, 40] }, bad: { card: [1, 1] }, '2020-01-02': 'x' } });
    return S.act;
  });
  const t = await page.evaluate(() => today());
  expect(merged[t].card).toEqual([5, 100]);
  expect(merged[t].read).toEqual([2, 30]);
  expect(merged[t].bogus).toBeUndefined();
  expect(merged['2020-01-01'].game).toEqual([3, 40]);
  expect(merged.bad).toBeUndefined();
  const loaded = await page.evaluate(() => { flushSave(); const d = JSON.parse(localStorage.getItem('oxford3000.v1')); d.act = { '2026-01-01': { card: ['x', 1], feed: [2, 9] }, junk: 5 }; localStorage.setItem('oxford3000.v1', JSON.stringify(d)); return load().act; });
  expect(loaded).toEqual({ '2026-01-01': { feed: [2, 9] } });
  expect(errors).toEqual([]);
});

test('stats page: stacked bars by kind, minutes switch and the breakdown box', async ({ page }) => {
  const key = (k) => { const d = new Date(); d.setDate(d.getDate() - k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const errors = await openApp(page, {
    placedAt: '2026-01-01', chistFrom: key(20),
    hist: { [key(0)]: 30, [key(1)]: 12, [key(25)]: 9 }, chist: { [key(1)]: 4 },
    act: { [key(0)]: { card: [10, 300], feed: [8, 200], skill: [6, 240], fun: [6, 600] } },
  });
  await page.evaluate(() => go('stats'));
  const host = page.locator('[data-chart="act"]');
  for (const id of ['card', 'feed', 'skill', 'fun', 'unk']) await expect(host.locator(`rect.a-${id}`).first()).toBeAttached();
  await expect(host.locator('.legend')).toContainText('โซนสนุก');
  await expect(host.locator('.legend')).toContainText('ยังไม่แยกประเภท');
  const tip = await host.locator('rect.hit').last().getAttribute('data-tip');
  expect(tip).toContain('30 ข้อ');
  expect(tip).toContain('สนุก 6');
  await host.locator('[data-am="sec"]').click();
  await expect(host.locator('[data-am="sec"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(host.locator('rect.a-unk')).toHaveCount(0);
  expect(await host.locator('rect.hit').last().getAttribute('data-tip')).toContain('≈ 22 นาที');
  const box = page.locator('#actBox');
  await expect(box).toContainText('30 ข้อ');
  await expect(box.locator('.act-row')).toHaveCount(4);
  await expect(box.locator('.act-row').first()).toContainText('โซนสนุก'); // most time first
  await box.locator('[data-as="28"]').click();
  await expect(box.locator('[data-as="28"]')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('stats page with no logged kinds yet shows the empty note', async ({ page }) => {
  const errors = await openApp(page, { placedAt: '2026-01-01' });
  await page.evaluate(() => { S.act = {}; go('stats'); });
  await expect(page.locator('#actBox')).toContainText('เริ่มเก็บรายละเอียด');
  expect(errors).toEqual([]);
});
