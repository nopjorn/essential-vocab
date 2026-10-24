// Seasonal events (1.72): windows, home card, page, quiz pass → sticker + mascot item + medal.
const { test, expect } = require('@playwright/test');
const { openApp } = require('./helpers');

test('event windows, year rule and data shape', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  const r = await page.evaluate(() => ({
    h: eventOn('2026-10-25').id, none: eventOn('2026-09-01'), s: eventOn('2027-04-13').id, l: eventOn('2026-11-20').id,
    ny1: eventOn('2026-12-31').id, ny2: eventOn('2027-01-02').id, y1: eventYear(EVENTS[3], '2026-12-31'), y2: eventYear(EVENTS[3], '2027-01-02'),
    shape: EVENTS.every((e) => e.words.length === 10 && e.story.length >= 5 && e.words.every((w) => w.length === 5 && w.every((x) => x)) && ITEMS.some((i) => i.id === e.item)),
    ids: new Set(EVENTS.map((e) => e.id)).size,
  }));
  expect(r).toEqual({ h: 'halloween', none: null, s: 'songkran', l: 'loy', ny1: 'newyear', ny2: 'newyear', y1: 2026, y2: 2026, shape: true, ids: 4 });
  expect(errors).toEqual([]);
});

test('event: home card, story + words page, quiz pass gives sticker, item, medal; fail does not', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] }, placedAt: '2026-01-01' });
  await page.evaluate(() => { window.eventOn = () => EVENTS[0]; go('home'); });
  await expect(page.locator('.event-card')).toContainText('กิจกรรมฮาโลวีน');
  await page.locator('.event-card').click();
  await expect(page.locator('.evt-w')).toHaveCount(10);
  await page.locator('#eQuiz').click();
  // fail: answer wrong on purpose
  const answer = async (good) => {
    const idx = await page.evaluate((good) => {
      const w = document.querySelector('.q-prompt .word').textContent, e = EVENTS[0], row = e.words.find((x) => x[0] === w);
      const opts = [...document.querySelectorAll('.opt')], k = opts.findIndex((o) => (o.textContent === row[2]) === good);
      return k;
    }, good);
    await page.locator('.opt').nth(idx).click();
    await page.waitForTimeout(1400);
  };
  for (let i = 0; i < 5; i++) await answer(false);
  await expect(page.locator('.result-emoji')).toHaveText('💪');
  expect(await page.evaluate(() => Object.keys(S.evt).length + S.owned.length)).toBe(1); // one record (0 right), no item
  // pass
  await page.locator('#eAgain').click();
  for (let i = 0; i < 5; i++) await answer(true);
  await expect(page.locator('.result-emoji')).toHaveText('🏆');
  const s = await page.evaluate(() => ({ owned: S.owned, key: Object.keys(S.evt)[0], pass: Object.values(S.evt)[0].pass, medal: !!S.ach.evt1 }));
  expect(s.owned).toContain('evt:pumpkin'); expect(s.pass).toBe(true); expect(s.key).toMatch(/^halloween-\d{4}$/); expect(s.medal).toBe(true);
  // the pumpkin hat is wearable
  await page.evaluate(() => go('mascot'));
  await page.locator('[data-eq="head:pumpkin"]').click();
  expect(await page.evaluate(() => S.mascot.equip.head)).toBe('pumpkin');
  expect(await page.evaluate(() => ['pumpkin', 'lotus', 'party'].every((h) => mascotSvg({ equip: { head: h } }).length > 500) && mascotSvg({ equip: { body: 'garland' } }).includes('circle'))).toBe(true);
  expect(errors).toEqual([]);
});
