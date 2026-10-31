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
    thai: EVENTS.every((e) => new Set(e.words.map((w) => w[2])).size === 10), // quiz options must never repeat a meaning
  }));
  expect(r).toEqual({ h: 'halloween', none: null, s: 'songkran', l: 'loy', ny1: 'newyear', ny2: 'newyear', y1: 2026, y2: 2026, shape: true, ids: 8, thai: true });
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

test('1.113 events: Christmas, Chinese New Year (moving dates), Valentine, Mother\'s Day; their mascot items draw', async ({ page }) => {
  const errors = await openApp(page, { settings: { levels: ['A1'] } });
  const r = await page.evaluate(() => ({
    xmas: eventOn('2026-12-22').id, xmasEnd: eventOn('2026-12-25').id, ny: eventOn('2026-12-26').id, before: eventOn('2026-12-19'),
    cny26: eventOn('2026-02-15').id, cny27: eventOn('2027-02-04').id, cny27late: eventOn('2027-02-11').id, cny28: eventOn('2028-01-24').id, none26: eventOn('2026-02-24'), cnyNone: eventOn('2036-02-20'),
    val: eventOn('2026-02-13').id, val27: eventOn('2027-02-13').id, mom: eventOn('2027-08-10').id,
    yr: eventYear(EVENTS.find((e) => e.id === 'cny'), '2028-01-24'), key: eventKey(EVENTS.find((e) => e.id === 'mother'), '2026-08-12'),
    art: ['santa', 'hearts'].every((h) => mascotSvg({ equip: { head: h } }).length > mascotSvg({}).length + 100) && ['redpacket', 'jasmine'].every((b) => mascotSvg({ equip: { body: b } }).length > mascotSvg({}).length + 100),
    ach: ACH.some((a) => a.id === 'evt8'),
  }));
  expect(r).toEqual({ xmas: 'christmas', xmasEnd: 'christmas', ny: 'newyear', before: null, cny26: 'cny', cny27: 'cny', cny27late: 'cny', cny28: 'cny', none26: null, cnyNone: null,
    val: 'valentine', val27: 'valentine', mom: 'mother', yr: 2028, key: 'mother-2026', art: true, ach: true });
  // the page and the quiz work for a moving-date event
  await page.evaluate(() => { window.eventOn = () => EVENTS.find((e) => e.id === 'cny'); go('home'); });
  await expect(page.locator('.event-card')).toContainText('ตรุษจีน');
  await page.locator('.event-card').click();
  await expect(page.locator('.evt-w')).toHaveCount(10);
  await page.locator('#eQuiz').click();
  await expect(page.locator('.q-prompt .word')).toBeVisible();
  expect(errors).toEqual([]);
});
